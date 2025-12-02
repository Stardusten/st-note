import { Node, mergeAttributes } from "@tiptap/core"
import { InputRule } from "@tiptap/core"
import { Node as PmNode } from "@tiptap/pm/model"
import { Plugin, PluginKey, Transaction } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export type NumberedListItemBlockOptions = {
  maxIndent: number
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    numberedListItemBlock: {
      setNumberedListItem: () => ReturnType
      toggleNumberedListItem: () => ReturnType
    }
  }
}

const splitBlockKeepType = (tr: Transaction, pos: number): boolean => {
  const $pos = tr.doc.resolve(pos)
  const parent = $pos.parent
  const type = parent.type
  const attrs = { ...parent.attrs, start: undefined }
  tr.split(pos, 1, [{ type, attrs }])
  return true
}

const calculateIndices = (doc: PmNode): Map<number, number> => {
  const indices = new Map<number, number>()
  const counters: number[] = []
  let lastWasNumbered = false

  doc.descendants((node, pos) => {
    if (node.type.name === "numberedListItem") {
      const indent = node.attrs.indent || 0
      const start = node.attrs.start

      if (!lastWasNumbered) counters.length = 0

      while (counters.length <= indent) counters.push(0)
      if (counters.length > indent + 1) counters.length = indent + 1

      if (start !== undefined) {
        counters[indent] = start
      } else {
        counters[indent]++
      }

      indices.set(pos, counters[indent])
      lastWasNumbered = true
      return false
    } else if (node.isBlock && node.type.name !== "doc") {
      lastWasNumbered = false
      return false
    }
    return true
  })

  return indices
}

const createDecorations = (doc: PmNode): DecorationSet => {
  const decorations: Decoration[] = []
  const indices = calculateIndices(doc)

  indices.forEach((index, pos) => {
    const node = doc.nodeAt(pos)
    if (node) {
      decorations.push(
        Decoration.node(pos, pos + node.nodeSize, {
          "data-index": String(index)
        })
      )
    }
  })

  return DecorationSet.create(doc, decorations)
}

const numberedListIndexPlugin = new Plugin<DecorationSet>({
  key: new PluginKey("numberedListIndex"),

  state: {
    init(_, state) {
      return createDecorations(state.doc)
    },
    apply(tr, oldDecorations) {
      if (!tr.docChanged) {
        return oldDecorations.map(tr.mapping, tr.doc)
      }
      return createDecorations(tr.doc)
    }
  },

  props: {
    decorations(state) {
      return this.getState(state) ?? DecorationSet.empty
    }
  }
})

export const NumberedListItemBlock = Node.create<NumberedListItemBlockOptions>({
  name: "numberedListItem",
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
      },
      start: {
        default: undefined,
        parseHTML: (el) => {
          const start = el.getAttribute("data-start")
          return start ? parseInt(start, 10) : undefined
        },
        renderHTML: (attrs) => {
          if (!attrs.start) return {}
          return { "data-start": attrs.start }
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
        handler: ({ state, range, chain, match }) => {
          const indent = state.doc.resolve(range.from).parent.attrs.indent || 0
          const start = parseInt(match[1], 10)
          chain()
            .deleteRange(range)
            .setNode(this.name, { indent, start: start !== 1 ? start : undefined })
            .run()
        }
      })
    ]
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-7": () => this.editor.commands.toggleNumberedListItem(),
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
  },

  addProseMirrorPlugins() {
    return [numberedListIndexPlugin]
  }
})
