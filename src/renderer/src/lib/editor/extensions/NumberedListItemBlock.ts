import { Node, mergeAttributes } from "@tiptap/core"
import { InputRule } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export type NumberedListItemBlockOptions = {
  maxIndent: number
  indentSize: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    numberedListItemBlock: {
      setNumberedListItem: () => ReturnType
      toggleNumberedListItem: () => ReturnType
    }
  }
}

const calculateListIndex = (
  doc: any,
  pos: number,
  indent: number
): number => {
  let index = 1
  const resolvedPos = doc.resolve(pos)

  for (let i = resolvedPos.index(0) - 1; i >= 0; i--) {
    const prevNode = resolvedPos.node(0).child(i)
    if (prevNode.type.name !== "numberedListItem") break
    const prevIndent = prevNode.attrs.indent || 0
    if (prevIndent < indent) break
    if (prevIndent === indent) index++
  }

  return index
}

const numberedListIndexPlugin = new Plugin({
  key: new PluginKey("numberedListIndex"),
  props: {
    decorations(state) {
      const decorations: Decoration[] = []
      const { doc } = state

      doc.descendants((node, pos) => {
        if (node.type.name === "numberedListItem") {
          const indent = node.attrs.indent || 0
          const index = calculateListIndex(doc, pos, indent)
          const widget = document.createElement("span")
          widget.className = "bn-list-index"
          widget.textContent = `${index}.`
          decorations.push(Decoration.widget(pos + 1, widget, { side: -1 }))
        }
      })

      return DecorationSet.create(doc, decorations)
    }
  }
})

export const NumberedListItemBlock = Node.create<NumberedListItemBlockOptions>({
  name: "numberedListItem",
  group: "block",
  content: "inline*",

  addOptions() {
    return {
      maxIndent: 10,
      indentSize: 24
    }
  },

  addAttributes() {
    return {
      indent: {
        default: 0,
        parseHTML: (element) => {
          const indent = element.getAttribute("data-indent")
          return indent ? parseInt(indent, 10) : 0
        },
        renderHTML: (attributes) => {
          if (!attributes.indent) return { "data-indent": 0 }
          return { "data-indent": attributes.indent }
        }
      }
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="numberedListItem"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "numberedListItem",
        class: "bn-numbered-list-item"
      }),
      0
    ]
  },

  addCommands() {
    return {
      setNumberedListItem:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
      toggleNumberedListItem:
        () =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            const indent = editor.getAttributes(this.name).indent || 0
            return commands.setNode("paragraph", { indent })
          }
          return commands.setNode(this.name)
        }
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^(\d+)\.\s$/,
        handler: ({ state, range, chain }) => {
          const indent = state.doc.resolve(range.from).parent.attrs.indent || 0
          chain()
            .deleteRange(range)
            .setNode(this.name, { indent })
            .run()
        }
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-7": () => this.editor.commands.toggleNumberedListItem(),
      Enter: () => {
        if (!this.editor.isActive(this.name)) return false
        const { state } = this.editor
        const { $from, empty } = state.selection
        if (!empty) return false

        const indent = $from.parent.attrs.indent || 0
        if ($from.parent.content.size === 0) {
          return this.editor.commands.setNode("paragraph", { indent })
        }

        return this.editor.chain().splitBlock().setNode(this.name, { indent }).run()
      },
      Backspace: () => {
        if (!this.editor.isActive(this.name)) return false
        const { state } = this.editor
        const { $from, empty } = state.selection
        if (!empty || $from.parentOffset !== 0) return false
        const indent = $from.parent.attrs.indent || 0
        return this.editor.commands.setNode("paragraph", { indent })
      }
    }
  },

  addProseMirrorPlugins() {
    return [numberedListIndexPlugin]
  }
})
