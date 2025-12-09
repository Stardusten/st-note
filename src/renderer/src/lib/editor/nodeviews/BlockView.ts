import { Node as PMNode, DOMSerializer } from "prosemirror-model"
import { NodeView } from "prosemirror-view"

export function createBlockNodeView(node: PMNode): NodeView {
  let prevNode = node
  const prevNested = node.firstChild?.type === node.type
  const prevSingleChild = node.childCount === 1

  const spec = node.type.spec.toDOM!(node)
  const { dom, contentDOM } = DOMSerializer.renderSpec(document, spec)

  const update = (newNode: PMNode): boolean => {
    if (!newNode.sameMarkup(prevNode)) return false
    const nested = newNode.firstChild?.type === newNode.type
    const singleChild = newNode.childCount === 1
    if (prevNested !== nested || prevSingleChild !== singleChild) return false
    prevNode = newNode
    return true
  }

  return { dom, contentDOM, update }
}
