import { Node, mergeAttributes } from "@tiptap/core"
import { InputRule } from "@tiptap/core"
import { Transaction } from "@tiptap/pm/state"

export type BulletListItemBlockOptions = {
  maxIndent: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bulletListItemBlock: {
      setBulletListItem: () => ReturnType
      toggleBulletListItem: () => ReturnType
    }
  }
}

const splitBlockKeepType = (tr: Transaction, pos: number): boolean => {
  const $pos = tr.doc.resolve(pos)
  const parent = $pos.parent
  const type = parent.type
  const attrs = { ...parent.attrs }

  tr.split(pos, 1, [{ type, attrs }])
  return true
}

export const BulletListItemBlock = Node.create<BulletListItemBlockOptions>({
  name: "bulletListItem",
  group: "block",
  content: "inline*",

  addOptions() {
    return { maxIndent: 10 }
  },

  addAttributes() {
    return {
      indent: {
        default: 0,
        parseHTML: (el) => parseInt(el.getAttribute("data-indent") || "0", 10),
        renderHTML: (attrs) => ({ "data-indent": attrs.indent || 0 })
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
          chain().deleteRange(range).setNode(this.name, { indent }).run()
        }
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-8": () => this.editor.commands.toggleBulletListItem(),
      Enter: ({ editor }) => {
        if (!editor.isActive(this.name)) return false

        const { state, view } = editor
        const { selection } = state
        const { $from, empty } = selection

        if (!empty) return false

        const indent = $from.parent.attrs.indent || 0

        if ($from.parent.content.size === 0) {
          return editor.commands.setNode("paragraph", { indent })
        }

        const tr = state.tr
        tr.deleteSelection()
        splitBlockKeepType(tr, tr.selection.from)
        view.dispatch(tr)
        return true
      },
      Backspace: ({ editor }) => {
        if (!editor.isActive(this.name)) return false

        const { state } = editor
        const { $from, empty } = state.selection

        if (!empty || $from.parentOffset !== 0) return false

        const indent = $from.parent.attrs.indent || 0
        return editor.commands.setNode("paragraph", { indent })
      }
    }
  }
})
