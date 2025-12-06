import { Node, mergeAttributes } from "@tiptap/core"
import type { Accessor } from "solid-js"

export type CardRefOptions = {
  HTMLAttributes: Record<string, any>
  onCardClick?: (cardId: string) => void
  getTitle?: (cardId: string) => Accessor<string>
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cardRef: {
      insertCardRef: (attrs: { cardId: string }) => ReturnType
    }
  }
}

export const CardRef = Node.create<CardRefOptions>({
  name: "cardRef",
  group: "inline",
  inline: true,
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      onCardClick: undefined,
      getTitle: undefined
    }
  },

  addAttributes() {
    return {
      cardId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-card-id"),
        renderHTML: (attributes) => ({ "data-card-id": attributes.cardId })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="card-ref"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "card-ref",
        class: "card-ref"
      }),
      ""
    ]
  },

  addCommands() {
    return {
      insertCardRef:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { cardId: attrs.cardId }
          })
        }
    }
  },

  addNodeView() {
    const options = this.options
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span")
      const attrs = mergeAttributes(options.HTMLAttributes, HTMLAttributes, {
        "data-type": "card-ref",
        class: "card-ref"
      })
      Object.entries(attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) dom.setAttribute(key, value)
      })

      const cardId = node.attrs.cardId
      const updateTitle = () => {
        if (options.getTitle && cardId) {
          dom.textContent = options.getTitle(cardId)()
        } else {
          dom.textContent = "Untitled"
        }
      }
      updateTitle()

      dom.style.cursor = "pointer"
      dom.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        if (cardId && options.onCardClick) options.onCardClick(cardId)
      })

      return { dom }
    }
  }
})
