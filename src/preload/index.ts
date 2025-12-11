import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

export type StObjectId = string

export type StObjectRaw = {
  id: StObjectId
  type: string
  data: string
  updated_at: number
  created_at: number
  deleted_at: number
}

export type CreateParamsRaw = Pick<StObjectRaw, "id" | "type" | "data">
export type UpdateParamsRaw = CreateParamsRaw

export type QueryOptionsRaw = {
  type?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}

export type StorageAPI = {
  init: (path: string) => Promise<void>
  close: (path: string) => Promise<void>
  insert: (path: string, params: CreateParamsRaw) => Promise<StObjectRaw>
  fetch: (path: string, id: StObjectId) => Promise<StObjectRaw | null>
  update: (path: string, params: UpdateParamsRaw) => Promise<void>
  delete: (path: string, id: StObjectId) => Promise<void>
  query: (path: string, options?: QueryOptionsRaw) => Promise<StObjectRaw[]>
  getSetting: (path: string, key: string) => Promise<string | null>
  setSetting: (path: string, key: string, value: string) => Promise<void>
  getAllSettings: (path: string) => Promise<Record<string, string>>
  deleteSetting: (path: string, key: string) => Promise<void>
}

export type Settings = {
  theme: "light" | "dark" | "system"
  fontSize: "small" | "medium" | "large"
  showLineNumbers: boolean
  spellCheck: boolean
  quickCaptureShortcut: string
  searchShortcut: string
  language: "zh-CN" | "en-US"
  autoSave: boolean
}

export type SettingsAPI = {
  get: () => Promise<Settings>
  set: (partial: Partial<Settings>) => Promise<Settings>
  export: () => Promise<string>
  import: (json: string) => Promise<Settings>
  onChange: (callback: (settings: Settings) => void) => void
}

export type GlobalSettings = {
  lastDatabase: string | null
  recentDatabases: string[]
  bringToFrontShortcut: string
}

export type GlobalSettingsAPI = {
  get: () => Promise<GlobalSettings>
  update: (partial: Partial<GlobalSettings>) => Promise<GlobalSettings>
  registerShortcut: (shortcut: string) => Promise<boolean>
}

export type DatabaseExportResult = {
  success: boolean
  canceled: boolean
  path?: string
  error?: string
}

export type DatabaseAPI = {
  export: (currentDbPath: string) => Promise<DatabaseExportResult>
  import: () => Promise<string | null>
  new: () => Promise<string | null>
  getPath: () => Promise<string | null>
  getDefaultPath: () => Promise<string>
}

export type MenuAPI = {
  onImport: (callback: () => void) => void
  onExport: (callback: () => void) => void
  onNewDatabase: (callback: () => void) => void
  onOpenDatabase: (callback: () => void) => void
  onSettings: (callback: () => void) => void
}

export type FileRecord = {
  id: string
  filename: string | null
  mimeType: string
  data: Uint8Array
  createdAt: number
}

export type FileAPI = {
  insert: (path: string, id: string, filename: string | null, mimeType: string, data: Uint8Array) => Promise<FileRecord>
  fetch: (path: string, id: string) => Promise<FileRecord | null>
  delete: (path: string, id: string) => Promise<void>
}

export type ImageViewerParams = {
  dbPath: string
  imageIds: string[]
  currentIndex: number
}

export type SaveFileResult = {
  success: boolean
  canceled: boolean
  path?: string
  error?: string
}

export type ImageAPI = {
  openViewer: (params: ImageViewerParams) => Promise<void>
  resizeAndShow: (width: number, height: number) => Promise<void>
  saveFile: (data: Uint8Array, mimeType: string) => Promise<SaveFileResult>
}

const api = {
  storage: {
    init: (path) => ipcRenderer.invoke("storage:init", path),
    close: (path) => ipcRenderer.invoke("storage:close", path),
    insert: (path, params) => ipcRenderer.invoke("storage:insert", path, params),
    fetch: (path, id) => ipcRenderer.invoke("storage:fetch", path, id),
    update: (path, params) => ipcRenderer.invoke("storage:update", path, params),
    delete: (path, id) => ipcRenderer.invoke("storage:delete", path, id),
    query: (path, options) => ipcRenderer.invoke("storage:query", path, options),
    getSetting: (path, key) => ipcRenderer.invoke("storage:getSetting", path, key),
    setSetting: (path, key, value) => ipcRenderer.invoke("storage:setSetting", path, key, value),
    getAllSettings: (path) => ipcRenderer.invoke("storage:getAllSettings", path),
    deleteSetting: (path, key) => ipcRenderer.invoke("storage:deleteSetting", path, key)
  } satisfies StorageAPI,
  database: {
    export: (currentDbPath) => ipcRenderer.invoke("database:export", currentDbPath),
    import: () => ipcRenderer.invoke("database:import"),
    new: () => ipcRenderer.invoke("database:new"),
    getPath: () => ipcRenderer.invoke("database:getPath"),
    getDefaultPath: () => ipcRenderer.invoke("database:getDefaultPath")
  } satisfies DatabaseAPI,
  fetchPageTitle: (url: string) => ipcRenderer.invoke("fetchPageTitle", url) as Promise<string | null>,
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partial) => ipcRenderer.invoke("settings:set", partial),
    export: () => ipcRenderer.invoke("settings:export"),
    import: (json) => ipcRenderer.invoke("settings:import", json),
    onChange: (callback) => ipcRenderer.on("settings:changed", (_e, settings) => callback(settings))
  } satisfies SettingsAPI,
  globalSettings: {
    get: () => ipcRenderer.invoke("globalSettings:get"),
    update: (partial) => ipcRenderer.invoke("globalSettings:update", partial),
    registerShortcut: (shortcut) => ipcRenderer.invoke("globalSettings:registerShortcut", shortcut)
  } satisfies GlobalSettingsAPI,
  menu: {
    onImport: (callback) => ipcRenderer.on("menu:import", () => callback()),
    onExport: (callback) => ipcRenderer.on("menu:export", () => callback()),
    onNewDatabase: (callback) => ipcRenderer.on("menu:newDatabase", () => callback()),
    onOpenDatabase: (callback) => ipcRenderer.on("menu:openDatabase", () => callback()),
    onSettings: (callback) => ipcRenderer.on("menu:settings", () => callback())
  } satisfies MenuAPI,
  file: {
    insert: async (path, id, filename, mimeType, data) => {
      const result = await ipcRenderer.invoke("file:insert", path, id, filename, mimeType, Buffer.from(data))
      return { id: result.id, filename: result.filename, mimeType: result.mime_type, data: result.data, createdAt: result.created_at }
    },
    fetch: async (path, id) => {
      const result = await ipcRenderer.invoke("file:fetch", path, id)
      if (!result) return null
      return { id: result.id, filename: result.filename, mimeType: result.mime_type, data: result.data, createdAt: result.created_at }
    },
    delete: (path, id) => ipcRenderer.invoke("file:delete", path, id)
  } satisfies FileAPI,
  image: {
    openViewer: (params) => ipcRenderer.invoke("image:openViewer", params),
    resizeAndShow: (width, height) => ipcRenderer.invoke("image:resizeAndShow", width, height),
    saveFile: (data, mimeType) => ipcRenderer.invoke("image:saveFile", data, mimeType)
  } satisfies ImageAPI
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI)
    contextBridge.exposeInMainWorld("api", api)
  } catch (error) {
    console.error(error)
  }
} else {
  const windowAny = window as any
  windowAny.electron = electronAPI as any
  windowAny.api = api
}
