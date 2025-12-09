import { Schema, NodeSpec, MarkSpec, DOMOutputSpec, Node as PMNode, NodeType } from "prosemirror-model"

export type BlockKind = "paragraph" | "bullet" | "ordered"

export type BlockAttrs = {
  kind: BlockKind
  order: number | null
  collapsed: boolean
}

export const flatBlockGroup = "flatBlock"

const titleSpec: NodeSpec = {
  content: "inline*",
  marks: "_",
  defining: true,
  parseDOM: [{ tag: "h1.editor-title" }],
  toDOM(): DOMOutputSpec {
    return ["h1", { class: "editor-title" }, 0]
  }
}

const paragraphSpec: NodeSpec = {
  content: "inline*",
  group: "block",
  parseDOM: [{ tag: "p" }],
  toDOM(): DOMOutputSpec {
    return ["p", 0]
  }
}

const codeBlockSpec: NodeSpec = {
  content: "text*",
  marks: "",
  group: "block",
  code: true,
  defining: true,
  attrs: {
    language: { default: "javascript" }
  },
  parseDOM: [
    {
      tag: "pre",
      preserveWhitespace: "full" as const,
      getAttrs(dom) {
        const el = dom as HTMLElement
        const code = el.querySelector("code")
        const classes = code?.className || ""
        const match = classes.match(/language-(\w+)/)
        return { language: match ? match[1] : "javascript" }
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    return ["pre", { class: "code-block", "data-language": node.attrs.language }, ["code", { class: `language-${node.attrs.language}` }, 0]]
  }
}

const blockSpec: NodeSpec = {
  content: "(paragraph | code_block | block)+",
  group: `${flatBlockGroup} block`,
  definingForContent: true,
  definingAsContext: false,
  attrs: {
    kind: { default: "paragraph" as BlockKind },
    order: { default: null as number | null },
    collapsed: { default: false }
  },
  parseDOM: [
    {
      tag: "div.block",
      getAttrs(dom): BlockAttrs {
        const el = dom as HTMLElement
        const kind = (el.getAttribute("data-kind") || "paragraph") as BlockKind
        const orderStr = el.getAttribute("data-order")
        const order = orderStr ? parseInt(orderStr, 10) : null
        const collapsed = el.getAttribute("data-collapsed") === "true"
        return { kind, order: isNaN(order as number) ? null : order, collapsed }
      }
    },
    {
      tag: "ul > li",
      getAttrs: (): BlockAttrs => ({ kind: "bullet", order: null, collapsed: false })
    },
    {
      tag: "ol > li",
      getAttrs(dom): BlockAttrs {
        const el = dom as HTMLElement
        const orderStr = el.getAttribute("value")
        const order = orderStr ? parseInt(orderStr, 10) : null
        return { kind: "ordered", order: isNaN(order as number) ? null : order, collapsed: false }
      }
    },
    {
      tag: ":is(ul, ol) > :is(ul, ol)",
      getAttrs: (): BlockAttrs => ({ kind: "bullet", order: null, collapsed: false })
    }
  ],
  toDOM(node): DOMOutputSpec {
    const attrs = node.attrs as BlockAttrs
    const firstChild = node.firstChild
    const markerHidden = firstChild?.type.name === "block"

    const domAttrs: Record<string, string> = { class: "block" }
    domAttrs["data-kind"] = attrs.kind
    if (markerHidden) domAttrs["data-marker-hidden"] = "true"
    if (attrs.order != null) {
      domAttrs["data-order"] = String(attrs.order)
      domAttrs["style"] = `--block-order: ${attrs.order};`
    }
    if (attrs.collapsed) domAttrs["data-collapsed"] = "true"
    if (node.childCount >= 2) domAttrs["data-collapsable"] = "true"

    return ["div", domAttrs,
      ["div", { class: "block-collapse-toggle", contenteditable: "false" }],
      ["div", { class: "block-content" }, 0]
    ]
  }
}

const docSpec: NodeSpec = {
  content: "title block+"
}

const textSpec: NodeSpec = {
  group: "inline"
}

const cardRefSpec: NodeSpec = {
  group: "inline",
  inline: true,
  atom: true,
  attrs: {
    cardId: { default: null }
  },
  parseDOM: [
    {
      tag: 'span[data-type="card-ref"]',
      getAttrs(dom) {
        const el = dom as HTMLElement
        return { cardId: el.getAttribute("data-card-id") }
      }
    }
  ],
  toDOM(node): DOMOutputSpec {
    return ["span", { "data-type": "card-ref", "data-card-id": node.attrs.cardId, class: "card-ref" }, ""]
  }
}

const boldSpec: MarkSpec = {
  parseDOM: [
    { tag: "strong" },
    { tag: "b" },
    { style: "font-weight=bold" },
    { style: "font-weight=700" }
  ],
  toDOM(): DOMOutputSpec {
    return ["strong", 0]
  }
}

const italicSpec: MarkSpec = {
  parseDOM: [
    { tag: "i" },
    { tag: "em" },
    { style: "font-style=italic" }
  ],
  toDOM(): DOMOutputSpec {
    return ["em", 0]
  }
}

const codeSpec: MarkSpec = {
  parseDOM: [{ tag: "code" }],
  toDOM(): DOMOutputSpec {
    return ["code", 0]
  }
}

const linkSpec: MarkSpec = {
  attrs: {
    href: { default: null },
    title: { default: null }
  },
  inclusive: false,
  parseDOM: [
    {
      tag: "a[href]",
      getAttrs(dom) {
        const el = dom as HTMLElement
        return { href: el.getAttribute("href"), title: el.getAttribute("title") }
      }
    }
  ],
  toDOM(mark): DOMOutputSpec {
    const { href, title } = mark.attrs
    return ["a", { href, title, target: "_blank", rel: "noopener noreferrer" }, 0]
  }
}

export const schema = new Schema({
  nodes: {
    doc: docSpec,
    title: titleSpec,
    block: blockSpec,
    paragraph: paragraphSpec,
    code_block: codeBlockSpec,
    cardRef: cardRefSpec,
    text: textSpec
  },
  marks: {
    bold: boldSpec,
    italic: italicSpec,
    code: codeSpec,
    link: linkSpec
  }
})

const blockTypeNameKey = "FLAT_BLOCK_TYPE_NAME"

export function getBlockTypeName(s: Schema): string {
  let name: string = s.cached[blockTypeNameKey] as string
  if (!name) {
    for (const type of Object.values(s.nodes)) {
      if ((type.spec.group || "").split(" ").includes(flatBlockGroup)) {
        name = type.name
        break
      }
    }
    if (!name) throw new TypeError("Unable to find block type in schema")
    s.cached[blockTypeNameKey] = name
  }
  return name
}

export function getBlockType(s: Schema): NodeType {
  return s.nodes[getBlockTypeName(s)]
}

export function isBlockType(type: NodeType): boolean {
  return getBlockTypeName(type.schema) === type.name
}

export function isBlockNode(node: PMNode | null | undefined): boolean {
  if (!node) return false
  return isBlockType(node.type)
}
