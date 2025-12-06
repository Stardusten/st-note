import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { EditorView } from "@tiptap/pm/view"

export type CardSuggestionItem = {
  id: string
  title: string
}

export type CardRefSuggestionOptions = {
  suggestion: {
    items: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
    render: () => {
      onStart: (props: SuggestionProps) => void
      onUpdate: (props: SuggestionProps) => void
      onExit: () => void
      onKeyDown: (event: KeyboardEvent) => boolean
    }
  }
}

export type SuggestionProps = {
  query: string
  items: CardSuggestionItem[]
  command: (item: CardSuggestionItem) => void
  clientRect: (() => DOMRect | null) | null
}

const TRIGGER_PATTERNS = ["[[", "【【"]

export const CardRefSuggestion = Extension.create<CardRefSuggestionOptions>({
  name: "cardRefSuggestion",

  addOptions() {
    return {
      suggestion: {
        items: () => [],
        render: () => ({
          onStart: () => {},
          onUpdate: () => {},
          onExit: () => {},
          onKeyDown: () => false
        })
      }
    }
  },

  addProseMirrorPlugins() {
    const { suggestion } = this.options

    return [
      new Plugin({
        key: new PluginKey("cardRefSuggestion"),
        state: {
          init() {
            return {
              active: false,
              query: "",
              triggerStart: 0,
              triggerPattern: ""
            }
          },
          apply(tr, prev) {
            const meta = tr.getMeta("cardRefSuggestion")
            if (meta) return meta
            if (tr.docChanged) {
              return {
                active: false,
                query: "",
                triggerStart: 0,
                triggerPattern: ""
              }
            }
            return prev
          }
        },
        view() {
          const renderer = suggestion.render()
          return {
            update: async (view: EditorView) => {
              const { state } = view
              const { selection } = state
              const { $from, empty } = selection

              if (!empty) {
                renderer.onExit()
                return
              }

              const textBefore = $from.parent.textBetween(
                Math.max(0, $from.parentOffset - 50),
                $from.parentOffset
              )

              // console.log("[CardRefSuggestion] textBefore:", JSON.stringify(textBefore))

              let triggerMatch: { pattern: string; index: number } | null = null
              for (const pattern of TRIGGER_PATTERNS) {
                const idx = textBefore.lastIndexOf(pattern)
                // console.log("[CardRefSuggestion] checking pattern:", pattern, "idx:", idx)
                if (idx !== -1) {
                  const afterTrigger = textBefore.slice(idx + pattern.length)
                  // console.log("[CardRefSuggestion] afterTrigger:", JSON.stringify(afterTrigger))
                  if (!afterTrigger.includes("]") && !afterTrigger.includes("】")) {
                    if (!triggerMatch || idx > triggerMatch.index) {
                      triggerMatch = { pattern, index: idx }
                    }
                  }
                }
              }

              // console.log("[CardRefSuggestion] triggerMatch:", triggerMatch)

              if (!triggerMatch) {
                renderer.onExit()
                return
              }

              const query = textBefore.slice(triggerMatch.index + triggerMatch.pattern.length)
              const items = await suggestion.items(query)

              // console.log("[CardRefSuggestion] query:", JSON.stringify(query), "items:", items.length)

              const triggerStart =
                $from.pos -
                $from.parentOffset +
                Math.max(0, $from.parentOffset - 50) +
                triggerMatch.index

              const props: SuggestionProps = {
                query,
                items,
                command: (item: CardSuggestionItem) => {
                  const { state, dispatch } = view
                  const { tr } = state

                  const endPattern = triggerMatch!.pattern === "[[" ? "]]" : "】】"
                  const textAfter = $from.parent.textBetween(
                    $from.parentOffset,
                    $from.parent.nodeSize - 2
                  )
                  let deleteEnd = $from.pos
                  if (textAfter.startsWith(endPattern.charAt(0))) {
                    deleteEnd += textAfter.startsWith(endPattern) ? endPattern.length : 1
                  }

                  tr.delete(triggerStart, deleteEnd)
                  tr.insert(
                    triggerStart,
                    state.schema.nodes.cardRef.create({
                      cardId: item.id
                    })
                  )
                  dispatch(tr)
                  renderer.onExit()
                },
                clientRect: () => {
                  const coords = view.coordsAtPos(triggerStart)
                  return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
                }
              }

              if (items.length > 0 || query.length > 0 || triggerMatch) {
                // console.log("[CardRefSuggestion] showing popup")
                renderer.onUpdate(props)
              } else {
                // console.log("[CardRefSuggestion] hiding popup - no items and empty query")
                renderer.onExit()
              }
            },
            destroy() {
              renderer.onExit()
            }
          }
        },
        props: {
          handleKeyDown(_view, event) {
            const renderer = suggestion.render()
            return renderer.onKeyDown(event)
          }
        }
      })
    ]
  }
})
