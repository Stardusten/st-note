import { type StObjectId } from "src/preload"

export type { StObjectId }

export type StObject = {
  id: StObjectId
  type: string
  data: any
  text: string
  tags: string[]
  updatedAt: Date
  createdAt: Date
  deletedAt: Date | null
}

export type CreateParams = Pick<StObject, "id" | "type" | "data" | "text" | "tags">
export type UpdateParams = CreateParams

export type QueryOptions = {
  type?: string
  includeDeleted?: boolean
  limit?: number
  offset?: number
}
