import type { Node, Fragment, Mark } from "prosemirror-model"
import { schema } from "../schema"

type SerializerState = {
  output: string
  indentLevel: number
}

function serializeMarks(text: string, marks: readonly Mark[]): string {
  let result = text
  for (const mark of marks) {
    switch (mark.type) {
      case schema.marks.bold:
        result = `**${result}**`
        break
      case schema.marks.italic:
        result = `*${result}*`
        break
      case schema.marks.code:
        result = `\`${result}\``
        break
      case schema.marks.link:
        result = `[${result}](${mark.attrs.href})`
        break
    }
  }
  return result
}

function serializeInlineContent(fragment: Fragment): string {
  let result = ""
  fragment.forEach((node) => {
    if (node.isText) {
      result += serializeMarks(node.text || "", node.marks)
    } else if (node.type === schema.nodes.card_ref) {
      const title = node.attrs.title || node.attrs.cardId
      result += `[[${title}]]`
    } else if (node.type === schema.nodes.image) {
      result += `![](image:${node.attrs.fileId})`
    }
  })
  return result
}

function getIndent(level: number): string {
  return "  ".repeat(level)
}

function serializeBlock(node: Node, state: SerializerState): void {
  const kind = node.attrs.kind as string
  const indent = getIndent(state.indentLevel)

  let paragraphContent = ""
  const childBlocks: Node[] = []

  node.forEach((child) => {
    if (child.type === schema.nodes.paragraph) {
      paragraphContent = serializeInlineContent(child.content)
    } else if (child.type === schema.nodes.code_block) {
      const lang = child.attrs.language || ""
      const code = child.textContent
      state.output += `${indent}\`\`\`${lang}\n${code}\n${indent}\`\`\`\n`
      return
    } else if (child.type === schema.nodes.image) {
      state.output += `${indent}![](image:${child.attrs.fileId})\n`
      return
    } else if (child.type === schema.nodes.block) {
      childBlocks.push(child)
    }
  })

  if (paragraphContent || kind !== "paragraph") {
    switch (kind) {
      case "bullet":
        state.output += `${indent}- ${paragraphContent}\n`
        break
      case "ordered": {
        const order = node.attrs.order || 1
        state.output += `${indent}${order}. ${paragraphContent}\n`
        break
      }
      case "quote":
        state.output += `${indent}> ${paragraphContent}\n`
        break
      default:
        if (paragraphContent) state.output += `${indent}${paragraphContent}\n`
        break
    }
  }

  if (childBlocks.length > 0) {
    state.indentLevel++
    for (const child of childBlocks) {
      serializeBlock(child, state)
    }
    state.indentLevel--
  }
}

function serializeTitle(node: Node, state: SerializerState): void {
  const content = serializeInlineContent(node.content)
  if (content) state.output += `# ${content}\n\n`
}

export function serializeToMarkdown(doc: Node): string {
  const state: SerializerState = { output: "", indentLevel: 0 }

  doc.forEach((node) => {
    if (node.type === schema.nodes.title) {
      serializeTitle(node, state)
    } else if (node.type === schema.nodes.block) {
      serializeBlock(node, state)
    }
  })

  return state.output.trimEnd()
}

export function serializeFragmentToMarkdown(fragment: Fragment): string {
  const state: SerializerState = { output: "", indentLevel: 0 }

  fragment.forEach((node) => {
    if (node.type === schema.nodes.title) {
      serializeTitle(node, state)
    } else if (node.type === schema.nodes.block) {
      serializeBlock(node, state)
    } else if (node.type === schema.nodes.paragraph) {
      state.output += serializeInlineContent(node.content) + "\n"
    } else if (node.isText) {
      state.output += serializeMarks(node.text || "", node.marks)
    }
  })

  return state.output.trimEnd()
}

export function serializeSliceToMarkdown(slice: { content: Fragment }): string {
  return serializeFragmentToMarkdown(slice.content)
}
