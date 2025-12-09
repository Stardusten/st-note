import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { schema, BlockAttrs } from "../schema"

export const collapsedIndicatorPluginKey = new PluginKey("collapsedIndicator")

function createIndicatorWidget(): HTMLElement {
  const el = document.createElement("span")
  el.className = "block-collapsed-indicator"
  el.textContent = "..."
  return el
}

export function createCollapsedIndicatorPlugin(): Plugin {
  return new Plugin({
    key: collapsedIndicatorPluginKey,
    props: {
      decorations(state) {
        const decorations: Decoration[] = []

        state.doc.descendants((node, pos) => {
          if (node.type !== schema.nodes.block) return

          const attrs = node.attrs as BlockAttrs
          if (!attrs.collapsed) return

          const firstChild = node.firstChild
          if (!firstChild) return

          if (firstChild.type === schema.nodes.paragraph) {
            const paragraphEnd = pos + 1 + firstChild.nodeSize - 1
            decorations.push(
              Decoration.widget(paragraphEnd, createIndicatorWidget, { side: 1 })
            )
          } else if (firstChild.type === schema.nodes.code_block) {
            const codeBlockEnd = pos + 1 + firstChild.nodeSize - 1
            decorations.push(
              Decoration.widget(codeBlockEnd, createIndicatorWidget, { side: 1 })
            )
          }
        })

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
