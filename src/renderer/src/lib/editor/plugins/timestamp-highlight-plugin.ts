import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { createTaskRegex, createTimestampOnlyRegex } from "../../task/parser"
import { TASK_CONFIG, SYMBOL_TO_TYPE } from "../../task/types"

export const timestampHighlightPluginKey = new PluginKey("timestampHighlight")

function getTaskClass(suffix: string): string {
  const symbol = suffix.startsWith("~") ? "~" : suffix
  const type = SYMBOL_TO_TYPE[symbol]
  return type ? TASK_CONFIG[type].cssClass : TASK_CONFIG.done.cssClass
}

export function createTimestampHighlightPlugin(): Plugin {
  const taskRegex = createTaskRegex()
  const timestampRegex = createTimestampOnlyRegex()

  return new Plugin({
    key: timestampHighlightPluginKey,
    props: {
      decorations(state) {
        const decorations: Decoration[] = []
        const taskPositions = new Set<string>()

        state.doc.descendants((node, pos) => {
          if (!node.isText || !node.text) return

          const regex = new RegExp(taskRegex.source, "g")
          let match: RegExpExecArray | null
          while ((match = regex.exec(node.text)) !== null) {
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

          const regex = new RegExp(timestampRegex.source, "g")
          let match: RegExpExecArray | null
          while ((match = regex.exec(node.text)) !== null) {
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
