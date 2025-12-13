import { InputRule } from "prosemirror-inputrules"
import { TextSelection, Transaction } from "prosemirror-state"
import { isBlockNode, schema } from "../schema"

const LANGUAGE_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "shell",
  yml: "yaml",
  md: "markdown",
  cs: "csharp",
  rs: "rust",
  kt: "kotlin"
}

function resolveLanguage(input: string | undefined): string {
  if (!input) return "javascript"
  const lower = input.toLowerCase()
  return LANGUAGE_ALIASES[lower] || lower
}

export const codeBlockRule = new InputRule(
  /^(```|···|、、、)(\w+)?\s$/,
  (state, match, _start, _end): Transaction | null => {
    const language = resolveLanguage(match[2])
    const $from = state.selection.$from

    const blockNode = $from.node(-1)
    if (!isBlockNode(blockNode)) return null

    const paragraph = $from.parent
    if (paragraph.type !== schema.nodes.paragraph) return null

    const blockPos = $from.before(-1)
    const codeBlock = schema.nodes.code_block.create({ language })
    const newBlock = schema.nodes.block.create({ kind: "paragraph" }, codeBlock)

    let tr = state.tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, newBlock)
    const codeBlockInsidePos = blockPos + 2
    tr = tr.setSelection(TextSelection.create(tr.doc, codeBlockInsidePos))

    return tr
  }
)
