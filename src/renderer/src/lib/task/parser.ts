import { parse } from "date-fns"
import type { TaskEntry, TaskType } from "./types"
import type { StObjectId } from "@renderer/lib/common/storage-types"

const TIMESTAMP_DATETIME = "yyyy-MM-dd HH:mm"
const TIMESTAMP_DATE = "yyyy-MM-dd"

const DATETIME_PATTERN = "\\d{4}-\\d{2}-\\d{2} \\d{2}:\\d{2}"
const DATE_PATTERN = "\\d{4}-\\d{2}-\\d{2}"
const TIMESTAMP_PATTERN = `(?:${DATETIME_PATTERN}|${DATE_PATTERN})`

const TASK_SUFFIX_PATTERN = /^(\+\d+|!|@|-|\.)$/
const TASK_SUFFIX_CAPTURE = "(\\+\\d+|!|@|-|\\.)"

const TASK_REGEX = new RegExp(`\\[(${TIMESTAMP_PATTERN})\\]${TASK_SUFFIX_CAPTURE}`, "g")
const TIMESTAMP_ONLY_REGEX = new RegExp(`\\[${TIMESTAMP_PATTERN}\\]`, "g")

export function createTaskRegex(): RegExp {
  return new RegExp(TASK_REGEX.source, "g")
}

export function createTimestampOnlyRegex(): RegExp {
  return new RegExp(TIMESTAMP_ONLY_REGEX.source, "g")
}

function parseTaskSuffix(suffix: string): { type: TaskType; reminderDays?: number } {
  if (suffix.startsWith("+")) {
    const days = parseInt(suffix.slice(1), 10)
    return { type: "reminder", reminderDays: days }
  }
  switch (suffix) {
    case "!": return { type: "deadline" }
    case "@": return { type: "scheduled" }
    case "-": return { type: "done" }
    case ".": return { type: "memo" }
    default: return { type: "memo" }
  }
}

export function parseTimestamp(text: string): Date | null {
  const now = new Date()

  if (text.includes(" ")) {
    try {
      const parsed = parse(text, TIMESTAMP_DATETIME, now)
      if (!isNaN(parsed.getTime())) return parsed
    } catch {}
  }

  try {
    const parsed = parse(text, TIMESTAMP_DATE, now)
    if (!isNaN(parsed.getTime())) return parsed
  } catch {}

  return null
}

export type ParsedTask = {
  pos: number
  length: number
  timestamp: Date
  type: TaskType
  reminderDays?: number
  rawText: string
}

export function extractTasksFromText(text: string, basePos: number): ParsedTask[] {
  const regex = createTaskRegex()
  const tasks: ParsedTask[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, timestampText, suffix] = match
    const timestamp = parseTimestamp(timestampText)
    if (!timestamp) continue

    const { type, reminderDays } = parseTaskSuffix(suffix)
    tasks.push({
      pos: basePos + match.index,
      length: fullMatch.length,
      timestamp,
      type,
      reminderDays,
      rawText: fullMatch
    })
  }

  return tasks
}

export function extractTasksFromContent(content: any, cardId: StObjectId): TaskEntry[] {
  if (!content) return []

  const tasks: TaskEntry[] = []

  function traverse(node: any, pos: number) {
    if (!node) return

    if (node.type === "text" && node.text) {
      const parsed = extractTasksFromText(node.text, pos)
      for (const p of parsed) {
        tasks.push({
          cardId,
          pos: p.pos,
          timestamp: p.timestamp,
          type: p.type,
          reminderDays: p.reminderDays,
          rawText: p.rawText
        })
      }
    }

    if (node.content && Array.isArray(node.content)) {
      let offset = node.type === "doc" ? 0 : 1
      for (const child of node.content) {
        traverse(child, pos + offset)
        offset += nodeSize(child)
      }
    }
  }

  traverse(content, 0)
  return tasks
}

function nodeSize(node: any): number {
  if (!node) return 0
  if (node.type === "text") return node.text?.length || 0
  if (!node.content || !Array.isArray(node.content)) return 2

  let size = 2
  for (const child of node.content) {
    size += nodeSize(child)
  }
  return size
}

export function isTaskSuffix(s: string): boolean {
  return TASK_SUFFIX_PATTERN.test(s)
}

export function getEffectiveDate(task: TaskEntry): Date {
  if (task.type === "reminder" && task.reminderDays) {
    const d = new Date(task.timestamp)
    d.setDate(d.getDate() + task.reminderDays)
    return d
  }
  return task.timestamp
}

export function isTaskVisible(task: TaskEntry, rangeStart: Date, rangeEnd: Date): boolean {
  if (task.type === "done") return false

  const ts = task.timestamp
  const effective = getEffectiveDate(task)

  if (task.type === "reminder") {
    return ts <= rangeEnd && effective >= rangeStart
  }

  return ts >= rangeStart && ts <= rangeEnd
}
