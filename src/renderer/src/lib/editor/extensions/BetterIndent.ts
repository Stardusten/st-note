import { Extension } from "@tiptap/core"

export type IndentOptions = {
  types: string[]
  minLevel: number
  maxLevel: number
  indentSize: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

export const BetterIndent = Extension.create<IndentOptions>({
  name: "indent",

  addOptions() {
    return {
      types: ["paragraph", "heading", "bulletListItem", "numberedListItem"],
      minLevel: 0,
      maxLevel: 10,
      indentSize: 24
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indent = element.getAttribute("data-indent")
              return indent ? parseInt(indent, 10) : 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {}
              return { "data-indent": attributes.indent }
            }
          }
        }
      }
    ]
  },

  addCommands() {
    return {
      indent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0
              if (currentIndent < this.options.maxLevel) {
                if (dispatch) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: currentIndent + 1
                  })
                }
                changed = true
              }
            }
          })

          return changed
        },
      outdent:
        () =>
        ({ tr, state, dispatch }) => {
          const { selection } = state
          let changed = false

          tr.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
            if (this.options.types.includes(node.type.name)) {
              const currentIndent = node.attrs.indent || 0
              if (currentIndent > this.options.minLevel) {
                if (dispatch) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: currentIndent - 1
                  })
                }
                changed = true
              }
            }
          })

          return changed
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      "Shift-Tab": () => this.editor.commands.outdent()
    }
  }
})
