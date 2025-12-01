import { StObjectId } from "src/preload"
import type { Storage } from "./storage"
import { CreateParams, QueryOptions, StObject, UpdateParams } from "../common/types"

export class MockStorage implements Storage {
  private items: Map<StObjectId, StObject> = new Map()

  async init(_path: string): Promise<void> {
    this.items.clear()
  }

  async close(): Promise<void> {
    this.items.clear()
  }

  async insert(object: CreateParams): Promise<StObject> {
    const now = new Date()
    const newObject: StObject = {
      ...object,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
    }
    this.items.set(object.id, newObject)
    return newObject
  }

  async fetch(id: StObjectId): Promise<StObject | null> {
    const item = this.items.get(id)
    if (!item || item.deletedAt !== null) {
      return null
    }
    return item
  }

  async update(params: UpdateParams): Promise<void> {
    const item = this.items.get(params.id)
    if (!item) throw new Error(`Object with id ${params.id} not found`)
    if (item.deletedAt !== null)
      throw new Error(
        `Object with id ${params.id} is deleted, update a deleted object is not allowed`
      )

    const now = new Date()
    const updatedObject: StObject = {
      ...item,
      ...params,
      updatedAt: now
    }
    this.items.set(params.id, updatedObject)
  }

  async delete(id: StObjectId): Promise<void> {
    const item = this.items.get(id)
    if (!item) {
      throw new Error(`Object with id ${id} not found`)
    }
    item.deletedAt = new Date()
  }

  async query(options?: QueryOptions): Promise<StObject[]> {
    let results = Array.from(this.items.values())

    if (!options?.includeDeleted) {
      results = results.filter((item) => item.deletedAt === null)
    }

    if (options?.type) {
      results = results.filter((item) => item.type === options.type)
    }

    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())

    if (options?.offset) {
      results = results.slice(options.offset)
    }

    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }
}
