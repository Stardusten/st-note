import { app, shell, BrowserWindow, ipcMain, IpcMainInvokeEvent, net, dialog } from "electron"
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
  ipcMain.handle("fetchPageTitle", restFunc(fetchPageTitle))

  // Database export/import
  ipcMain.handle("database:export", async (_e, currentDbPath: string) => {
    const result = await dialog.showSaveDialog({
      title: "Export Base",
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
  ipcMain.handle("globalSettings:update", (_e, partial: Partial<GlobalSettings>) =>
    updateGlobalSettings(partial)
  )

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
