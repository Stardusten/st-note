import { Plugin } from "prosemirror-state"

/**
 * Max length of a task timestamp: [2025-01-05 14:30 to 2025-01-10 16:00]
 * = 1 + 16 + 4 + 16 + 1 = 38 chars, plus some buffer = 45
 */
const MAX_TIMESTAMP_LENGTH = 45

/**
 * Pattern to match task timestamp ending with Chinese bracket or punctuation.
 * Matches:
 * - 【...】。 or 【...】！ (full Chinese)
 * - [...]】。 or [...]】！ (mixed)
 * - 【...]。 or 【...]！ (mixed)
 * - [...]。 or [...]！ (only suffix is Chinese)
 */
const TIMESTAMP_CONTENT = "\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2})?(?:\\s+to\\s+(?:\\d{4}-\\d{2}-\\d{2}(?:\\s+\\d{2}:\\d{2})?|\\d{2}:\\d{2}))?"

// Pattern: timestamp with Chinese brackets and/or Chinese suffix
const CHINESE_TASK_PATTERN = new RegExp(
  `([【\\[])` +                    // Opening bracket (Chinese or English)
  `(${TIMESTAMP_CONTENT})` +      // Timestamp content
  `([】\\]])` +                    // Closing bracket (Chinese or English)
  `([。！]?)$`                     // Optional Chinese suffix at end
)

/**
 * Normalizes Chinese punctuation in task syntax to standard format.
 * Only converts when the text before cursor matches a valid task timestamp pattern.
 * Converts:
 * - 【...】。 → [...].
 * - 【...】！ → [...]!
 * - [...]。 → [...].
 * - [...]！ → [...]!
 */
export function createTaskNormalizePlugin(): Plugin {
  return new Plugin({
    props: {
      handleTextInput(view, from, to, text) {
        // Only handle when selection is empty (cursor)
        if (from !== to) return false

        // Only handle Chinese punctuation that could be task suffix
        if (text !== "。" && text !== "！") return false

        const { state } = view
        const $from = state.doc.resolve(from)

        // Get text before cursor (up to max timestamp length)
        const startOffset = Math.max(0, $from.parentOffset - MAX_TIMESTAMP_LENGTH)
        const textBefore = $from.parent.textBetween(startOffset, $from.parentOffset)

        // Check if it ends with a task timestamp pattern (with ] or 】)
        const match = textBefore.match(/[\]】]$/)
        if (!match) return false

        // Now check if the full pattern matches a valid timestamp
        const fullMatch = textBefore.match(CHINESE_TASK_PATTERN)
        if (!fullMatch) return false

        const [, openBracket, timestamp, closeBracket] = fullMatch
        const normalizedSuffix = text === "。" ? "." : "!"

        // Check if we need to normalize brackets too
        const needsOpenFix = openBracket === "【"
        const needsCloseFix = closeBracket === "】"

        if (!needsOpenFix && !needsCloseFix) {
          // Only suffix needs normalization
          view.dispatch(state.tr.insertText(normalizedSuffix, from, to))
          return true
        }

        // Need to replace the whole timestamp with normalized version
        const matchStart = $from.parentOffset - fullMatch[0].length + $from.start()
        const normalized = `[${timestamp}]${normalizedSuffix}`
        view.dispatch(state.tr.replaceWith(
          matchStart,
          from,
          state.schema.text(normalized)
        ).insertText("", matchStart + normalized.length))
        return true
      }
    }
  })
}
