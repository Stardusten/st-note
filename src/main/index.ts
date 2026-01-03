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
const editorWindows: Map<string, BrowserWindow> = new Map()

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
    height: 500,
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

type EditorWindowParams = {
  cardId: string
  dbPath: string
}

function createEditorWindow(params: EditorWindowParams): void {
  const existingWindow = editorWindows.get(params.cardId)
  if (existingWindow) {
    existingWindow.focus()
    return
  }

  let x: number | undefined
  let y: number | undefined
  if (mainWindow) {
    const [mainX, mainY] = mainWindow.getPosition()
    const [mainWidth] = mainWindow.getSize()
    x = mainX + mainWidth + 20
    y = mainY
  }

  const editorWindow = new BrowserWindow({
    width: 400,
    height: 500,
    minWidth: 300,
    minHeight: 200,
    x,
    y,
    show: false,
    titleBarStyle: "hidden",
    ...(process.platform === "darwin"
      ? { trafficLightPosition: { x: 12, y: Math.round(34 / 2 - 8) } }
      : { titleBarOverlay: { color: "#151619", symbolColor: "#999", height: 34 } }),
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  })

  editorWindows.set(params.cardId, editorWindow)

  editorWindow.on("ready-to-show", () => {
    editorWindow.show()
  })

  editorWindow.on("closed", () => {
    editorWindows.delete(params.cardId)
  })

  const search = `?cardId=${encodeURIComponent(params.cardId)}&dbPath=${encodeURIComponent(params.dbPath)}`
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    editorWindow.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}/editor-window.html${search}`)
  } else {
    editorWindow.loadFile(join(__dirname, "../renderer/editor-window.html"), { search })
  }
}

function createWindow(): void {
  const globalSettings = loadGlobalSettings()
  const layout = globalSettings.lastLayout
  const size =
    layout === "horizontal"
      ? globalSettings.windowSizeHorizontal
      : globalSettings.windowSizeVertical
  const position = globalSettings.windowPosition

  mainWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    ...(position ? { x: position.x, y: position.y } : {}),
    show: false,
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
    window.on("focus", () => rebuildMenu(loadSettings()))
  })

  // IPC methods
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

  // Editor window operations
  ipcMain.handle("editorWindow:open", (_e, params: EditorWindowParams) =>
    createEditorWindow(params)
  )

  const pendingRequests = new Map<
    string,
    { resolve: (value: any) => void; reject: (error: any) => void }
  >()
  let requestIdCounter = 0

  const sendToMainWindow = <T>(method: string, ...args: any[]): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (!mainWindow) {
        reject(new Error("Main window not available"))
        return
      }
      const requestId = `req-${++requestIdCounter}`
      pendingRequests.set(requestId, { resolve, reject })
      mainWindow.webContents.send("editorWindow:request", requestId, method, args)
      setTimeout(() => {
        if (pendingRequests.has(requestId)) {
          pendingRequests.delete(requestId)
          reject(new Error("Request timeout"))
        }
      }, 30000)
    })
  }

  ipcMain.on("editorWindow:response", (_e, requestId: string, result: any) => {
    const pending = pendingRequests.get(requestId)
    if (pending) {
      pendingRequests.delete(requestId)
      pending.resolve(result)
    }
  })

  ipcMain.handle("editorWindow:getCard", async (_e, dbPath: string, cardId: string) => {
    return sendToMainWindow("getCard", dbPath, cardId)
  })

  ipcMain.handle(
    "editorWindow:updateCard",
    async (_e, dbPath: string, cardId: string, content: object, source?: string) => {
      return sendToMainWindow("updateCard", dbPath, cardId, content, source)
    }
  )

  ipcMain.handle("editorWindow:searchCards", async (_e, dbPath: string, query: string) => {
    return sendToMainWindow("searchCards", dbPath, query)
  })

  ipcMain.handle("editorWindow:createCard", async (_e, dbPath: string, title: string) => {
    return sendToMainWindow("createCard", dbPath, title)
  })

  ipcMain.handle("editorWindow:getCardTitle", async (_e, dbPath: string, cardId: string) => {
    return sendToMainWindow("getCardTitle", dbPath, cardId)
  })

  ipcMain.handle("editorWindow:navigateToCard", async (_e, cardId: string) => {
    if (!mainWindow) return
    mainWindow.webContents.send("editorWindow:navigateToCard", cardId)
    mainWindow.show()
    mainWindow.focus()
  })

  type ContextMenuItem = {
    id: string
    label: string
    type?: "normal" | "separator" | "submenu"
    destructive?: boolean
    checked?: boolean
    submenu?: ContextMenuItem[]
  }

  const buildMenuItems = (items: ContextMenuItem[], resolve: (id: string | null) => void): Electron.MenuItemConstructorOptions[] => {
    return items.map((item) => {
      if (item.type === "separator") return { type: "separator" as const }
      if (item.type === "submenu" && item.submenu) {
        return {
          label: item.label,
          submenu: buildMenuItems(item.submenu, resolve)
        }
      }
      return {
        label: item.label,
        type: item.checked !== undefined ? "checkbox" as const : "normal" as const,
        checked: item.checked,
        click: () => resolve(item.id)
      }
    })
  }

  ipcMain.handle("contextMenu:show", (e, items: ContextMenuItem[]) => {
    return new Promise<string | null>((resolve) => {
      const win = BrowserWindow.fromWebContents(e.sender)
      if (!win) {
        resolve(null)
        return
      }
      const menuItems = buildMenuItems(items, resolve)
      const menu = Menu.buildFromTemplate(menuItems)
      menu.popup({ window: win, callback: () => resolve(null) })
    })
  })

  ipcMain.on("editorWindow:broadcastCardUpdate", (_e, card: any, source?: string) => {
    for (const [, win] of editorWindows) {
      win.webContents.send("editorWindow:cardUpdated", card, source)
    }
  })

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
    rebuildMenu(updated)
    return updated
  })
  ipcMain.handle("settings:export", () => exportSettings())
  ipcMain.handle("settings:import", (_e, json: string) => {
    const updated = importSettings(json)
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("settings:changed", updated)
    })
    rebuildMenu(updated)
    return updated
  })

  createWindow()

  // Register initial global shortcut
  const globalSettings = loadGlobalSettings()
  if (globalSettings.bringToFrontShortcut) {
    registerBringToFrontShortcut(globalSettings.bringToFrontShortcut)
  }

  type LayoutType = "vertical" | "horizontal"

  const getCurrentEffectiveLayout = (): LayoutType => {
    const settings = loadSettings()
    if (settings.autoLayout && mainWindow) {
      const [width] = mainWindow.getSize()
      return width >= 600 ? "horizontal" : "vertical"
    }
    return settings.preferredLayout
  }

  const resizeWindowForLayout = (layout: LayoutType) => {
    if (!mainWindow) return
    const global = loadGlobalSettings()
    const size = layout === "horizontal" ? global.windowSizeHorizontal : global.windowSizeVertical
    mainWindow.setSize(size.width, size.height)
  }

  const saveCurrentWindowSize = () => {
    if (!mainWindow) return
    const layout = getCurrentEffectiveLayout()
    const [width, height] = mainWindow.getSize()
    const key = layout === "horizontal" ? "windowSizeHorizontal" : "windowSizeVertical"
    updateGlobalSettings({ [key]: { width, height }, lastLayout: layout })
  }

  const saveCurrentWindowPosition = () => {
    if (!mainWindow) return
    const [x, y] = mainWindow.getPosition()
    updateGlobalSettings({ windowPosition: { x, y } })
  }

  const setLayout = (layout: LayoutType) => {
    const updated = updateSettings({ preferredLayout: layout, autoLayout: false })
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("settings:changed", updated)
    })
    resizeWindowForLayout(layout)
    rebuildMenu(updated)
  }

  const setAutoLayout = (enabled: boolean) => {
    const updated = updateSettings({ autoLayout: enabled })
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send("settings:changed", updated)
    })
    rebuildMenu(updated)
  }

  const togglePinWindow = () => {
    const win = BrowserWindow.getFocusedWindow()
    if (win) {
      const newState = !win.isAlwaysOnTop()
      win.setAlwaysOnTop(newState)
      win.webContents.send("window:pinChanged", newState)
      rebuildMenu(loadSettings())
    }
  }

  const rebuildMenu = (settings: Settings) => {
    const focusedWindow = BrowserWindow.getFocusedWindow()
    const isPinned = focusedWindow?.isAlwaysOnTop() ?? false

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
            click: () => mainWindow?.webContents.send("menu:newDatabase")
          },
          {
            label: "Open Database...",
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
      {
        label: "View",
        submenu: [
          {
            label: "Pin Window",
            type: "checkbox",
            checked: isPinned,
            accelerator: "CmdOrCtrl+Shift+P",
            click: () => togglePinWindow()
          },
          { type: "separator" },
          {
            label: "Auto Layout",
            type: "checkbox",
            checked: settings.autoLayout,
            click: () => setAutoLayout(!settings.autoLayout)
          },
          {
            label: "Layout",
            submenu: [
              {
                label: "Vertical",
                type: "radio",
                accelerator: "CmdOrCtrl+Option+1",
                checked: !settings.autoLayout && settings.preferredLayout === "vertical",
                click: () => setLayout("vertical")
              },
              {
                label: "Horizontal",
                type: "radio",
                accelerator: "CmdOrCtrl+Option+2",
                checked: !settings.autoLayout && settings.preferredLayout === "horizontal",
                click: () => setLayout("horizontal")
              }
            ]
          },
          { type: "separator" },
          {
            label: "Toggle Agenda",
            accelerator: "CmdOrCtrl+Shift+A",
            click: () => mainWindow?.webContents.send("menu:toggleAgenda")
          },
          { type: "separator" },
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" }
        ]
      },
      { role: "windowMenu" as const }
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))
  }

  const initialSettings = loadSettings()
  rebuildMenu(initialSettings)

  // Track window resize to save size per layout
  mainWindow?.on("resize", () => {
    saveCurrentWindowSize()
  })

  // Track window move to save position
  mainWindow?.on("move", () => {
    saveCurrentWindowPosition()
  })

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
