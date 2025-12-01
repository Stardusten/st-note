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
}

const api = {
  storage: {
    init: (path) => ipcRenderer.invoke("storage:init", path),
    close: (path) => ipcRenderer.invoke("storage:close", path),
    insert: (path, params) => ipcRenderer.invoke("storage:insert", path, params),
    fetch: (path, id) => ipcRenderer.invoke("storage:fetch", path, id),
    update: (path, params) => ipcRenderer.invoke("storage:update", path, params),
    delete: (path, id) => ipcRenderer.invoke("storage:delete", path, id),
    query: (path, options) => ipcRenderer.invoke("storage:query", path, options)
  } satisfies StorageAPI
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
