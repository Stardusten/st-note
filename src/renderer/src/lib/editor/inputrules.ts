import { InputRule } from "prosemirror-inputrules"
import { Attrs } from "prosemirror-model"
import { Transaction } from "prosemirror-state"
import { findWrapping } from "prosemirror-transform"
import { BlockAttrs, getBlockType, isBlockNode, schema } from "./schema"

type ListInputRuleAttributesGetter = (options: {
  match: RegExpMatchArray
  attributes?: BlockAttrs
}) => BlockAttrs

function wrappingBlockInputRule(
  regexp: RegExp,
  getAttrs: BlockAttrs | ListInputRuleAttributesGetter
): InputRule {
  return new InputRule(
    regexp,
    (state, match, start, end): Transaction | null => {
      const tr = state.tr
      tr.deleteRange(start, end)

      const $pos = tr.selection.$from
      const blockNode = $pos.index(-1) === 0 && $pos.node(-1)
      if (blockNode && isBlockNode(blockNode)) {
        const oldAttrs: Attrs = blockNode.attrs as BlockAttrs
        const newAttrs: Attrs =
          typeof getAttrs === "function"
            ? getAttrs({ match, attributes: oldAttrs as BlockAttrs })
            : getAttrs

        const entries = Object.entries(newAttrs).filter(([key, value]) => oldAttrs[key] !== value)
        if (entries.length === 0) {
          return null
        } else {
          const pos = $pos.before(-1)
          for (const [key, value] of entries) {
            tr.setNodeAttribute(pos, key, value)
          }
          return tr
        }
      }

      const $start = tr.doc.resolve(start)
      const range = $start.blockRange()
      if (!range) return null

      const newAttrs: Attrs = typeof getAttrs === "function" ? getAttrs({ match }) : getAttrs
      const wrapping = findWrapping(range, getBlockType(state.schema), newAttrs)
      if (!wrapping) return null

      return tr.wrap(range, wrapping)
    }
  )
}

function parseInteger(str: string | undefined): number | null {
  if (!str) return null
  const num = parseInt(str, 10)
  return isNaN(num) ? null : num
}

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

const codeBlockRule = new InputRule(
  /^```(\w+)?\s$/,
  (state, match, start, end): Transaction | null => {
    const language = resolveLanguage(match[1])
    const $from = state.selection.$from

    const blockNode = $from.node(-1)
    if (!isBlockNode(blockNode)) return null

    const paragraph = $from.parent
    if (paragraph.type !== schema.nodes.paragraph) return null

    const blockPos = $from.before(-1)
    const codeBlock = schema.nodes.code_block.create({ language })
    const newBlock = schema.nodes.block.create({ kind: "paragraph" }, codeBlock)

    const tr = state.tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, newBlock)

    return tr
  }
)

export const blockInputRules: InputRule[] = [
  wrappingBlockInputRule(/^\s?([*-])\s$/, { kind: "bullet", order: null }),
  wrappingBlockInputRule(/^\s?(\d+)\.\s$/, ({ match }) => {
    const order = parseInteger(match[1])
    return { kind: "ordered", order: order != null && order >= 2 ? order : null }
  }),
  codeBlockRule
]
