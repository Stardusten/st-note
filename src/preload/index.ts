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
  showLineNumbers: boolean
  spellCheck: boolean
  quickCaptureShortcut: string
  searchShortcut: string
  language: "zh-CN" | "en-US"
  autoSave: boolean
  autoLayout: boolean
  preferredLayout: "vertical" | "horizontal"
  searchMatchThreshold: number
  customCSS: string
  codeBlockWrap: boolean
}

export type SettingsAPI = {
  get: () => Promise<Settings>
  set: (partial: Partial<Settings>) => Promise<Settings>
  export: () => Promise<string>
  import: (json: string) => Promise<Settings>
  onChange: (callback: (settings: Settings) => void) => void
}

export type WindowSize = { width: number; height: number }
export type WindowPosition = { x: number; y: number }

export type GlobalSettings = {
  lastDatabase: string | null
  recentDatabases: string[]
  bringToFrontShortcut: string
  windowSizeVertical: WindowSize
  windowSizeHorizontal: WindowSize
  windowPosition: WindowPosition | null
  lastLayout: "vertical" | "horizontal"
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
  onToggleAgenda: (callback: () => void) => void
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

export type WindowAPI = {
  onPinChanged: (callback: (isPinned: boolean) => void) => void
  onFocus: (callback: () => void) => void
}

export type ContextMenuItem = {
  id: string
  label: string
  type?: "normal" | "separator" | "submenu"
  destructive?: boolean
  checked?: boolean
  submenu?: ContextMenuItem[]
}

export type ContextMenuAPI = {
  show: (items: ContextMenuItem[]) => Promise<string | null>
}

export type SpellcheckAPI = {
  addWord: (word: string) => Promise<boolean>
  removeWord: (word: string) => Promise<boolean>
  listWords: () => Promise<string[]>
  getLanguages: () => Promise<string[]>
  setLanguages: (languages: string[]) => Promise<void>
  getAvailableLanguages: () => Promise<string[]>
}

export type CardSuggestionItem = {
  id: string
  title: string
}

export type EditorWindowAPI = {
  open: (params: { cardId: string; dbPath: string }) => Promise<void>
  getCard: (dbPath: string, cardId: string) => Promise<any | null>
  updateCard: (dbPath: string, cardId: string, content: object, source?: string) => Promise<void>
  searchCards: (dbPath: string, query: string) => Promise<CardSuggestionItem[]>
  createCard: (dbPath: string, title: string) => Promise<CardSuggestionItem | null>
  getCardTitle: (dbPath: string, cardId: string) => Promise<string>
  navigateToCard: (cardId: string) => Promise<void>
  onCardUpdated: (callback: (card: any, source?: string) => void) => () => void
  onNavigateRequest: (callback: (cardId: string) => void) => void
  registerHandlers: (handlers: {
    getCard: (dbPath: string, cardId: string) => any | null
    updateCard: (dbPath: string, cardId: string, content: object, source?: string) => void
    searchCards: (dbPath: string, query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
    createCard: (dbPath: string, title: string) => Promise<CardSuggestionItem | null>
    getCardTitle: (dbPath: string, cardId: string) => string
  }) => void
  broadcastCardUpdate: (card: any, source?: string) => void
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
    onSettings: (callback) => ipcRenderer.on("menu:settings", () => callback()),
    onToggleAgenda: (callback) => ipcRenderer.on("menu:toggleAgenda", () => callback())
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
  } satisfies ImageAPI,
  window: {
    onPinChanged: (callback) => ipcRenderer.on("window:pinChanged", (_e, isPinned) => callback(isPinned)),
    onFocus: (callback) => ipcRenderer.on("window:focus", () => callback())
  } satisfies WindowAPI,
  contextMenu: {
    show: (items) => ipcRenderer.invoke("contextMenu:show", items)
  } satisfies ContextMenuAPI,
  spellcheck: {
    addWord: (word) => ipcRenderer.invoke("spellcheck:addWord", word),
    removeWord: (word) => ipcRenderer.invoke("spellcheck:removeWord", word),
    listWords: () => ipcRenderer.invoke("spellcheck:listWords"),
    getLanguages: () => ipcRenderer.invoke("spellcheck:getLanguages"),
    setLanguages: (languages) => ipcRenderer.invoke("spellcheck:setLanguages", languages),
    getAvailableLanguages: () => ipcRenderer.invoke("spellcheck:getAvailableLanguages")
  } satisfies SpellcheckAPI,
  editorWindow: (() => {
    let handlers: {
      getCard?: (dbPath: string, cardId: string) => any | null
      updateCard?: (dbPath: string, cardId: string, content: object, source?: string) => void
      searchCards?: (dbPath: string, query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
      createCard?: (dbPath: string, title: string) => Promise<CardSuggestionItem | null>
      getCardTitle?: (dbPath: string, cardId: string) => string
    } = {}

    ipcRenderer.on("editorWindow:request", async (_e, requestId: string, method: string, args: any[]) => {
      let result: any = null
      try {
        switch (method) {
          case "getCard":
            result = handlers.getCard?.(args[0], args[1])
            break
          case "updateCard":
            handlers.updateCard?.(args[0], args[1], args[2], args[3])
            break
          case "searchCards":
            result = await handlers.searchCards?.(args[0], args[1])
            break
          case "createCard":
            result = await handlers.createCard?.(args[0], args[1])
            break
          case "getCardTitle":
            result = handlers.getCardTitle?.(args[0], args[1])
            break
        }
      } catch (e) {
        console.error("editorWindow:request error", e)
      }
      ipcRenderer.send("editorWindow:response", requestId, result)
    })

    return {
      open: (params) => ipcRenderer.invoke("editorWindow:open", params),
      getCard: (dbPath, cardId) => ipcRenderer.invoke("editorWindow:getCard", dbPath, cardId),
      updateCard: (dbPath, cardId, content, source) => ipcRenderer.invoke("editorWindow:updateCard", dbPath, cardId, content, source),
      searchCards: (dbPath, query) => ipcRenderer.invoke("editorWindow:searchCards", dbPath, query),
      createCard: (dbPath, title) => ipcRenderer.invoke("editorWindow:createCard", dbPath, title),
      getCardTitle: (dbPath, cardId) => ipcRenderer.invoke("editorWindow:getCardTitle", dbPath, cardId),
      navigateToCard: (cardId) => ipcRenderer.invoke("editorWindow:navigateToCard", cardId),
      onCardUpdated: (callback) => {
        const handler = (_e: any, card: any, source?: string) => callback(card, source)
        ipcRenderer.on("editorWindow:cardUpdated", handler)
        return () => ipcRenderer.removeListener("editorWindow:cardUpdated", handler)
      },
      onNavigateRequest: (callback) => ipcRenderer.on("editorWindow:navigateToCard", (_e, cardId) => callback(cardId)),
      registerHandlers: (h) => { handlers = h },
      broadcastCardUpdate: (card, source) => ipcRenderer.send("editorWindow:broadcastCardUpdate", card, source)
    } satisfies EditorWindowAPI
  })()
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
