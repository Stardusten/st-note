import { contextBridge, ipcRenderer } from "electron"
import { electronAPI } from "@electron-toolkit/preload"

export type StObjectId = string

export type StObjectRaw = {
  id: StObjectId
  type: string
  data: string
  text: string
  tags: string
  updated_at: number
  created_at: number
  deleted_at: number
}

export type CreateParamsRaw = Pick<StObjectRaw, "id" | "type" | "data" | "text" | "tags">
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

export type SearchResultItem = {
  id: string
  title: string
  text: string
}

export type SearchAPI = {
  query: (query: string) => Promise<SearchResultItem[]>
  getRecent: () => Promise<SearchResultItem[]>
  selectCard: (cardId: string) => Promise<void>
  createCard: (title: string) => Promise<string | null>
  onQuery: (callback: (data: { query: string; responseChannel: string }) => void) => void
  onGetRecent: (callback: (data: { responseChannel: string }) => void) => void
  onSelectCard: (callback: (cardId: string) => void) => void
  onCreateCard: (callback: (data: { title: string; responseChannel: string }) => void) => void
  sendResult: (channel: string, results: SearchResultItem[]) => void
  sendCardCreated: (channel: string, cardId: string | null) => void
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
}

export type GlobalSettingsAPI = {
  get: () => Promise<GlobalSettings>
  update: (partial: Partial<GlobalSettings>) => Promise<GlobalSettings>
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
  getPath: () => Promise<string | null>
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
    getPath: () => ipcRenderer.invoke("database:getPath")
  } satisfies DatabaseAPI,
  hideQuickWindow: () => ipcRenderer.invoke("quick:hide"),
  hideSearchWindow: () => ipcRenderer.invoke("search:hide"),
  fetchPageTitle: (url: string) => ipcRenderer.invoke("fetchPageTitle", url) as Promise<string | null>,
  quick: {
    capture: (options: { content: any; checked?: boolean }) => ipcRenderer.invoke("quick:capture", options) as Promise<void>,
    onCapture: (callback: (data: { content: any; checked?: boolean; responseChannel: string }) => void) =>
      ipcRenderer.on("quick:capture", (_e, data) => callback(data)),
    sendCaptured: (channel: string) => ipcRenderer.send(channel, null)
  },
  search: {
    query: (query) => ipcRenderer.invoke("search:query", query),
    getRecent: () => ipcRenderer.invoke("search:getRecent"),
    selectCard: (cardId) => ipcRenderer.invoke("search:selectCard", cardId),
    createCard: (title) => ipcRenderer.invoke("search:createCard", title),
    onQuery: (callback) => ipcRenderer.on("search:query", (_e, data) => callback(data)),
    onGetRecent: (callback) => ipcRenderer.on("search:getRecent", (_e, data) => callback(data)),
    onSelectCard: (callback) => ipcRenderer.on("search:selectCard", (_e, cardId) => callback(cardId)),
    onCreateCard: (callback) => ipcRenderer.on("search:createCard", (_e, data) => callback(data)),
    sendResult: (channel, results) => ipcRenderer.send(channel, results),
    sendCardCreated: (channel, cardId) => ipcRenderer.send(channel, cardId)
  } satisfies SearchAPI,
  settings: {
    get: () => ipcRenderer.invoke("settings:get"),
    set: (partial) => ipcRenderer.invoke("settings:set", partial),
    export: () => ipcRenderer.invoke("settings:export"),
    import: (json) => ipcRenderer.invoke("settings:import", json),
    onChange: (callback) => ipcRenderer.on("settings:changed", (_e, settings) => callback(settings))
  } satisfies SettingsAPI,
  globalSettings: {
    get: () => ipcRenderer.invoke("globalSettings:get"),
    update: (partial) => ipcRenderer.invoke("globalSettings:update", partial)
  } satisfies GlobalSettingsAPI
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
