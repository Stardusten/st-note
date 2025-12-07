import { keymap } from "prosemirror-keymap"
import { Plugin } from "prosemirror-state"
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
import { splitBlock, joinBlockUp } from "./split"
import { indent } from "./indent"
import { dedent } from "./dedent"
import { blockInputRules } from "./inputrules"
import { schema } from "./schema"

const enterCommand = splitBlock

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

export function buildKeymap(): Plugin {
  return keymap({
    "Enter": enterCommand,
    "Backspace": backspaceCommand,
    "Delete": deleteCommand,
    "Mod-[": dedent,
    "Mod-]": indent,
    "Tab": indent,
    "Shift-Tab": dedent,
    "Mod-z": undo,
    "Mod-y": redo,
    "Mod-Shift-z": redo,
    "Mod-b": toggleMark(schema.marks.bold),
    "Mod-i": toggleMark(schema.marks.italic),
    "Mod-`": toggleMark(schema.marks.code)
  })
}

export function buildInputRules(): Plugin {
  return inputRules({ rules: blockInputRules })
}
