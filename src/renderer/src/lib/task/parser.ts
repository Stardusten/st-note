import { parse } from "date-fns"
import type { TaskEntry, TaskType } from "./types"
import type { StObjectId } from "@renderer/lib/common/storage-types"

const FORMAT_TOKENS: [string, string][] = [
  ["yyyy", "\\d{4}"],
  ["yy", "\\d{2}"],
  ["MMMM", "[A-Za-z]+"],
  ["MMM", "[A-Za-z]{3}"],
  ["MM", "\\d{2}"],
  ["M", "\\d{1,2}"],
  ["dddd", "[A-Za-z]+"],
  ["ddd", "[A-Za-z]{3}"],
  ["dd", "\\d{2}"],
  ["d", "\\d{1,2}"],
  ["HH", "\\d{2}"],
  ["H", "\\d{1,2}"],
  ["hh", "\\d{2}"],
  ["h", "\\d{1,2}"],
  ["mm", "\\d{2}"],
  ["m", "\\d{1,2}"],
  ["ss", "\\d{2}"],
  ["s", "\\d{1,2}"],
  ["SSS", "\\d{3}"],
  ["SS", "\\d{2}"],
  ["S", "\\d{1}"],
  ["a", "[AaPp][Mm]"],
  ["EEEE", "[A-Za-z]+"],
  ["EEE", "[A-Za-z]{3}"],
  ["EE", "[A-Za-z]{2}"]
]

const TASK_SUFFIX_PATTERN = /^(\+\d+|!|@|-|\.)$/
const TASK_SUFFIX_CAPTURE = "(\\+\\d+|!|@|-|\\.)"

function formatToTimestampRegex(fmt: string): string {
  const placeholders: Map<string, string> = new Map()
  let pattern = fmt

  for (let i = 0; i < FORMAT_TOKENS.length; i++) {
    const [token, replacement] = FORMAT_TOKENS[i]
    const placeholder = `\x00${i}\x00`
    placeholders.set(placeholder, replacement)
    pattern = pattern.split(token).join(placeholder)
  }

  pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  for (const [placeholder, replacement] of placeholders) {
    pattern = pattern.split(placeholder).join(replacement)
  }

  return pattern
}

export function createTaskRegex(timestampFormat: string): RegExp {
  const tsPattern = formatToTimestampRegex(timestampFormat)
  return new RegExp(`\\[(${tsPattern})\\]${TASK_SUFFIX_CAPTURE}`, "g")
}

export function createTimestampOnlyRegex(timestampFormat: string): RegExp {
  const tsPattern = formatToTimestampRegex(timestampFormat)
  return new RegExp(`\\[${tsPattern}\\]`, "g")
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

export function parseTimestamp(text: string, format: string): Date | null {
  try {
    const now = new Date()
    let effectiveFormat = format
    let effectiveText = text

    if (!format.includes("yyyy") && !format.includes("yy")) {
      effectiveFormat = `yyyy-${format}`
      effectiveText = `${now.getFullYear()}-${text}`
    }

    const parsed = parse(effectiveText, effectiveFormat, now)
    if (isNaN(parsed.getTime())) return null
    return parsed
  } catch {
    return null
  }
}

export type ParsedTask = {
  pos: number
  length: number
  timestamp: Date
  type: TaskType
  reminderDays?: number
  rawText: string
}

export function extractTasksFromText(
  text: string,
  basePos: number,
  timestampFormat: string
): ParsedTask[] {
  const regex = createTaskRegex(timestampFormat)
  const tasks: ParsedTask[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, timestampText, suffix] = match
    const timestamp = parseTimestamp(timestampText, timestampFormat)
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

export function extractTasksFromContent(
  content: any,
  cardId: StObjectId,
  timestampFormat: string
): TaskEntry[] {
  if (!content) return []

  const tasks: TaskEntry[] = []

  function traverse(node: any, pos: number) {
    if (!node) return

    if (node.type === "text" && node.text) {
      const parsed = extractTasksFromText(node.text, pos, timestampFormat)
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
