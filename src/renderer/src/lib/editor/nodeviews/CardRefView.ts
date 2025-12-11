import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"
import type { CardRefVariant } from "../schema"

export type CardRefOptions = {
  onCardClick?: (cardId: string) => void
  getTitle?: (cardId: string) => string
}

export class CardRefView implements NodeView {
  dom: HTMLElement

  constructor(
    private node: PMNode,
    _view: EditorView,
    _getPos: () => number | undefined,
    private options: CardRefOptions
  ) {
    this.dom = document.createElement("span")
    this.updateClassName()
    this.dom.setAttribute("data-type", "card-ref")
    this.dom.setAttribute("data-card-id", node.attrs.cardId || "")
    this.dom.setAttribute("data-variant", node.attrs.variant || "link")
    this.dom.contentEditable = "false"

    this.updateTitle()

    this.dom.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      const cardId = this.node.attrs.cardId
      if (cardId && this.options.onCardClick) this.options.onCardClick(cardId)
    })
  }

  private updateClassName() {
    const variant = this.node.attrs.variant as CardRefVariant
    this.dom.className = variant === "tag" ? "card-ref card-ref-tag" : "card-ref"
  }

  private updateTitle() {
    const cardId = this.node.attrs.cardId
    const variant = this.node.attrs.variant as CardRefVariant
    if (this.options.getTitle && cardId) {
      const title = this.options.getTitle(cardId)
      this.dom.textContent = variant === "tag" ? `#${title}` : title
    } else {
      this.dom.textContent = variant === "tag" ? "#Untitled" : "Untitled"
    }
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    this.dom.setAttribute("data-card-id", node.attrs.cardId || "")
    this.dom.setAttribute("data-variant", node.attrs.variant || "link")
    this.updateClassName()
    this.updateTitle()
    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(): boolean {
    return true
  }
}
