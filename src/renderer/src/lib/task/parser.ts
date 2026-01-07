import { parse, differenceInDays } from "date-fns"
import type { TaskEntry, TaskType, CompletionRecord } from "./types"
import type { StObjectId } from "@renderer/lib/common/storage-types"

const TIMESTAMP_DATETIME = "yyyy-MM-dd HH:mm"
const TIMESTAMP_DATE = "yyyy-MM-dd"

/**
 * Unified timestamp pattern supporting:
 * - Single: [2025-01-05] or [2025-01-05 14:30]
 * - Range:  [2025-01-05 to 2025-01-10]
 *           [2025-01-05 14:30 to 16:00]        (same day, time only end)
 *           [2025-01-05 14:30 to 2025-01-10 16:00]
 *           [2025-01-05 to 2025-01-10 16:00]   (date to datetime)
 *
 * Single regex for performance - captures:
 * Group 1: Full timestamp content inside brackets
 * Group 2: Task suffix (@, +, !, -, ~N, .)
 */
const DATE_PART = "\\d{4}-\\d{2}-\\d{2}"
const TIME_PART = "\\d{2}:\\d{2}"
const DATETIME_PART = `${DATE_PART}(?: ${TIME_PART})?`
// Range end can be: full datetime, date only, or time only (for same-day ranges)
const RANGE_END = `(?:${DATE_PART}(?: ${TIME_PART})?|${TIME_PART})`
const TIMESTAMP_CONTENT = `(${DATETIME_PART}(?:\\s+to\\s+${RANGE_END})?)`

/**
 * Task suffix patterns:
 * @ - schedule (specific date event)
 * + - todo (float up from date)
 * ! - deadline (float up before date)
 * - - reminder (sink after date)
 * ~N - defer (periodic, N days cycle, 1 completion per cycle)
 * ~NxM - defer (periodic, N days cycle, M completions per cycle)
 * . - done
 */
const TASK_SUFFIX_PATTERN = /^(@|\+|!|-|~\d+(x\d+)?|\.)$/
const TASK_SUFFIX_CAPTURE = "(@|\\+|!|-|~\\d+(?:x\\d+)?|\\.)"

const TASK_REGEX = new RegExp(`\\[${TIMESTAMP_CONTENT}\\]${TASK_SUFFIX_CAPTURE}`, "g")
const TIMESTAMP_ONLY_REGEX = new RegExp(`\\[${DATETIME_PART}(?:\\s+to\\s+${RANGE_END})?\\]`, "g")

export function createTaskRegex(): RegExp {
  return new RegExp(TASK_REGEX.source, "g")
}

export function createTimestampOnlyRegex(): RegExp {
  return new RegExp(TIMESTAMP_ONLY_REGEX.source, "g")
}

function parseTaskSuffix(suffix: string): { type: TaskType; cycleDays?: number; cycleTarget?: number } {
  if (suffix.startsWith("~")) {
    // Parse ~N or ~NxM format
    const match = suffix.match(/^~(\d+)(?:x(\d+))?$/)
    if (match) {
      const days = parseInt(match[1], 10)
      const target = match[2] ? parseInt(match[2], 10) : 1
      return {
        type: "defer",
        cycleDays: days > 0 ? days : 30,
        cycleTarget: target > 0 ? target : 1
      }
    }
    return { type: "defer", cycleDays: 30, cycleTarget: 1 }
  }
  switch (suffix) {
    case "@":
      return { type: "schedule" }
    case "+":
      return { type: "todo" }
    case "!":
      return { type: "deadline" }
    case "-":
      return { type: "reminder" }
    case ".":
      return { type: "done" }
    default:
      return { type: "done" }
  }
}

export function parseTimestamp(text: string): Date | null {
  const now = new Date()

  if (text.includes(" ")) {
    try {
      const parsed = parse(text, TIMESTAMP_DATETIME, now)
      if (!isNaN(parsed.getTime())) return parsed
    } catch {
      /* ignore */
    }
  }

  try {
    const parsed = parse(text, TIMESTAMP_DATE, now)
    if (!isNaN(parsed.getTime())) return parsed
  } catch {
    /* ignore */
  }

  return null
}

/**
 * Parse timestamp content which may be single or range format.
 * Returns { start, end? } where end is only present for ranges.
 */
export function parseTimestampContent(content: string): { start: Date; end?: Date } | null {
  const now = new Date()

  // Check for range format: "start to end"
  const toIndex = content.indexOf(" to ")
  if (toIndex !== -1) {
    const startPart = content.slice(0, toIndex).trim()
    const endPart = content.slice(toIndex + 4).trim()

    const start = parseTimestamp(startPart)
    if (!start) return null

    // End part can be:
    // 1. Full datetime: "2025-01-10 16:00"
    // 2. Date only: "2025-01-10"
    // 3. Time only: "16:00" (same day as start)
    let end: Date | null = null

    if (/^\d{2}:\d{2}$/.test(endPart)) {
      // Time only - use start date
      try {
        end = parse(endPart, "HH:mm", start)
      } catch {
        /* ignore */
      }
    } else {
      end = parseTimestamp(endPart)
    }

    if (!end) return null
    return { start, end }
  }

  // Single timestamp
  const start = parseTimestamp(content)
  if (!start) return null
  return { start }
}

export type ParsedTask = {
  pos: number
  length: number
  timestamp: Date
  endTimestamp?: Date
  type: TaskType
  cycleDays?: number
  cycleTarget?: number
  description?: string
  rawText: string
}

export function extractTasksFromText(text: string, basePos: number): ParsedTask[] {
  const regex = createTaskRegex()
  const tasks: ParsedTask[] = []
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const [fullMatch, timestampContent, suffix] = match
    const parsed = parseTimestampContent(timestampContent)
    if (!parsed) continue

    const { type, cycleDays, cycleTarget } = parseTaskSuffix(suffix)

    // Extract description: text after the task marker until end of line
    const afterMatch = text.slice(match.index + fullMatch.length)
    const lineEnd = afterMatch.indexOf("\n")
    const restOfLine = lineEnd === -1 ? afterMatch : afterMatch.slice(0, lineEnd)
    const description = restOfLine.trim() || undefined

    tasks.push({
      pos: basePos + match.index,
      length: fullMatch.length,
      timestamp: parsed.start,
      endTimestamp: parsed.end,
      type,
      cycleDays,
      cycleTarget,
      description,
      rawText: fullMatch
    })
  }

  return tasks
}

export function extractTasksFromContent(content: any, cardId: StObjectId): TaskEntry[] {
  if (!content) return []

  const tasks: TaskEntry[] = []

  /**
   * Extract completion records from child block nodes of a defer task.
   * Only looks at immediate children that are 'done' type tasks.
   */
  function extractCompletionsFromChildren(blockNode: any): CompletionRecord[] {
    const completions: CompletionRecord[] = []
    if (!blockNode.content || !Array.isArray(blockNode.content)) return completions

    for (const child of blockNode.content) {
      // Only look at nested block nodes (children)
      if (child.type !== "block") continue

      // Get text content from the first paragraph of this child block
      const paragraph = child.content?.find((n: any) => n.type === "paragraph")
      if (!paragraph?.content) continue

      const textNode = paragraph.content.find((n: any) => n.type === "text")
      if (!textNode?.text) continue

      // Parse tasks from this text
      const childTasks = extractTasksFromText(textNode.text, 0)
      for (const ct of childTasks) {
        if (ct.type === "done") {
          completions.push({
            date: ct.timestamp,
            note: ct.description
          })
        }
      }
    }

    // Sort by date descending (most recent first)
    completions.sort((a, b) => b.date.getTime() - a.date.getTime())
    return completions
  }

  function traverse(node: any, pos: number, parentBlock?: any) {
    if (!node) return

    if (node.type === "text" && node.text) {
      const parsed = extractTasksFromText(node.text, pos)
      for (const p of parsed) {
        const entry: TaskEntry = {
          cardId,
          pos: p.pos,
          timestamp: p.timestamp,
          endTimestamp: p.endTimestamp,
          type: p.type,
          cycleDays: p.cycleDays,
          cycleTarget: p.cycleTarget,
          description: p.description,
          rawText: p.rawText
        }

        // For defer tasks, extract completion records from sibling blocks
        if (p.type === "defer" && parentBlock) {
          const completions = extractCompletionsFromChildren(parentBlock)
          if (completions.length > 0) {
            entry.completions = completions
          }
        }

        tasks.push(entry)
      }
    }

    if (node.content && Array.isArray(node.content)) {
      let offset = node.type === "doc" ? 0 : 1
      for (const child of node.content) {
        // Pass the current block as parent if this is a block node
        const nextParent = node.type === "block" ? node : parentBlock
        traverse(child, pos + offset, nextParent)
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

/**
 * Get the number of days between task date and today.
 * Positive = future, Negative = past
 */
export function getDaysDiff(task: TaskEntry, today: Date): number {
  const taskDate = new Date(task.timestamp.getFullYear(), task.timestamp.getMonth(), task.timestamp.getDate())
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return differenceInDays(taskDate, todayDate)
}

/**
 * Get the number of days between task end date and today.
 * Returns null if no end date. Positive = future, Negative = past
 */
export function getEndDaysDiff(task: TaskEntry, today: Date): number | null {
  if (!task.endTimestamp) return null
  const endDate = new Date(task.endTimestamp.getFullYear(), task.endTimestamp.getMonth(), task.endTimestamp.getDate())
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return differenceInDays(endDate, todayDate)
}

/**
 * Check if today is within the task's date range (inclusive).
 */
function isWithinRange(task: TaskEntry, today: Date): boolean {
  const startDiff = getDaysDiff(task, today)
  const endDiff = getEndDaysDiff(task, today)
  if (endDiff === null) return startDiff === 0 // Single date: exact match
  return startDiff <= 0 && endDiff >= 0 // Range: today is between start and end
}

/**
 * Get the start date of the current cycle for a defer task.
 * Returns the date when the current cycle began.
 */
export function getCurrentCycleStart(task: TaskEntry, today: Date): Date {
  const cycleDays = task.cycleDays || 30
  const taskDate = new Date(task.timestamp.getFullYear(), task.timestamp.getMonth(), task.timestamp.getDate())
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysSinceStart = differenceInDays(todayDate, taskDate)

  if (daysSinceStart < 0) return taskDate // Task hasn't started yet

  const cycleNumber = Math.floor(daysSinceStart / cycleDays)
  const cycleStartDate = new Date(taskDate)
  cycleStartDate.setDate(cycleStartDate.getDate() + cycleNumber * cycleDays)
  return cycleStartDate
}

/**
 * Get the number of completions in the current cycle for a defer task.
 */
export function getCurrentCycleCompletions(task: TaskEntry, today: Date): number {
  if (task.type !== "defer" || !task.completions?.length) return 0

  const cycleStart = getCurrentCycleStart(task, today)
  const cycleStartTime = cycleStart.getTime()

  // Count completions within the current cycle
  return task.completions.filter((c) => {
    const completionDate = new Date(c.date.getFullYear(), c.date.getMonth(), c.date.getDate())
    return completionDate.getTime() >= cycleStartTime
  }).length
}

/**
 * Check if the current cycle of a defer task is completed.
 * A cycle is completed if the number of completions >= cycleTarget.
 */
export function isCurrentCycleCompleted(task: TaskEntry, today: Date): boolean {
  if (task.type !== "defer") return false

  const target = task.cycleTarget || 1
  const completions = getCurrentCycleCompletions(task, today)
  return completions >= target
}

/**
 * Check if a task is visible based on howm rules.
 * For range tasks, visibility is extended to cover the entire range.
 */
export function isTaskVisible(task: TaskEntry, today: Date): boolean {
  const daysDiff = getDaysDiff(task, today)
  const endDaysDiff = getEndDaysDiff(task, today)

  switch (task.type) {
    case "schedule":
      // Visible during the entire date range
      return isWithinRange(task, today)

    case "todo":
      // Visible from start date onwards (end date doesn't affect visibility)
      return daysDiff <= 0

    case "deadline":
      // Visible until the deadline (use end date if range, otherwise start)
      return true // Always show deadlines, mark overdue separately

    case "reminder":
      // Visible after start date, sink after 30 days from end date (or start if no end)
      const effectiveEnd = endDaysDiff ?? daysDiff
      return daysDiff <= 0 && effectiveEnd >= -30

    case "defer": {
      // Periodic visibility based on cycle (from start date)
      if (daysDiff > 0) return false

      // If current cycle is completed, hide the task
      if (isCurrentCycleCompleted(task, today)) return false

      const cycleDays = task.cycleDays || 30
      const daysSinceStart = -daysDiff
      const positionInCycle = daysSinceStart % cycleDays
      return positionInCycle < 3
    }

    case "done":
      return false

    default:
      return false
  }
}

/**
 * Calculate task priority for sorting (higher = more urgent/important).
 * Based on howm's floating mechanism.
 * For range tasks, uses the most relevant date for priority calculation.
 */
export function getTaskPriority(task: TaskEntry, today: Date): number {
  const daysDiff = getDaysDiff(task, today)
  const endDaysDiff = getEndDaysDiff(task, today)

  switch (task.type) {
    case "schedule":
      // High priority during the range
      if (isWithinRange(task, today)) return 1000
      return -Infinity

    case "todo":
      // Float up: the longer since start date, the higher priority
      if (daysDiff > 0) return -Infinity
      return -daysDiff

    case "deadline":
      // Use end date for deadline if range, otherwise start date
      const deadlineDiff = endDaysDiff ?? daysDiff
      if (deadlineDiff < 0) return 500 + (-deadlineDiff) // Overdue
      if (deadlineDiff === 0) return 400 // Due today
      if (deadlineDiff <= 7) return 300 - deadlineDiff // Within a week
      return 100 - deadlineDiff

    case "reminder":
      // Sink: priority decreases as days pass from end date
      if (daysDiff > 0) return -Infinity
      const sinkDiff = endDaysDiff ?? daysDiff
      return 50 + sinkDiff

    case "defer":
      // Priority based on position in cycle
      if (daysDiff > 0) return -Infinity
      const cycleDays = task.cycleDays || 30
      const daysSinceStart = -daysDiff
      const positionInCycle = daysSinceStart % cycleDays
      if (positionInCycle < 3) {
        return 60 - positionInCycle * 10
      }
      return -Infinity

    case "done":
      return -Infinity

    default:
      return -Infinity
  }
}
