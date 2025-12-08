import { InputRule } from "prosemirror-inputrules"
import { schema } from "../schema"

export const inlineCodeRule = new InputRule(
  /`([^`]+)`$/,
  (state, match, start, end) => {
    const text = match[1]
    const codeMark = schema.marks.code.create()
    return state.tr
      .delete(start, end)
      .insertText(text)
      .addMark(start, start + text.length, codeMark)
      .removeStoredMark(codeMark)
  }
)
