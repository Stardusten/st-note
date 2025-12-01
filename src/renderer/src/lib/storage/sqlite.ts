import { createParamsToRaw, stObjectFromRaw, updateParamsToRaw, type Storage } from "./storage"
import { CreateParams, StObject, UpdateParams } from "../common/types"
import { StObjectId } from "src/preload"

export class SQLiteStorage implements Storage {
  private path: string | null = null

  async init(path: string): Promise<void> {
    this.path = path
    await window.api.storage.init(path)
  }

  async close(): Promise<void> {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    await window.api.storage.close(this.path)
    this.path = null
  }

  async insert(params: CreateParams): Promise<StObject> {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    const raw = await window.api.storage.insert(this.path, createParamsToRaw(params))
    return stObjectFromRaw(raw)
  }

  async fetch(id: StObjectId): Promise<StObject | null> {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    const raw = await window.api.storage.fetch(this.path, id)
    return raw == null ? null : stObjectFromRaw(raw)
  }

  async update(params: UpdateParams) {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    await window.api.storage.update(this.path, updateParamsToRaw(params))
  }

  async delete(id: StObjectId): Promise<void> {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    await window.api.storage.delete(this.path, id)
  }

  async query(options): Promise<StObject[]> {
    if (!this.path) {
      throw new Error("Storage not initialized")
    }
    const res = await window.api.storage.query(this.path, options)
    return res.map(stObjectFromRaw)
  }
}
