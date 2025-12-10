import { type StObjectId } from "src/preload"

export type { StObjectId }

export type StObject = {
  id: StObjectId
  type: string
  data: any
  updatedAt: Date
  createdAt: Date
  deletedAt: Date | null
}

export type CreateParams = Pick<StObject, "id" | "type" | "data">
export type UpdateParams = CreateParams

export type QueryOptions = {
  type?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}
