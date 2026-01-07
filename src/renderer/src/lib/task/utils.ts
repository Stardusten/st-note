import type { TaskEntry } from "./types"

/**
 * Get task display title from TaskEntry.
 * Priority: description > extracted from rawText > fallback
 *
 * @param task - The task entry
 * @param fallback - Fallback title if no description found (e.g., card title)
 * @returns The display title
 */
export function getTaskTitle(task: TaskEntry, fallback = "Task"): string {
  // 1. Use inline description if available
  if (task.description) return task.description

  // 2. Try to extract from rawText
  // Format examples:
  //   [2026-01-06 09:46]@ meeting with John
  //   [2026-01-06]+ buy groceries
  //   [2026-01-06 to 2026-01-10]~ exercise
  const extracted = extractDescriptionFromRawText(task.rawText)
  if (extracted) return extracted

  // 3. Fallback
  return fallback
}

/**
 * Extract description text from task rawText.
 * Handles various formats:
 *   [date]@ description
 *   [date time]! description
 *   [date to date]~N description
 *   [date]~NxM description
 * 
 * Task markers:
 *   @ + ! - . are standalone symbols
 *   ~ must be followed by digits (and optional xN)
 */
function extractDescriptionFromRawText(rawText: string): string | null {
  // Pattern: ] followed by task marker, then optional whitespace, then description
  // Task markers:
  //   - Single symbols: @ + ! - .
  //   - Defer format: ~N or ~NxM (where N and M are digits)
  const match = rawText.match(/\](?:~\d+(?:x\d+)?|[@+!\-.])(?:\s+(.+))?$/)
  if (match && match[1]) {
    return match[1].trim()
  }
  return null
}
