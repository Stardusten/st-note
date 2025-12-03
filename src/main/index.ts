import {
  app,
  shell,
  screen,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  globalShortcut
} from "electron"
import { join } from "path"
import { electronApp, optimizer, is } from "@electron-toolkit/utils"
import icon from "../../resources/icon.png?asset"
import {
  initStorage,
  closeStorage,
  insertObject,
  fetchObject,
  updateObject,
  deleteObject,
  queryObjects
} from "./storage"

let mainWindow: BrowserWindow | null = null
let quickWindow: BrowserWindow | null = null
let searchWindow: BrowserWindow | null = null

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

function toggleQuickWindow() {
  if (!quickWindow || quickWindow.isDestroyed()) {
    createQuickWindow()
    return
  }

  if (quickWindow.isVisible()) {
    quickWindow.hide()
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
  ipcMain.handle("storage:init", restFunc(initStorage))
  ipcMain.handle("storage:close", restFunc(closeStorage))
  ipcMain.handle("storage:insert", restFunc(insertObject))
  ipcMain.handle("storage:fetch", restFunc(fetchObject))
  ipcMain.handle("storage:update", restFunc(updateObject))
  ipcMain.handle("storage:delete", restFunc(deleteObject))
  ipcMain.handle("storage:query", restFunc(queryObjects))
  ipcMain.handle("quick:hide", () => quickWindow?.hide())
  ipcMain.handle("search:hide", () => searchWindow?.hide())

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

  createWindow()
  createQuickWindow()
  createSearchWindow()

  globalShortcut.register("CommandOrControl+Shift+C", toggleQuickWindow)
  globalShortcut.register("CommandOrControl+Shift+P", toggleSearchWindow)

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
