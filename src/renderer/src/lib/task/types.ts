import type { StObjectId } from "@renderer/lib/common/storage-types"

export type TaskType = "reminder" | "deadline" | "scheduled" | "done" | "memo"

export type TaskEntry = {
  cardId: StObjectId
  pos: number
  timestamp: Date
  type: TaskType
  reminderDays?: number
  rawText: string
}

export type TaskLocation = {
  cardId: StObjectId
  pos: number
}
