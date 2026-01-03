import MarkdownIt from "markdown-it"
import type Token from "markdown-it/lib/token.mjs"
import { schema } from "../schema"
import type { Node } from "prosemirror-model"

const md = new MarkdownIt()

type MarkSpec = { type: string; attrs?: Record<string, any> }

type InlineParseState = {
  marks: MarkSpec[]
  content: any[]
}

function parseInlineTokens(tokens: Token[], state: InlineParseState): void {
  for (const token of tokens) {
    switch (token.type) {
      case "text":
        if (token.content) {
          const textNode: any = { type: "text", text: token.content }
          if (state.marks.length > 0) textNode.marks = [...state.marks]
          state.content.push(textNode)
        }
        break
      case "code_inline":
        state.content.push({
          type: "text",
          text: token.content,
          marks: [...state.marks, { type: "code" }]
        })
        break
      case "softbreak":
      case "hardbreak":
        state.content.push({ type: "text", text: "\n", marks: state.marks.length > 0 ? [...state.marks] : undefined })
        break
      case "strong_open":
        state.marks.push({ type: "bold" })
        break
      case "strong_close":
        state.marks = state.marks.filter((m) => m.type !== "bold")
        break
      case "em_open":
        state.marks.push({ type: "italic" })
        break
      case "em_close":
        state.marks = state.marks.filter((m) => m.type !== "italic")
        break
      case "link_open": {
        const href = token.attrGet("href") || ""
        state.marks.push({ type: "link", attrs: { href } })
        break
      }
      case "link_close":
        state.marks = state.marks.filter((m) => m.type !== "link")
        break
      case "image": {
        const src = token.attrGet("src") || ""
        if (src.startsWith("image:")) {
          state.content.push({
            type: "image",
            attrs: { fileId: src.slice(6), width: null }
          })
        }
        break
      }
    }
  }
}

function parseInline(token: Token): any[] {
  if (!token.children) return []
  const state: InlineParseState = { marks: [], content: [] }
  parseInlineTokens(token.children, state)
  return state.content
}

type BlockNode = {
  type: "block"
  attrs: { kind: string; order: number | null }
  content: any[]
}

function createBlock(kind: string, order: number | null = null): BlockNode {
  return {
    type: "block",
    attrs: { kind, order },
    content: []
  }
}

function createParagraph(content: any[]): any {
  return { type: "paragraph", content: content.length > 0 ? content : undefined }
}

function parseListItems(tokens: Token[], startIdx: number, ordered: boolean): { blocks: BlockNode[]; endIdx: number } {
  const blocks: BlockNode[] = []
  let i = startIdx
  let orderCounter = 1

  while (i < tokens.length) {
    const token = tokens[i]

    if (token.type === "list_item_open") {
      const block = createBlock(ordered ? "ordered" : "bullet", ordered ? orderCounter++ : null)
      i++

      while (i < tokens.length && tokens[i].type !== "list_item_close") {
        const innerToken = tokens[i]

        if (innerToken.type === "paragraph_open") {
          i++
          if (tokens[i]?.type === "inline") {
            block.content.push(createParagraph(parseInline(tokens[i])))
            i++
          }
          if (tokens[i]?.type === "paragraph_close") i++
        } else if (innerToken.type === "bullet_list_open") {
          const nested = parseListItems(tokens, i + 1, false)
          block.content.push(...nested.blocks)
          i = nested.endIdx + 1
        } else if (innerToken.type === "ordered_list_open") {
          const nested = parseListItems(tokens, i + 1, true)
          block.content.push(...nested.blocks)
          i = nested.endIdx + 1
        } else {
          i++
        }
      }

      if (block.content.length === 0) {
        block.content.push(createParagraph([]))
      }

      blocks.push(block)
      i++
    } else if (token.type === "bullet_list_close" || token.type === "ordered_list_close") {
      return { blocks, endIdx: i }
    } else {
      i++
    }
  }

  return { blocks, endIdx: i }
}

function parseTokens(tokens: Token[]): any[] {
  const result: any[] = []
  let i = 0

  while (i < tokens.length) {
    const token = tokens[i]

    switch (token.type) {
      case "heading_open": {
        const level = parseInt(token.tag.slice(1), 10)
        i++
        if (tokens[i]?.type === "inline") {
          if (level === 1 && result.length === 0) {
            result.push({ type: "title", content: parseInline(tokens[i]) })
          } else {
            const block = createBlock("paragraph")
            const content = parseInline(tokens[i])
            const prefix = "#".repeat(level) + " "
            if (content.length > 0 && content[0].type === "text") {
              content[0].text = prefix + content[0].text
            } else {
              content.unshift({ type: "text", text: prefix })
            }
            block.content.push(createParagraph(content))
            result.push(block)
          }
          i++
        }
        if (tokens[i]?.type === "heading_close") i++
        break
      }

      case "paragraph_open": {
        i++
        if (tokens[i]?.type === "inline") {
          const block = createBlock("paragraph")
          block.content.push(createParagraph(parseInline(tokens[i])))
          result.push(block)
          i++
        }
        if (tokens[i]?.type === "paragraph_close") i++
        break
      }

      case "bullet_list_open": {
        const parsed = parseListItems(tokens, i + 1, false)
        result.push(...parsed.blocks)
        i = parsed.endIdx + 1
        break
      }

      case "ordered_list_open": {
        const parsed = parseListItems(tokens, i + 1, true)
        result.push(...parsed.blocks)
        i = parsed.endIdx + 1
        break
      }

      case "blockquote_open": {
        i++
        const quoteContent: any[] = []
        while (i < tokens.length && tokens[i].type !== "blockquote_close") {
          if (tokens[i].type === "paragraph_open") {
            i++
            if (tokens[i]?.type === "inline") {
              quoteContent.push(...parseInline(tokens[i]))
              i++
            }
            if (tokens[i]?.type === "paragraph_close") i++
          } else {
            i++
          }
        }
        const block = createBlock("quote")
        block.content.push(createParagraph(quoteContent))
        result.push(block)
        if (tokens[i]?.type === "blockquote_close") i++
        break
      }

      case "fence":
      case "code_block": {
        const block = createBlock("paragraph")
        block.content.push({
          type: "code_block",
          attrs: { language: token.info || null },
          content: token.content ? [{ type: "text", text: token.content.replace(/\n$/, "") }] : undefined
        })
        result.push(block)
        i++
        break
      }

      case "hr": {
        const block = createBlock("paragraph")
        block.content.push(createParagraph([{ type: "text", text: "---" }]))
        result.push(block)
        i++
        break
      }

      default:
        i++
    }
  }

  return result
}

export function parseMarkdown(markdown: string): Node {
  const tokens = md.parse(markdown, {})
  const content = parseTokens(tokens)

  if (content.length === 0 || content[0].type !== "title") {
    content.unshift({ type: "title", content: [] })
  }

  if (content.length === 1) {
    content.push(createBlock("paragraph"))
    content[1].content.push(createParagraph([]))
  }

  return schema.nodeFromJSON({ type: "doc", content })
}

export function parseMarkdownToBlocks(markdown: string): Node[] {
  const tokens = md.parse(markdown, {})
  const content = parseTokens(tokens)

  const blocks = content.filter((n) => n.type === "block")
  if (blocks.length === 0) {
    const block = createBlock("paragraph")
    block.content.push(createParagraph([{ type: "text", text: markdown }]))
    blocks.push(block)
  }

  return blocks.map((b) => schema.nodeFromJSON(b))
}
