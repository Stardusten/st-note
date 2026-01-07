import type { StObjectId } from "@renderer/lib/common/storage-types"

/**
 * Task types following howm convention:
 * - schedule: [date]@ - 特定日期事件，仅当天显示
 * - todo:     [date]+ - 从该日期开始浮起，越久优先级越高
 * - deadline: [date]! - 截止日期，越近优先级越高
 * - reminder: [date]- - 该日期后逐渐下沉消失
 * - defer:    [date]~N - 周期性浮沉，N天为一个周期
 * - done:     [date]. - 已完成，不显示
 */
export type TaskType = "schedule" | "todo" | "deadline" | "reminder" | "defer" | "done"

/**
 * Task type configuration - single source of truth for colors, labels, symbols
 */
export const TASK_CONFIG: Record<
  TaskType,
  { symbol: string; label: string; color: string; cssClass: string }
> = {
  schedule: { symbol: "@", label: "Schedule", color: "#48bb78", cssClass: "task-schedule" },
  todo: { symbol: "+", label: "Todo", color: "#ed8936", cssClass: "task-todo" },
  deadline: { symbol: "!", label: "Deadline", color: "#f56565", cssClass: "task-deadline" },
  reminder: { symbol: "-", label: "Reminder", color: "#38b2ac", cssClass: "task-reminder" },
  defer: { symbol: "~", label: "Defer", color: "#4299e1", cssClass: "task-defer" },
  done: { symbol: ".", label: "Done", color: "#718096", cssClass: "task-done" }
}

/** Map from suffix symbol to task type */
export const SYMBOL_TO_TYPE: Record<string, TaskType> = {
  "@": "schedule",
  "+": "todo",
  "!": "deadline",
  "-": "reminder",
  "~": "defer",
  ".": "done"
}

/**
 * Completion record for recurring (defer) tasks.
 * Each record represents one check-in with optional note.
 */
export type CompletionRecord = {
  date: Date
  note?: string
}

export type TaskEntry = {
  cardId: StObjectId
  pos: number
  timestamp: Date
  /** End timestamp for range tasks (e.g., [2025-01-01 to 2025-01-05]@) */
  endTimestamp?: Date
  type: TaskType
  /** For defer type: cycle period in days */
  cycleDays?: number
  /** For defer type: target completions per cycle (default 1) */
  cycleTarget?: number
  /** Inline description after the task marker (same line) */
  description?: string
  rawText: string
  /**
   * For defer type: completion records from child done tasks.
   * Only populated for defer tasks with nested children.
   */
  completions?: CompletionRecord[]
}

export type TaskLocation = {
  cardId: StObjectId
  pos: number
}
