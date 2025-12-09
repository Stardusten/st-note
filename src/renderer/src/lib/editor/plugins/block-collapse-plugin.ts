import { Plugin, PluginKey } from "prosemirror-state"
import { Node as PMNode } from "prosemirror-model"
import { isBlockNode, BlockAttrs } from "../schema"

export const blockCollapsePluginKey = new PluginKey("blockCollapse")

export function createBlockCollapsePlugin(): Plugin {
  return new Plugin({
    key: blockCollapsePluginKey,
    props: {
      handleDOMEvents: {
        mousedown(view, event) {
          const target = event.target as HTMLElement
          if (!target.classList.contains("block-collapse-toggle")) return false

          const blockDom = target.closest(".block")
          if (!blockDom) return false

          const pos = view.posAtDOM(blockDom, 0)
          if (pos === undefined) return false

          const $pos = view.state.doc.resolve(pos)
          let blockNode: PMNode | null = null
          let blockPos = -1

          for (let d = $pos.depth; d >= 0; d--) {
            const node = $pos.node(d)
            if (isBlockNode(node)) {
              blockNode = node
              blockPos = $pos.before(d)
              break
            }
          }

          if (!blockNode || blockPos < 0) return false
          if (blockNode.childCount < 2) return false

          event.preventDefault()
          event.stopPropagation()

          const attrs = blockNode.attrs as BlockAttrs
          view.dispatch(
            view.state.tr.setNodeMarkup(blockPos, undefined, {
              ...attrs,
              collapsed: !attrs.collapsed
            })
          )

          return true
        }
      }
    }
  })
}
