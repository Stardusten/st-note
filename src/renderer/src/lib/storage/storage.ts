import {
  CreateParamsRaw,
  QueryOptionsRaw,
  StObjectId,
  StObjectRaw,
  UpdateParamsRaw
} from "src/preload"
import { CreateParams, QueryOptions, StObject, UpdateParams } from "../common/types"

export type Storage = {
  init: (path: string) => Promise<void>
  close: () => Promise<void>
  getPath: () => string | null
  insert: (object: CreateParams) => Promise<StObject>
  fetch: (id: StObjectId) => Promise<StObject | null>
  update: (params: UpdateParams) => Promise<void>
  delete: (id: StObjectId) => Promise<void>
  query: (options?: QueryOptions) => Promise<StObject[]>
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

export function createParamsToRaw(from: CreateParams): CreateParamsRaw {
  return {
    id: from.id,
    type: from.type,
    data: JSON.stringify(from.data)
  }
}

export function updateParamsToRaw(from: UpdateParams): UpdateParamsRaw {
  return createParamsToRaw(from)
}

export function queryOptionsToRaw(opt: QueryOptions): QueryOptionsRaw {
  return opt
}

export function stObjectFromRaw(raw: StObjectRaw): StObject {
  return {
    id: raw.id,
    type: raw.type,
    data: JSON.parse(raw.data),
    updatedAt: new Date(raw.updated_at),
    createdAt: new Date(raw.created_at),
    deletedAt: raw.deleted_at === 0 ? null : new Date(raw.deleted_at)
  }
}

export function stObjectToRaw(obj: StObject): StObjectRaw {
  return {
    id: obj.id,
    type: obj.type,
    data: JSON.stringify(obj.data),
    updated_at: obj.updatedAt.getTime(),
    created_at: obj.createdAt.getTime(),
    deleted_at: obj.deletedAt === null ? 0 : obj.deletedAt.getTime()
  }
}
