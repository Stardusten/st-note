import { Plugin, PluginKey } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { schema } from "../schema"

export type CardSuggestionItem = {
  id: string
  title: string
}

export type SuggestionProps = {
  query: string
  command: (item: CardSuggestionItem) => void
  clientRect: (() => DOMRect | null) | null
}

export type SuggestionRenderer = {
  onStart: (props: SuggestionProps) => void
  onUpdate: (props: SuggestionProps) => void
  onExit: () => void
  onKeyDown: (event: KeyboardEvent) => boolean
}

export type CardRefSuggestionOptions = {
  items: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  render: () => SuggestionRenderer
}

type CompletionStatus = {
  from: number
  to: number
  query: string
  trigger: "[[" | "【【"
}

function checkCompletionStatus(view: EditorView): CompletionStatus | null {
  const { state } = view
  const { selection } = state
  const { $from } = selection

  if (!selection.empty || !$from.parent.isTextblock) return null

  const textBefore = $from.parent.textBetween(0, $from.parentOffset)
  const match = textBefore.match(/(\[\[|【【)([^\]】]*)$/)

  if (!match) return null

  return {
    from: $from.pos - match[0].length,
    to: $from.pos,
    query: match[2] || "",
    trigger: match[1] as "[[" | "【【"
  }
}

export function createCardRefSuggestionPlugin(options: CardRefSuggestionOptions): Plugin {
  const pluginKey = new PluginKey("cardRefSuggestion")
  let renderer: SuggestionRenderer | null = null
  let isComposing = false

  const createProps = (view: EditorView, status: CompletionStatus): SuggestionProps => {
    const { from, query } = status
    return {
      query,
      command: (item: CardSuggestionItem) => {
        const { state, dispatch } = view

        const currentStatus = checkCompletionStatus(view)
        if (!currentStatus) return

        const endPattern = currentStatus.trigger === "[[" ? "]]" : "】】"
        const { $from } = state.selection
        const textAfter = $from.parent.textBetween(
          $from.parentOffset,
          $from.parent.nodeSize - 2
        )

        let deleteEnd = currentStatus.to
        if (textAfter.startsWith(endPattern)) {
          deleteEnd += endPattern.length
        } else if (textAfter.startsWith(endPattern.charAt(0))) {
          deleteEnd += 1
        }

        const cardRefNode = schema.nodes.cardRef.create({ cardId: item.id })
        const tr = state.tr.replaceWith(currentStatus.from, deleteEnd, cardRefNode)
        dispatch(tr)
        renderer?.onExit()
      },
      clientRect: () => {
        const coords = view.coordsAtPos(from)
        return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
      }
    }
  }

  return new Plugin({
    key: pluginKey,
    view(view) {
      renderer = options.render()

      const handleCompositionStart = () => {
        isComposing = true
      }

      const handleCompositionEnd = () => {
        isComposing = false
        const status = checkCompletionStatus(view)
        if (status) {
          renderer?.onUpdate(createProps(view, status))
        } else {
          renderer?.onExit()
        }
      }

      view.dom.addEventListener("compositionstart", handleCompositionStart)
      view.dom.addEventListener("compositionend", handleCompositionEnd)

      return {
        update: async (view: EditorView) => {
          if (!renderer || isComposing) return

          const status = checkCompletionStatus(view)
          if (!status) {
            renderer.onExit()
            return
          }

          renderer.onUpdate(createProps(view, status))
        },
        destroy() {
          view.dom.removeEventListener("compositionstart", handleCompositionStart)
          view.dom.removeEventListener("compositionend", handleCompositionEnd)
          renderer?.onExit()
        }
      }
    },
    props: {
      handleKeyDown(_view, event) {
        if (!renderer || isComposing) return false
        return renderer.onKeyDown(event)
      }
    }
  })
}
