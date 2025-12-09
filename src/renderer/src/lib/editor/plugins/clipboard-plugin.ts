import { DOMOutputSpec, DOMSerializer, Fragment, Schema, Slice, Node as PMNode } from "prosemirror-model"
import { Plugin } from "prosemirror-state"
import { isBlockNode, BlockAttrs, getBlockType } from "../schema"

function blockToNativeList(node: PMNode): DOMOutputSpec {
  const attrs = node.attrs as BlockAttrs
  const markerHidden = node.firstChild && isBlockNode(node.firstChild)
  const listTag = attrs.kind === "ordered" ? "ol" : "ul"

  const domAttrs: Record<string, string> = { class: "block" }
  domAttrs["data-kind"] = attrs.kind
  if (attrs.order != null) domAttrs["data-order"] = String(attrs.order)
  if (attrs.collapsed) domAttrs["data-collapsed"] = "true"

  if (markerHidden) {
    return [listTag, ["li", domAttrs, 0]]
  } else {
    return [listTag, ["li", domAttrs, ["div", { class: "block-content" }, 0]]]
  }
}

class BlockDOMSerializer extends DOMSerializer {
  static override nodesFromSchema(schema: Schema): {
    [node: string]: (node: PMNode) => DOMOutputSpec
  } {
    const nodes = DOMSerializer.nodesFromSchema(schema)
    return {
      ...nodes,
      block: (node) => {
        const attrs = node.attrs as BlockAttrs
        if (attrs.kind === "bullet" || attrs.kind === "ordered") {
          return blockToNativeList(node)
        }
        return nodes.block(node)
      }
    }
  }

  static override fromSchema(schema: Schema): BlockDOMSerializer {
    return (
      (schema.cached.blockDomSerializer as BlockDOMSerializer) ||
      (schema.cached.blockDomSerializer = new BlockDOMSerializer(
        this.nodesFromSchema(schema),
        this.marksFromSchema(schema)
      ))
    )
  }

  override serializeFragment(
    fragment: Fragment,
    options?: { document?: Document },
    target?: HTMLElement | DocumentFragment
  ): HTMLElement | DocumentFragment {
    const dom = super.serializeFragment(fragment, options, target)
    return joinListElements(dom)
  }
}

function joinListElements<T extends Element | DocumentFragment>(parent: T): T {
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.children.item(i)
    if (!child) continue

    if (child.tagName === "UL" || child.tagName === "OL") {
      let next: Element | null = null
      while (((next = child.nextElementSibling), next?.tagName === child.tagName)) {
        child.append(...Array.from(next.children))
        next.remove()
      }
    }
    joinListElements(child)
  }
  return parent
}

function unwrapBlockSlice(slice: Slice): Slice {
  while (
    slice.openStart >= 2 &&
    slice.openEnd >= 2 &&
    slice.content.childCount === 1 &&
    isBlockNode(slice.content.child(0))
  ) {
    slice = new Slice(
      slice.content.child(0).content,
      slice.openStart - 1,
      slice.openEnd - 1
    )
  }
  return slice
}

function splitBlockWithMultipleParagraphs(fragment: Fragment, schema: Schema): Fragment {
  const blockType = getBlockType(schema)
  const paragraphType = schema.nodes.paragraph
  const result: PMNode[] = []

  fragment.forEach((node) => {
    if (isBlockNode(node)) {
      const attrs = node.attrs as BlockAttrs
      const paragraphs: PMNode[] = []
      const children: PMNode[] = []

      node.forEach((child) => {
        if (child.type === paragraphType) {
          paragraphs.push(child)
        } else if (isBlockNode(child)) {
          children.push(child)
        } else {
          children.push(child)
        }
      })

      if (paragraphs.length > 1) {
        paragraphs.forEach((p, i) => {
          if (i === paragraphs.length - 1 && children.length > 0) {
            result.push(blockType.create(attrs, [p, ...children.map(c =>
              isBlockNode(c) ? c.copy(splitBlockWithMultipleParagraphs(c.content, schema)) : c
            )]))
          } else {
            result.push(blockType.create(attrs, p))
          }
        })
      } else {
        result.push(node.copy(splitBlockWithMultipleParagraphs(node.content, schema)))
      }
    } else {
      result.push(node)
    }
  })

  return Fragment.from(result)
}

function wrapParagraphsInBlocks(fragment: Fragment, schema: Schema): Fragment {
  const blockType = getBlockType(schema)
  const paragraphType = schema.nodes.paragraph
  const result: PMNode[] = []
  let hasParagraphAtTop = false

  fragment.forEach((node) => {
    if (node.type === paragraphType) {
      hasParagraphAtTop = true
      result.push(blockType.create({ kind: "paragraph", order: null, collapsed: false }, node))
    } else if (isBlockNode(node)) {
      result.push(node.copy(splitBlockWithMultipleParagraphs(node.content, schema)))
    } else {
      result.push(node)
    }
  })

  return hasParagraphAtTop ? Fragment.from(result) : splitBlockWithMultipleParagraphs(fragment, schema)
}

function transformPastedSlice(slice: Slice, schema: Schema): Slice {
  console.log("[transformPasted] input slice:", JSON.stringify(slice.toJSON()))
  console.log("[transformPasted] openStart:", slice.openStart, "openEnd:", slice.openEnd)
  const newContent = wrapParagraphsInBlocks(slice.content, schema)
  const newSlice = new Slice(newContent, 0, 0)
  console.log("[transformPasted] output slice:", JSON.stringify(newSlice.toJSON()))
  return newSlice
}

export function createClipboardPlugin(schema: Schema): Plugin {
  return new Plugin({
    props: {
      clipboardSerializer: BlockDOMSerializer.fromSchema(schema),
      transformCopied: (slice) => unwrapBlockSlice(slice),
      transformPasted: (slice) => transformPastedSlice(slice, schema)
    }
  })
}
