import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { settingsStore } from "../../settings/SettingsStore"
import { createTaskRegex, createTimestampOnlyRegex } from "../../task/parser"

export const timestampHighlightPluginKey = new PluginKey("timestampHighlight")

const TASK_TYPE_CLASSES: Record<string, string> = {
  "+": "task-reminder",
  "!": "task-deadline",
  "@": "task-scheduled",
  "-": "task-done",
  ".": "task-memo"
}

function getTaskClass(suffix: string): string {
  if (suffix.startsWith("+")) return TASK_TYPE_CLASSES["+"]
  return TASK_TYPE_CLASSES[suffix] || "task-memo"
}

export function createTimestampHighlightPlugin(): Plugin {
  let cachedFormat = ""
  let cachedTaskRegex: RegExp | null = null
  let cachedTimestampRegex: RegExp | null = null

  return new Plugin({
    key: timestampHighlightPluginKey,
    props: {
      decorations(state) {
        const fmt = settingsStore.getTimestampFormat()
        if (!fmt.trim()) return DecorationSet.empty

        if (fmt !== cachedFormat) {
          cachedFormat = fmt
          try {
            cachedTaskRegex = createTaskRegex(fmt)
            cachedTimestampRegex = createTimestampOnlyRegex(fmt)
          } catch {
            cachedTaskRegex = null
            cachedTimestampRegex = null
          }
        }

        if (!cachedTaskRegex || !cachedTimestampRegex) return DecorationSet.empty

        const decorations: Decoration[] = []
        const taskRegex = new RegExp(cachedTaskRegex.source, "g")
        const timestampRegex = new RegExp(cachedTimestampRegex.source, "g")

        const taskPositions = new Set<string>()

        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return

          let match: RegExpExecArray | null
          while ((match = taskRegex.exec(node.text)) !== null) {
            const start = pos + match.index
            const end = start + match[0].length
            const suffix = match[2]

            taskPositions.add(`${start}-${end}`)
            decorations.push(
              Decoration.inline(start, end, {
                class: `task-highlight ${getTaskClass(suffix)}`
              })
            )
          }
        })

        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return

          let match: RegExpExecArray | null
          while ((match = timestampRegex.exec(node.text)) !== null) {
            const start = pos + match.index
            const end = start + match[0].length

            const isPartOfTask = Array.from(taskPositions).some((range) => {
              const [tStart, tEnd] = range.split("-").map(Number)
              return start >= tStart && end <= tEnd
            })

            if (!isPartOfTask) {
              decorations.push(
                Decoration.inline(start, end, {
                  class: "timestamp-highlight"
                })
              )
            }
          }
        })

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
