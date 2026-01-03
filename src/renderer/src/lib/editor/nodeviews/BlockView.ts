import { Node as PMNode } from "prosemirror-model"
import { NodeView, EditorView } from "prosemirror-view"
import type { BlockAttrs } from "../schema"

export function createBlockNodeView(
  node: PMNode,
  view: EditorView,
  getPos: () => number | undefined
): NodeView {
  let prevNode = node
  const prevNested = node.firstChild?.type === node.type
  const prevSingleChild = node.childCount === 1
  const attrs = node.attrs as BlockAttrs

  const dom = document.createElement("div")
  dom.className = "block"
  dom.setAttribute("data-kind", attrs.kind)
  if (attrs.order != null) {
    dom.setAttribute("data-order", String(attrs.order))
    dom.style.setProperty("--block-order", String(attrs.order))
  }
  if (attrs.collapsed) dom.setAttribute("data-collapsed", "true")
  if (node.childCount >= 2) dom.setAttribute("data-collapsable", "true")
  if (attrs.checked !== null) dom.setAttribute("data-checked", String(attrs.checked))
  if (node.firstChild?.type === node.type) dom.setAttribute("data-marker-hidden", "true")

  const collapseToggle = document.createElement("div")
  collapseToggle.className = "block-collapse-toggle"
  collapseToggle.contentEditable = "false"
  dom.appendChild(collapseToggle)

  let checkboxEl: HTMLElement | null = null
  if (attrs.checked !== null) {
    checkboxEl = document.createElement("span")
    checkboxEl.className = "block-checkbox"
    checkboxEl.contentEditable = "false"
    checkboxEl.setAttribute("data-checked", String(attrs.checked))
    dom.appendChild(checkboxEl)

    checkboxEl.addEventListener("mousedown", (e) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (pos === undefined) return
      const currentNode = view.state.doc.nodeAt(pos)
      if (!currentNode) return
      const currentChecked = currentNode.attrs.checked
      const tr = view.state.tr.setNodeMarkup(pos, undefined, {
        ...currentNode.attrs,
        checked: !currentChecked
      })
      view.dispatch(tr)
    })
  }

  const contentDOM = document.createElement("div")
  contentDOM.className = "block-content"
  dom.appendChild(contentDOM)

  const update = (newNode: PMNode): boolean => {
    if (newNode.type !== prevNode.type) return false

    const prevAttrs = prevNode.attrs as BlockAttrs
    const newAttrs = newNode.attrs as BlockAttrs

    if (prevAttrs.kind !== newAttrs.kind) return false
    if (prevAttrs.order !== newAttrs.order) return false
    if (prevAttrs.collapsed !== newAttrs.collapsed) return false
    if ((prevAttrs.checked === null) !== (newAttrs.checked === null)) return false

    const nested = newNode.firstChild?.type === newNode.type
    const singleChild = newNode.childCount === 1
    if (prevNested !== nested || prevSingleChild !== singleChild) return false

    if (checkboxEl && newAttrs.checked !== null) {
      checkboxEl.setAttribute("data-checked", String(newAttrs.checked))
      dom.setAttribute("data-checked", String(newAttrs.checked))
    }

    prevNode = newNode
    return true
  }

  return { dom, contentDOM, update }
}
