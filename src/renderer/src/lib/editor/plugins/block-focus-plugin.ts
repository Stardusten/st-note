import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { isBlockNode } from "../schema"

export const blockFocusPluginKey = new PluginKey("blockFocus")

export function createBlockFocusPlugin(): Plugin {
  return new Plugin({
    key: blockFocusPluginKey,
    props: {
      decorations(state) {
        const { $head } = state.selection
        const decorations: Decoration[] = []

        for (let d = $head.depth; d >= 1; d--) {
          const node = $head.node(d)
          if (isBlockNode(node)) {
            const pos = $head.before(d)
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, { class: "has-focus" })
            )
            break
          }
        }

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
