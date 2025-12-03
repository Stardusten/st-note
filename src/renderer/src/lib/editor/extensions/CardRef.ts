import { Node, mergeAttributes } from "@tiptap/core"

export type CardRefOptions = {
  HTMLAttributes: Record<string, any>
  onCardClick?: (cardId: string) => void
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cardRef: {
      insertCardRef: (attrs: { cardId: string; title: string }) => ReturnType
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
      onCardClick: undefined
    }
  },

  addAttributes() {
    return {
      cardId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-card-id"),
        renderHTML: (attributes) => ({ "data-card-id": attributes.cardId })
      },
      title: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-title"),
        renderHTML: (attributes) => ({ "data-title": attributes.title })
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="card-ref"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "card-ref",
        class: "card-ref"
      }),
      node.attrs.title || "Untitled"
    ]
  },

  addCommands() {
    return {
      insertCardRef:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs
          })
        }
    }
  },

  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const dom = document.createElement("span")
      const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "card-ref",
        class: "card-ref"
      })
      Object.entries(attrs).forEach(([key, value]) => {
        if (value !== undefined && value !== null) dom.setAttribute(key, value)
      })
      dom.textContent = node.attrs.title || "Untitled"
      dom.style.cursor = "pointer"

      dom.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        const cardId = node.attrs.cardId
        if (cardId && this.options.onCardClick) this.options.onCardClick(cardId)
      })

      return { dom }
    }
  }
})
