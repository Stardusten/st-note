import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"

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
    this.dom.className = "card-ref"
    this.dom.setAttribute("data-type", "card-ref")
    this.dom.setAttribute("data-card-id", node.attrs.cardId || "")
    this.dom.contentEditable = "false"

    this.updateTitle()

    this.dom.addEventListener("click", (e) => {
      e.preventDefault()
      e.stopPropagation()
      const cardId = this.node.attrs.cardId
      if (cardId && this.options.onCardClick) this.options.onCardClick(cardId)
    })
  }

  private updateTitle() {
    const cardId = this.node.attrs.cardId
    if (this.options.getTitle && cardId) {
      this.dom.textContent = this.options.getTitle(cardId)
    } else {
      this.dom.textContent = "Untitled"
    }
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    this.dom.setAttribute("data-card-id", node.attrs.cardId || "")
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
