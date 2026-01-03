import { keymap } from "prosemirror-keymap"
import { Plugin, TextSelection, NodeSelection } from "prosemirror-state"
import { Command } from "prosemirror-state"
import {
  chainCommands,
  deleteSelection,
  joinTextblockBackward,
  joinTextblockForward,
  selectNodeBackward,
  selectNodeForward,
  toggleMark
} from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { inputRules } from "prosemirror-inputrules"
import { format } from "date-fns"
import { splitBlock, joinBlockUp } from "./commands/split"
import { indent } from "./commands/indent"
import { dedent } from "./commands/dedent"
import { toggleCollapse } from "./commands/collapse"
import { atTextblockStart } from "./commands/utils"
import { bulletListRule, orderedListRule, quoteRule } from "./input-rules/wrapping-block"
import { codeBlockRule } from "./input-rules/code-block"
import { inlineCodeRule } from "./input-rules/inline-code"
import { schema, isBlockNode, type BlockKind } from "./schema"

export const CODE_INDENT = "  "

const insertTimestamp: Command = (state, dispatch) => {
  const timestamp = `[${format(new Date(), "yyyy-MM-dd HH:mm")}]`
  if (dispatch) dispatch(state.tr.insertText(timestamp))
  return true
}

const insertCodeIndent: Command = (state, dispatch) => {
  const { $head } = state.selection
  if ($head.parent.type !== schema.nodes.code_block) return false
  if (dispatch) dispatch(state.tr.insertText(CODE_INDENT))
  return true
}

const codeBlockEnter: Command = (state, dispatch) => {
  const { $head } = state.selection
  if ($head.parent.type !== schema.nodes.code_block) return false

  if (dispatch) {
    const text = $head.parent.textContent
    const pos = $head.parentOffset
    const textBefore = text.slice(0, pos)
    const lastLineStart = textBefore.lastIndexOf("\n") + 1
    const lastLine = textBefore.slice(lastLineStart)
    const indentMatch = lastLine.match(/^[\t ]*/)
    const indent = indentMatch ? indentMatch[0] : ""
    dispatch(state.tr.insertText("\n" + indent))
  }
  return true
}

const selectAllInBlock: Command = (state, dispatch) => {
  const { $head } = state.selection

  if ($head.parent.type === schema.nodes.title) {
    if (dispatch) {
      const start = $head.start()
      const end = $head.end()
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)))
    }
    return true
  }

  if ($head.parent.type === schema.nodes.code_block) {
    if (dispatch) {
      const start = $head.start()
      const end = $head.end()
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)))
    }
    return true
  }

  if ($head.parent.type === schema.nodes.paragraph) {
    if (dispatch) {
      const start = $head.start()
      const end = $head.end()
      dispatch(state.tr.setSelection(TextSelection.create(state.doc, start, end)))
    }
    return true
  }

  return false
}

const deleteSelectionPreserveTitle: Command = (state, dispatch) => {
  const { $from, $to, empty } = state.selection
  if (empty) return false

  const fromInTitle = $from.parent.type === schema.nodes.title
  const toInTitle = $to.parent.type === schema.nodes.title

  if (fromInTitle && toInTitle) {
    if (dispatch) {
      dispatch(state.tr.deleteSelection().scrollIntoView())
    }
    return true
  }

  if (fromInTitle && !toInTitle) {
    if (dispatch) {
      const titleEnd = $from.end()
      const tr = state.tr
      tr.delete($from.pos, titleEnd)
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  return deleteSelection(state, dispatch)
}

const removeCheckboxOnEmpty: Command = (state, dispatch) => {
  const $cursor = atTextblockStart(state)
  if (!$cursor) return false
  if ($cursor.parent.type !== schema.nodes.paragraph) return false
  if ($cursor.parent.content.size !== 0) return false

  const blockDepth = $cursor.depth - 1
  if (blockDepth < 1) return false

  const block = $cursor.node(blockDepth)
  if (!isBlockNode(block)) return false
  if (block.attrs.checked === null) return false

  if (dispatch) {
    const blockPos = $cursor.before(blockDepth)
    const tr = state.tr.setNodeMarkup(blockPos, undefined, {
      ...block.attrs,
      checked: null
    })
    dispatch(tr)
  }
  return true
}

const convertBlockToParagraph: Command = (state, dispatch) => {
  const $cursor = atTextblockStart(state)
  if (!$cursor) return false

  if ($cursor.parent.type !== schema.nodes.paragraph) return false

  const blockDepth = $cursor.depth - 1
  if (blockDepth < 1) return false

  const block = $cursor.node(blockDepth)
  if (!isBlockNode(block)) return false

  const kind = block.attrs.kind as BlockKind
  if (kind === "paragraph") return false

  if ($cursor.index(blockDepth) !== 0) return false

  if (dispatch) {
    const blockPos = $cursor.before(blockDepth)
    const tr = state.tr.setNodeMarkup(blockPos, undefined, {
      ...block.attrs,
      kind: "paragraph",
      order: null
    })
    dispatch(tr)
  }
  return true
}

const exitImageNode: Command = (state, dispatch) => {
  const sel = state.selection
  if (!(sel instanceof NodeSelection)) return false
  if (sel.node.type !== schema.nodes.image) return false

  const $pos = state.doc.resolve(sel.from)
  const blockDepth = $pos.depth
  if (blockDepth < 1) return false

  const parentBlock = $pos.node(blockDepth)
  if (!isBlockNode(parentBlock)) return false

  if (dispatch) {
    const insertPos = $pos.after(blockDepth)
    const newBlock = schema.nodes.block.create(
      { kind: "paragraph" },
      schema.nodes.paragraph.create()
    )
    const tr = state.tr.insert(insertPos, newBlock)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView())
  }
  return true
}

const imageArrowDown: Command = (state, dispatch) => {
  const sel = state.selection
  if (!(sel instanceof NodeSelection)) return false
  if (sel.node.type !== schema.nodes.image) return false

  const $pos = state.doc.resolve(sel.from)
  const blockDepth = $pos.depth
  if (blockDepth < 1) return false

  const parent = $pos.node(blockDepth - 1)
  const indexInParent = $pos.index(blockDepth - 1)
  const isLastChild = indexInParent === parent.childCount - 1

  if (!isLastChild) return false

  if (dispatch) {
    const insertPos = $pos.after(blockDepth)
    const newBlock = schema.nodes.block.create(
      { kind: "paragraph" },
      schema.nodes.paragraph.create()
    )
    const tr = state.tr.insert(insertPos, newBlock)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView())
  }
  return true
}

const imageArrowUp: Command = (state, dispatch) => {
  const sel = state.selection
  if (!(sel instanceof NodeSelection)) return false
  if (sel.node.type !== schema.nodes.image) return false

  const $pos = state.doc.resolve(sel.from)
  const blockDepth = $pos.depth
  if (blockDepth < 1) return false

  const indexInParent = $pos.index(blockDepth - 1)
  const isFirstChild = indexInParent === 0

  if (!isFirstChild) return false

  if (dispatch) {
    const insertPos = $pos.before(blockDepth)
    const newBlock = schema.nodes.block.create(
      { kind: "paragraph" },
      schema.nodes.paragraph.create()
    )
    const tr = state.tr.insert(insertPos, newBlock)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView())
  }
  return true
}

const enterCommand = chainCommands(exitImageNode, codeBlockEnter, splitBlock)

const insertHardBreak: Command = (state, dispatch) => {
  if (dispatch) dispatch(state.tr.replaceSelectionWith(schema.nodes.hard_break.create()).scrollIntoView())
  return true
}

const backspaceCommand = chainCommands(
  deleteSelectionPreserveTitle,
  removeCheckboxOnEmpty,
  convertBlockToParagraph,
  joinBlockUp,
  joinTextblockBackward,
  selectNodeBackward
)

const deleteCommand = chainCommands(deleteSelectionPreserveTitle, joinTextblockForward, selectNodeForward)

const tabCommand = chainCommands(insertCodeIndent, indent)

const exitCodeBlockDown: Command = (state, dispatch) => {
  const { $head, empty } = state.selection
  if (!empty) return false

  const node = $head.parent
  if (node.type !== schema.nodes.code_block) return false

  const atEnd = $head.parentOffset === node.content.size
  if (!atEnd) return false

  const grandParent = $head.node(-2)
  const indexInGrandParent = $head.index(-2)
  const isLastBlockInParent = indexInGrandParent === grandParent.childCount - 1

  if (!isLastBlockInParent) return false

  if (dispatch) {
    const insertPos = $head.after(-1)
    const newBlock = schema.nodes.block.create(
      { kind: "paragraph" },
      schema.nodes.paragraph.create()
    )
    const tr = state.tr.insert(insertPos, newBlock)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView())
  }
  return true
}

const toggleCheckbox: Command = (state, dispatch) => {
  const { $head } = state.selection

  for (let d = $head.depth; d >= 1; d--) {
    const node = $head.node(d)
    if (!isBlockNode(node)) continue

    const pos = $head.before(d)
    const currentChecked = node.attrs.checked
    // cycle: null -> false -> true -> null
    const newChecked = currentChecked === null ? false : currentChecked === false ? true : null

    if (dispatch) {
      const tr = state.tr.setNodeMarkup(pos, undefined, {
        ...node.attrs,
        checked: newChecked
      })
      dispatch(tr)
    }
    return true
  }
  return false
}

export function buildKeymap(): Plugin {
  return keymap({
    Enter: enterCommand,
    "Shift-Enter": insertHardBreak,
    Backspace: backspaceCommand,
    Delete: deleteCommand,
    "Mod-[": dedent,
    "Mod-]": indent,
    Tab: tabCommand,
    "Shift-Tab": dedent,
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
    "Mod-b": toggleMark(schema.marks.bold),
    "Mod-i": toggleMark(schema.marks.italic),
    "Mod-`": toggleMark(schema.marks.code),
    "Mod-a": selectAllInBlock,
    "Mod-.": toggleCollapse,
    "Mod-t": insertTimestamp,
    "Mod-Enter": toggleCheckbox,
    ArrowDown: chainCommands(imageArrowDown, exitCodeBlockDown),
    ArrowUp: imageArrowUp
  })
}

export function buildInputRules(): Plugin {
  return inputRules({ rules: [bulletListRule, orderedListRule, quoteRule, codeBlockRule, inlineCodeRule] })
}
