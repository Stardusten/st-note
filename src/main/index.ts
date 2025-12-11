import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  IpcMainInvokeEvent,
  net,
  dialog,
  Menu,
  globalShortcut
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
  deleteSetting,
  insertFile,
  fetchFile,
  deleteFile
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
let settingsWindow: BrowserWindow | null = null
let currentBringToFrontShortcut: string | null = null

function registerBringToFrontShortcut(shortcut: string | null): boolean {
  if (currentBringToFrontShortcut) {
    globalShortcut.unregister(currentBringToFrontShortcut)
    currentBringToFrontShortcut = null
  }
  if (!shortcut) return true
  try {
    const success = globalShortcut.register(shortcut, () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.show()
        mainWindow.focus()
      }
    })
    if (success) currentBringToFrontShortcut = shortcut
    return success
  } catch {
    return false
  }
}

function createSettingsWindow(): void {
  if (settingsWindow) {
    settingsWindow.focus()
    return
  }

  settingsWindow = new BrowserWindow({
    width: 300,
    height: 260,
    show: false,
    resizable: false,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 12, y: Math.round(34 / 2 - 8) } }
      : { titleBarOverlay: { color: "#151619", symbolColor: "#999", height: 34 } }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  settingsWindow.on("ready-to-show", () => {
    settingsWindow?.show()
  })

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    settingsWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/settings.html`)
  } else {
    settingsWindow.loadFile(join(__dirname, "../renderer/settings.html"))
  }

  settingsWindow.on("closed", () => {
    settingsWindow = null
  })
}

type ImageViewerParams = {
  dbPath: string
  imageIds: string[]
  currentIndex: number
}

function createImageViewerWindow(params: ImageViewerParams): void {
  const imageViewerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 200,
    show: false,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 12, y: Math.round(34 / 2 - 8) } }
      : { titleBarOverlay: { color: "#000", symbolColor: "#999", height: 34 } }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  const search = `?dbPath=${encodeURIComponent(params.dbPath)}&imageIds=${encodeURIComponent(JSON.stringify(params.imageIds))}&currentIndex=${params.currentIndex}`
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    imageViewerWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/image-viewer.html${search}`)
  } else {
    imageViewerWindow.loadFile(join(__dirname, "../renderer/image-viewer.html"), { search })
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    // type: "panel",
    width: 400,
    height: 500,
    show: false,
    // autoHideMenuBar: false,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 12, y: Math.round(34 / 2 - 8) } }
      : { titleBarOverlay: { color: "#151619", symbolColor: "#999", height: 34 } }),
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

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"))
  }

  mainWindow.on("closed", () => {
    mainWindow = null
  })
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

app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.electron")

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
  ipcMain.handle("file:insert", restFunc(insertFile))
  ipcMain.handle("file:fetch", restFunc(fetchFile))
  ipcMain.handle("file:delete", restFunc(deleteFile))
  ipcMain.handle("image:openViewer", (_e, params: ImageViewerParams) =>
    createImageViewerWindow(params)
  )
  ipcMain.handle("image:resizeAndShow", (e, width: number, height: number) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (win) {
      win.setSize(Math.round(width), Math.round(height))
      win.show()
    }
  })
  ipcMain.handle("image:saveFile", async (_e, data: Uint8Array, mimeType: string) => {
    const ext = mimeType.split("/")[1] || "png"
    const result = await dialog.showSaveDialog({
      title: "Save Image",
      defaultPath: `image.${ext}`,
      filters: [{ name: "Image", extensions: [ext] }]
    })
    if (result.canceled || !result.filePath) return { success: false, canceled: true }
    try {
      const { writeFileSync } = await import("fs")
      writeFileSync(result.filePath, Buffer.from(data))
      return { success: true, canceled: false, path: result.filePath }
    } catch (e) {
      return { success: false, canceled: false, error: String(e) }
    }
  })
  ipcMain.handle("fetchPageTitle", restFunc(fetchPageTitle))

  // Database operations
  ipcMain.handle("database:export", async (_e, currentDbPath: string) => {
    const result = await dialog.showSaveDialog({
      title: "Export Database",
      defaultPath: `nv25-backup-${new Date().toISOString().slice(0, 10)}.db`,
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
      title: "Open Database",
      filters: [{ name: "SQLite Database", extensions: ["db"] }],
      properties: ["openFile"]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const sourcePath = result.filePaths[0]
    if (!existsSync(sourcePath)) return null
    return sourcePath
  })

  ipcMain.handle("database:new", async () => {
    const result = await dialog.showSaveDialog({
      title: "New Database",
      defaultPath: "notes.db",
      filters: [{ name: "SQLite Database", extensions: ["db"] }]
    })
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle("database:getPath", () => {
    const global = loadGlobalSettings()
    return global.lastDatabase
  })

  ipcMain.handle("database:getDefaultPath", () => {
    return join(app.getPath("userData"), "notes.db")
  })

  // Global settings IPC
  ipcMain.handle("globalSettings:get", () => loadGlobalSettings())
  ipcMain.handle("globalSettings:update", (_e, partial: Partial<GlobalSettings>) => {
    const updated = updateGlobalSettings(partial)
    if ("bringToFrontShortcut" in partial) {
      registerBringToFrontShortcut(updated.bringToFrontShortcut)
    }
    return updated
  })
  ipcMain.handle("globalSettings:registerShortcut", (_e, shortcut: string) => {
    return registerBringToFrontShortcut(shortcut)
  })

  // Vault settings IPC
  ipcMain.handle("settings:get", () => loadSettings())
  ipcMain.handle("settings:set", (_e, partial: Partial<Settings>) => {
    const updated = updateSettings(partial)
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

  createWindow()

  // Register initial global shortcut
  const globalSettings = loadGlobalSettings()
  if (globalSettings.bringToFrontShortcut) {
    registerBringToFrontShortcut(globalSettings.bringToFrontShortcut)
  }

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              {
                label: "Settings...",
                accelerator: "CmdOrCtrl+,",
                click: () => createSettingsWindow()
              },
              { type: "separator" as const },
              { role: "services" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const }
            ]
          }
        ]
      : []),
    { role: "fileMenu" as const },
    { role: "editMenu" as const },
    {
      label: "Database",
      submenu: [
        {
          label: "New Database...",
          accelerator: "CmdOrCtrl+Shift+N",
          click: () => mainWindow?.webContents.send("menu:newDatabase")
        },
        {
          label: "Open Database...",
          accelerator: "CmdOrCtrl+O",
          click: () => mainWindow?.webContents.send("menu:openDatabase")
        },
        { type: "separator" },
        {
          label: "Import Database...",
          click: () => mainWindow?.webContents.send("menu:import")
        },
        {
          label: "Export Database...",
          click: () => mainWindow?.webContents.send("menu:export")
        },
        ...(process.platform !== "darwin"
          ? [
              { type: "separator" as const },
              {
                label: "Settings...",
                accelerator: "CmdOrCtrl+,",
                click: () => createSettingsWindow()
              }
            ]
          : [])
      ]
    },
    { role: "viewMenu" as const },
    { role: "windowMenu" as const }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else if (mainWindow) mainWindow.show()
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
