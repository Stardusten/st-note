import { Node, mergeAttributes } from "@tiptap/core"
import { InputRule } from "@tiptap/core"

export type BulletListItemBlockOptions = {
  maxIndent: number
  indentSize: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bulletListItemBlock: {
      setBulletListItem: () => ReturnType
      toggleBulletListItem: () => ReturnType
    }
  }
}

export const BulletListItemBlock = Node.create<BulletListItemBlockOptions>({
  name: "bulletListItem",
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
    return [{ tag: 'div[data-type="bulletListItem"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "bulletListItem",
        class: "bn-bullet-list-item"
      }),
      0
    ]
  },

  addCommands() {
    return {
      setBulletListItem:
        () =>
        ({ commands }) =>
          commands.setNode(this.name),
      toggleBulletListItem:
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
        find: /^[-*+]\s$/,
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
      "Mod-Shift-8": () => this.editor.commands.toggleBulletListItem(),
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
  }
})
