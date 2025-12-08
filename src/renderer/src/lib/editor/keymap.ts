import { keymap } from "prosemirror-keymap"
import { Plugin, TextSelection } from "prosemirror-state"
import { Command } from "prosemirror-state"
import {
  chainCommands,
  deleteSelection,
  joinTextblockBackward,
  joinTextblockForward,
  selectNodeBackward,
  selectNodeForward,
  toggleMark,
  exitCode
} from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { inputRules } from "prosemirror-inputrules"
import { splitBlock, joinBlockUp } from "./split"
import { indent } from "./indent"
import { dedent } from "./dedent"
import { blockInputRules } from "./inputrules"
import { schema } from "./schema"

export const CODE_INDENT = "  "

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

const enterCommand = chainCommands(codeBlockEnter, splitBlock)

const backspaceCommand = chainCommands(
  deleteSelection,
  joinBlockUp,
  joinTextblockBackward,
  selectNodeBackward
)

const deleteCommand = chainCommands(
  deleteSelection,
  joinTextblockForward,
  selectNodeForward
)

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
    const newBlock = schema.nodes.block.create({ kind: "paragraph" }, schema.nodes.paragraph.create())
    const tr = state.tr.insert(insertPos, newBlock)
    dispatch(tr.setSelection(TextSelection.create(tr.doc, insertPos + 2)).scrollIntoView())
  }
  return true
}

export function buildKeymap(): Plugin {
  return keymap({
    "Enter": enterCommand,
    "Backspace": backspaceCommand,
    "Delete": deleteCommand,
    "Mod-[": dedent,
    "Mod-]": indent,
    "Tab": tabCommand,
    "Shift-Tab": dedent,
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
    "Mod-b": toggleMark(schema.marks.bold),
    "Mod-i": toggleMark(schema.marks.italic),
    "Mod-`": toggleMark(schema.marks.code),
    "Mod-a": selectAllInBlock,
    "ArrowDown": exitCodeBlockDown,
    "Mod-Enter": exitCode
  })
}

export function buildInputRules(): Plugin {
  return inputRules({ rules: blockInputRules })
}
