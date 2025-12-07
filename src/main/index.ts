import {
  app,
  shell,
  screen,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  globalShortcut,
  net,
  dialog
} from "electron"
import { join } from "path"
import { copyFileSync, existsSync } from "fs"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import {
  initStorage,
  closeStorage,
  insertObject,
  fetchObject,
  updateObject,
  deleteObject,
  queryObjects,
  getSetting,
  setSetting,
  getAllSettings,
  deleteSetting
} from "./storage"
import {
  loadSettings,
  updateSettings,
  exportSettings,
  importSettings,
  setCurrentDatabase,
  migrateOldSettingsToVault,
  loadGlobalSettings,
  updateGlobalSettings,
  addRecentDatabase,
  type Settings,
  type GlobalSettings
} from "./settings"

let mainWindow: BrowserWindow | null = null
let quickWindow: BrowserWindow | null = null
let searchWindow: BrowserWindow | null = null
let captureSuccessWindow: BrowserWindow | null = null
let lastCapturedCardId: string | null = null

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: false,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 12, y: Math.round(42 / 2 - 8) } }
      : {}),
    ...(process.platform === "linux" ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  mainWindow.on("ready-to-show", () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: "deny" }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

function createQuickWindow(): void {
  quickWindow = new BrowserWindow({
    type: "panel",
    width: 600,
    height: 300,
    show: false, // initially hidden
    frame: false, // frameless window
    // transparent: true, // transparent window
    resizable: false,
    alwaysOnTop: true, // always on top
    skipTaskbar: true, // do not show in taskbar
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    quickWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/quick.html`)
  } else {
    quickWindow.loadFile(join(__dirname, "../renderer/quick.html"))
  }

  // quickWindow.on("blur", () => {
  //   quickWindow?.hide()
  // })
}

function hideQuickWindow() {
  if (quickWindow && !quickWindow.isDestroyed() && quickWindow.isVisible()) {
    quickWindow.hide()
  }
}

function toggleQuickWindow() {
  if (!quickWindow || quickWindow.isDestroyed()) {
    createQuickWindow()
    return
  }

  if (quickWindow.isVisible()) {
    hideQuickWindow()
  } else {
    const point = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(point)
    const x = display.bounds.x + (display.bounds.width - 800) / 2
    const y = display.bounds.y + (display.bounds.height - 600) / 2 // 稍微偏上

    quickWindow.setPosition(Math.round(x), Math.round(y))
    quickWindow.show()
    quickWindow.focus()
  }
}

function createSearchWindow(): void {
  searchWindow = new BrowserWindow({
    width: 650,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreenable: false,
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    searchWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/search.html`)
  } else {
    searchWindow.loadFile(join(__dirname, "../renderer/search.html"))
  }

  searchWindow.on("blur", () => {
    searchWindow?.hide()
  })
}

function createCaptureSuccessWindow(): void {
  captureSuccessWindow = new BrowserWindow({
    type: "panel", // Use panel type for proper focus handling
    width: 320, // Slightly wider to accommodate shadow
    height: 120, // Taller to accommodate large shadow without clipping
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true, // Allow focus so it can take over from Quick Window
    fullscreenable: false,
    hasShadow: false, // Custom shadow in CSS
    backgroundColor: '#00000000', // Explicitly set transparent background color (ARGB)
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    captureSuccessWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/capture-success.html`)
  } else {
    captureSuccessWindow.loadFile(join(__dirname, "../renderer/capture-success.html"))
  }
}

function showCaptureSuccess(cardId: string) {
  if (!captureSuccessWindow || captureSuccessWindow.isDestroyed()) {
    createCaptureSuccessWindow()
  }

  lastCapturedCardId = cardId
  
  // Position at top center of the current display
  const point = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(point)
  const x = display.bounds.x + (display.bounds.width - 320) / 2
  // Adjust Y to keep the capsule roughly at the same visual vertical position
  // Old: height 60, y + 40 -> center at 70px
  // New: height 120, center at 60px -> y = 70 - 60 = 10px. 
  // Let's make it 20px to be safe.
  const y = display.bounds.y + 20 

  captureSuccessWindow?.setPosition(Math.round(x), Math.round(y))
  // Show and focus to prevent main window from activating
  captureSuccessWindow?.show() 
  captureSuccessWindow?.focus()
  captureSuccessWindow?.webContents.send("captureSuccess:show")
}

function hideCaptureSuccess() {
  if (captureSuccessWindow && !captureSuccessWindow.isDestroyed() && captureSuccessWindow.isVisible()) {
    captureSuccessWindow.webContents.send("captureSuccess:hide")
    // Give time for exit animation
    setTimeout(() => {
      captureSuccessWindow?.hide()
    }, 500)
  }
}

function toggleSearchWindow() {
  if (!searchWindow || searchWindow.isDestroyed()) {
    createSearchWindow()
    return
  }

  if (searchWindow.isVisible()) {
    searchWindow.hide()
  } else {
    const point = screen.getCursorScreenPoint()
    const display = screen.getDisplayNearestPoint(point)
    const x = display.bounds.x + (display.bounds.width - 650) / 2
    const y = display.bounds.y + 150

    searchWindow.setPosition(Math.round(x), Math.round(y))
    searchWindow.show()
    searchWindow.focus()
  }
}

function restFunc<T extends any[], R>(f: (...args: T) => R) {
  return function (_e: IpcMainInvokeEvent, ...rest: T) {
    return f(...rest)
  }
}

async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const response = await net.fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; STNote/1.0)" }
    })
    if (!response.ok) return null
    const html = await response.text()
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return titleMatch ? titleMatch[1].trim() : null
  } catch {
    return null
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId("com.electron")

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on("browser-window-created", (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC methods
  ipcMain.on("ping", () => console.log("pong"))
  ipcMain.handle("storage:init", (_e, path: string) => {
    initStorage(path)
    migrateOldSettingsToVault(path)
    setCurrentDatabase(path)
    addRecentDatabase(path)
  })
  ipcMain.handle("storage:close", (_e, path: string) => {
    closeStorage(path)
    setCurrentDatabase(null)
  })
  ipcMain.handle("storage:insert", restFunc(insertObject))
  ipcMain.handle("storage:fetch", restFunc(fetchObject))
  ipcMain.handle("storage:update", restFunc(updateObject))
  ipcMain.handle("storage:delete", restFunc(deleteObject))
  ipcMain.handle("storage:query", restFunc(queryObjects))
  ipcMain.handle("storage:getSetting", restFunc(getSetting))
  ipcMain.handle("storage:setSetting", restFunc(setSetting))
  ipcMain.handle("storage:getAllSettings", restFunc(getAllSettings))
  ipcMain.handle("storage:deleteSetting", restFunc(deleteSetting))
  ipcMain.handle("quick:hide", () => hideQuickWindow())
  ipcMain.handle("search:hide", () => searchWindow?.hide())
  ipcMain.handle("fetchPageTitle", restFunc(fetchPageTitle))

  // Database export/import
  ipcMain.handle("database:export", async (_e, currentDbPath: string) => {
    const result = await dialog.showSaveDialog({
      title: "Export Base",
      defaultPath: `st-note-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    })
    if (result.canceled || !result.filePath) return { success: false, canceled: true }
    try {
      copyFileSync(currentDbPath, result.filePath)
      return { success: true, canceled: false, path: result.filePath }
    } catch (e) {
      return { success: false, canceled: false, error: String(e) }
    }
  })

  ipcMain.handle("database:import", async () => {
    const result = await dialog.showOpenDialog({
      title: "Import Base",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const sourcePath = result.filePaths[0]
    if (!existsSync(sourcePath)) return null
    return sourcePath
  })

  ipcMain.handle("database:getPath", () => {
    const global = loadGlobalSettings()
    return global.lastDatabase
  })

  // Global settings IPC
  ipcMain.handle("globalSettings:get", () => loadGlobalSettings())
  ipcMain.handle("globalSettings:update", (_e, partial: Partial<GlobalSettings>) => updateGlobalSettings(partial))

  // Vault settings IPC (兼容旧 API)
  ipcMain.handle("settings:get", () => loadSettings())
  ipcMain.handle("settings:set", (_e, partial: Partial<Settings>) => {
    const updated = updateSettings(partial)
    // Broadcast to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("settings:changed", updated)
    })
    return updated
  })
  ipcMain.handle("settings:export", () => exportSettings())
  ipcMain.handle("settings:import", (_e, json: string) => {
    const updated = importSettings(json)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("settings:changed", updated)
    })
    return updated
  })

  // Quick capture IPC: forward to main window
  ipcMain.handle("quick:capture", async (_e, options: { content: any; checked?: boolean }) => {
    // if (!mainWindow) return // Do not require mainWindow to be visible or focused
    // But we need mainWindow instance to send IPC
    if (!mainWindow) return 

    // quickWindow?.hide() // Let renderer close it to avoid focus issues
    const win = mainWindow
    
    return new Promise<void>((resolve) => {
      const channel = `quick:captured:${Date.now()}`
      ipcMain.once(channel, (_e, cardId) => {
        // Strategy: Transfer focus to Success Window
        // This prevents macOS from activating the Main Window when Quick Window hides.
        
        // 1. Show Success Window first and grab focus
        if (cardId) {
          showCaptureSuccess(cardId)
        }

        // 2. Hide Quick Window immediately
        // Since Success Window is now the focused window of the app, 
        // hiding Quick Window shouldn't trigger Main Window activation.
        if (quickWindow && !quickWindow.isDestroyed()) {
          quickWindow.hide()
        }

        // 3. Reset Quick Window states (cleanup from previous hacks if any)
        if (quickWindow && !quickWindow.isDestroyed()) {
          quickWindow.setOpacity(1)
          quickWindow.setIgnoreMouseEvents(false)
        }

        resolve()
      })
      // Send to renderer without focusing window
      win.webContents.send("quick:capture", { ...options, responseChannel: channel })
      setTimeout(() => resolve(), 5000)
    })
  })

  // Search IPC: forward search requests to main window
  ipcMain.handle("search:query", async (_e, query: string) => {
    if (!mainWindow) return []
    const win = mainWindow
    return new Promise((resolve) => {
      const channel = `search:result:${Date.now()}`
      ipcMain.once(channel, (_e, results) => resolve(results))
      win.webContents.send("search:query", { query, responseChannel: channel })
      setTimeout(() => resolve([]), 5000) // timeout
    })
  })

  ipcMain.handle("search:getRecent", async () => {
    if (!mainWindow) return []
    const win = mainWindow
    return new Promise((resolve) => {
      const channel = `search:recent:${Date.now()}`
      ipcMain.once(channel, (_e, results) => resolve(results))
      win.webContents.send("search:getRecent", { responseChannel: channel })
      setTimeout(() => resolve([]), 5000)
    })
  })

  ipcMain.handle("search:selectCard", async (_e, cardId: string) => {
    if (!mainWindow) return
    mainWindow.webContents.send("search:selectCard", cardId)
    mainWindow.show()
    mainWindow.focus()
  })

  ipcMain.handle("search:createCard", async (_e, title: string) => {
    if (!mainWindow) return
    const win = mainWindow
    return new Promise((resolve) => {
      const channel = `search:cardCreated:${Date.now()}`
      ipcMain.once(channel, (_e, cardId) => resolve(cardId))
      win.webContents.send("search:createCard", { title, responseChannel: channel })
      setTimeout(() => resolve(null), 5000)
    })
  })

  // Capture Success IPC
  ipcMain.handle("captureSuccess:close", () => {
    hideCaptureSuccess()
  })
  
  ipcMain.handle("captureSuccess:openLastCaptured", () => {
    if (mainWindow && lastCapturedCardId) {
      mainWindow.show()
      mainWindow.focus()
      // Wait a bit for window to show and focus before sending navigation event
      setTimeout(() => {
        mainWindow?.webContents.send("search:selectCard", lastCapturedCardId)
      }, 100)
      hideCaptureSuccess()
    }
  })

  createWindow()
  createQuickWindow()
  createSearchWindow()
  createCaptureSuccessWindow()

  globalShortcut.register("CommandOrControl+Shift+C", toggleQuickWindow)
  globalShortcut.register("CommandOrControl+Shift+P", toggleSearchWindow)

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow) mainWindow.show()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
