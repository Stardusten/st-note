import { chainCommands, createParagraphNear, newlineInCode, splitBlock as pmSplitBlock } from "prosemirror-commands"
import { NodeRange, Node as PMNode } from "prosemirror-model"
import { Command, EditorState, TextSelection, Transaction } from "prosemirror-state"
import { canSplit } from "prosemirror-transform"
import { getBlockType, isBlockNode, BlockAttrs, schema } from "../schema"
import { atTextblockStart, createAndFill } from "./utils"
import { dedentNodeRange } from "./dedent"

export const enterWithoutLift: Command = chainCommands(
  newlineInCode,
  createParagraphNear,
  pmSplitBlock
)

function deriveBlockAttrs(blockNode: PMNode): BlockAttrs {
  return { kind: (blockNode.attrs as BlockAttrs).kind, order: null }
}

const splitBlockCommand: Command = (state, dispatch): boolean => {
  const { $from, $to } = state.selection

  if (!$from.sameParent($to)) return false
  if ($from.depth < 2) return false

  const blockDepth = $from.depth - 1
  const blockNode = $from.node(blockDepth)

  if (!isBlockNode(blockNode)) return false

  const parent = $from.parent
  const indexInBlock = $from.index(blockDepth)
  const parentEmpty = parent.content.size === 0

  console.log("[splitBlockCommand] BEFORE:", JSON.stringify(state.doc.toJSON(), null, 2))
  console.log("[splitBlockCommand] indexInBlock:", indexInBlock, "parentEmpty:", parentEmpty, "blockNode.childCount:", blockNode.childCount, "depth:", $from.depth)

  if (indexInBlock === 0 && parentEmpty) {
    const $blockEnd = state.doc.resolve($from.end(blockDepth))
    const blockParentDepth = blockDepth - 1
    const blockParent = $from.node(blockParentDepth)
    const indexInBlockParent = $from.index(blockParentDepth)
    const isLastChildInBlockParent = indexInBlockParent === blockParent.childCount - 1

    const range = isLastChildInBlockParent
      ? new NodeRange($from, $blockEnd, blockParentDepth)
      : new NodeRange($from, $blockEnd, blockDepth)
    const tr = state.tr
    if (range && dedentNodeRange(range, tr)) {
      console.log("[splitBlockCommand] AFTER dedent:", JSON.stringify(tr.doc.toJSON(), null, 2))
      dispatch?.(tr)
      return true
    }
    return false
  }

  return doSplitBlock(state, blockNode, blockDepth, dispatch)
}

function doSplitBlock(
  state: EditorState,
  blockNode: PMNode,
  blockDepth: number,
  dispatch?: (tr: Transaction) => void
): boolean {
  const tr = state.tr
  const blockType = getBlockType(state.schema)
  const newAttrs: BlockAttrs = deriveBlockAttrs(blockNode)

  tr.delete(tr.selection.from, tr.selection.to)

  const { $from, $to } = tr.selection
  const { parentOffset } = $to
  const indexInBlock = $from.index(blockDepth)

  const atStart = parentOffset === 0
  const atEnd = parentOffset === $to.parent.content.size

  console.log("[doSplitBlock] atStart:", atStart, "atEnd:", atEnd, "indexInBlock:", indexInBlock)

  if (atStart) {
    if (dispatch) {
      const pos = $from.before(-1)
      tr.insert(pos, createAndFill(blockType, newAttrs))
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  if (indexInBlock > 0) {
    console.log("[doSplitBlock] not at first child, creating new sibling block")
    if (dispatch) {
      const blockPos = $from.after(blockDepth)
      const contentAfter = atEnd ? undefined : $to.parent.cut($from.parentOffset)
      const paragraph = contentAfter
        ? schema.nodes.paragraph.create(null, contentAfter.content)
        : schema.nodes.paragraph.create()
      const newBlock = blockType.create(newAttrs, paragraph)
      tr.insert(blockPos, newBlock)
      if (!atEnd) tr.delete($from.pos, $from.end())
      tr.setSelection(TextSelection.create(tr.doc, blockPos + 2))
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  const nextType = atEnd ? blockNode.contentMatchAt(0).defaultType : undefined
  const typesAfter = [
    { type: blockType, attrs: newAttrs },
    nextType ? { type: nextType } : null
  ]

  console.log("[doSplitBlock] trying canSplit with depth 2")
  if (!canSplit(tr.doc, $from.pos, 2, typesAfter)) {
    console.log("[doSplitBlock] canSplit failed")
    return false
  }

  dispatch?.(tr.split($from.pos, 2, typesAfter).scrollIntoView())
  return true
}

export const joinBlockUp: Command = (state, dispatch, view) => {
  const $cursor = atTextblockStart(state, view)
  if (!$cursor) return false

  const parent = $cursor.parent

  console.log("[joinBlockUp] BEFORE:", JSON.stringify(state.doc.toJSON(), null, 2))
  console.log("[joinBlockUp] parent type:", parent.type.name, "depth:", $cursor.depth)

  if (parent.type === schema.nodes.code_block) {
    if (parent.content.size === 0) {
      if (dispatch) {
        const tr = state.tr
        const blockDepth = $cursor.depth - 1
        const blockNode = $cursor.node(blockDepth)
        if (isBlockNode(blockNode)) {
          const blockPos = $cursor.before(blockDepth)
          const newBlock = schema.nodes.block.create(
            blockNode.attrs,
            schema.nodes.paragraph.create()
          )
          tr.replaceWith(blockPos, blockPos + blockNode.nodeSize, newBlock)
          tr.setSelection(TextSelection.create(tr.doc, blockPos + 2))
          console.log("[joinBlockUp] AFTER code_block->paragraph:", JSON.stringify(tr.doc.toJSON(), null, 2))
          dispatch(tr)
        }
      }
      return true
    }
    return false
  }

  const { depth } = $cursor
  if (depth < 2) return false
  const blockDepth = depth - 1

  const blockNode = $cursor.node(blockDepth)
  if (!isBlockNode(blockNode)) return false

  const indexInBlock = $cursor.index(blockDepth)
  const parentEmpty = parent.content.size === 0
  const blockParentDepth = blockDepth - 1
  const blockParent = $cursor.node(blockParentDepth)
  const isNestedInBlock = isBlockNode(blockParent)
  const blockAttrs = blockNode.attrs as BlockAttrs

  console.log("[joinBlockUp] indexInBlock:", indexInBlock, "parentEmpty:", parentEmpty, "isNestedInBlock:", isNestedInBlock, "blockAttrs:", blockAttrs)

  if (indexInBlock === 0 && parentEmpty) {
    if (isNestedInBlock) {
      console.log("[joinBlockUp] deleting nested empty block")
      if (dispatch) {
        const tr = state.tr
        const blockPos = $cursor.before(blockDepth)
        const prevSiblingIndex = $cursor.index(blockParentDepth) - 1
        const prevSibling = prevSiblingIndex >= 0 ? blockParent.child(prevSiblingIndex) : null

        tr.delete(blockPos, blockPos + blockNode.nodeSize)

        let newCursorPos: number
        if (prevSibling && isBlockNode(prevSibling)) {
          const prevSiblingPos = $cursor.posAtIndex(prevSiblingIndex, blockParentDepth)
          newCursorPos = prevSiblingPos + prevSibling.nodeSize - 2
        } else if (prevSibling) {
          newCursorPos = blockPos - 1
        } else {
          newCursorPos = blockPos - 1
        }

        tr.setSelection(TextSelection.create(tr.doc, newCursorPos))
        console.log("[joinBlockUp] AFTER delete nested:", JSON.stringify(tr.doc.toJSON(), null, 2))
        dispatch(tr.scrollIntoView())
      }
      return true
    }

    if (blockAttrs.kind !== "paragraph") {
      console.log("[joinBlockUp] converting list item to paragraph")
      if (dispatch) {
        const tr = state.tr
        const blockPos = $cursor.before(blockDepth)
        tr.setNodeMarkup(blockPos, undefined, { kind: "paragraph", order: null })
        console.log("[joinBlockUp] AFTER convert:", JSON.stringify(tr.doc.toJSON(), null, 2))
        dispatch(tr)
      }
      return true
    }

    console.log("[joinBlockUp] trying dedent")
    const tr = state.tr
    const blockPos = $cursor.before(blockDepth)
    const blockEnd = $cursor.after(blockDepth)
    const range = new NodeRange(tr.doc.resolve(blockPos), tr.doc.resolve(blockEnd), blockParentDepth)

    if (dedentNodeRange(range, tr)) {
      console.log("[joinBlockUp] AFTER dedent:", JSON.stringify(tr.doc.toJSON(), null, 2))
      dispatch?.(tr)
      return true
    }
    return false
  }

  return false
}

export const splitBlock = chainCommands(splitBlockCommand, enterWithoutLift)
