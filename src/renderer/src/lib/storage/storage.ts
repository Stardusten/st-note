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
  insert: (object: CreateParams) => Promise<StObject>
  fetch: (id: StObjectId) => Promise<StObject | null>
  update: (params: UpdateParams) => Promise<void>
  delete: (id: StObjectId) => Promise<void>
  query: (options?: QueryOptions) => Promise<StObject[]>
}

export function createParamsToRaw(from: CreateParams): CreateParamsRaw {
  return {
    id: from.id,
    type: from.type,
    data: JSON.stringify(from.data),
    text: from.text,
    tags: JSON.stringify(from.tags)
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
    text: raw.text,
    tags: JSON.parse(raw.tags),
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
    text: obj.text,
    tags: JSON.stringify(obj.tags),
    updated_at: obj.updatedAt.getTime(),
    created_at: obj.createdAt.getTime(),
    deleted_at: obj.deletedAt === null ? 0 : obj.deletedAt.getTime()
  }
}
