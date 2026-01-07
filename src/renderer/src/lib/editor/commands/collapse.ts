import { Command, TextSelection } from "prosemirror-state"
import { isBlockNode } from "../schema"

export const toggleCollapse: Command = (state, dispatch) => {
  const { $head } = state.selection as TextSelection

  for (let d = $head.depth; d >= 1; d--) {
    const node = $head.node(d)
    if (isBlockNode(node)) {
      const pos = $head.before(d)
      const collapsed = node.attrs.collapsed
      if (dispatch) {
        dispatch(state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          collapsed: !collapsed
        }))
      }
      return true
    }
  }

  return false
}

export const collapseBlock: Command = (state, dispatch) => {
  const { $head } = state.selection as TextSelection

  for (let d = $head.depth; d >= 1; d--) {
    const node = $head.node(d)
    if (isBlockNode(node)) {
      if (node.attrs.collapsed) return false // Already collapsed
      const pos = $head.before(d)
      if (dispatch) {
        dispatch(state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          collapsed: true
        }))
      }
      return true
    }
  }

  return false
}

export const expandBlock: Command = (state, dispatch) => {
  const { $head } = state.selection as TextSelection

  for (let d = $head.depth; d >= 1; d--) {
    const node = $head.node(d)
    if (isBlockNode(node)) {
      if (!node.attrs.collapsed) return false // Already expanded
      const pos = $head.before(d)
      if (dispatch) {
        dispatch(state.tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          collapsed: false
        }))
      }
      return true
    }
  }

  return false
}
