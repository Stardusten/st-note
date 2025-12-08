import { chainCommands, createParagraphNear, newlineInCode, splitBlock as pmSplitBlock } from "prosemirror-commands"
import { NodeRange, Node as PMNode } from "prosemirror-model"
import { Command, EditorState, Transaction } from "prosemirror-state"
import { canSplit } from "prosemirror-transform"
import { getBlockType, isBlockNode, BlockAttrs, schema } from "./schema"
import { atTextblockStart, safeLift, createAndFill } from "./utils"
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

  if (indexInBlock === 0) {
    if (parentEmpty) {
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
        dispatch?.(tr)
        return true
      }
      return false
    } else {
      return doSplitBlock(state, blockNode, dispatch)
    }
  } else {
    if (parentEmpty) {
      return enterWithoutLift(state, dispatch)
    } else {
      return false
    }
  }
}

function doSplitBlock(
  state: EditorState,
  blockNode: PMNode,
  dispatch?: (tr: Transaction) => void
): boolean {
  const tr = state.tr
  const blockType = getBlockType(state.schema)
  const newAttrs: BlockAttrs = deriveBlockAttrs(blockNode)

  tr.delete(tr.selection.from, tr.selection.to)

  const { $from, $to } = tr.selection
  const { parentOffset } = $to

  const atStart = parentOffset === 0
  const atEnd = parentOffset === $to.parent.content.size

  if (atStart) {
    if (dispatch) {
      const pos = $from.before(-1)
      tr.insert(pos, createAndFill(blockType, newAttrs))
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  const nextType = atEnd ? blockNode.contentMatchAt(0).defaultType : undefined
  const typesAfter = [
    { type: blockType, attrs: newAttrs },
    nextType ? { type: nextType } : null
  ]

  if (!canSplit(tr.doc, $from.pos, 2, typesAfter)) return false

  dispatch?.(tr.split($from.pos, 2, typesAfter).scrollIntoView())
  return true
}

export const joinBlockUp: Command = (state, dispatch, view) => {
  const $cursor = atTextblockStart(state, view)
  if (!$cursor) return false

  const parent = $cursor.parent
  console.log("[joinBlockUp] parent type:", parent.type.name)
  if (parent.type === schema.nodes.code_block) return false

  console.log("[joinBlockUp] cursor at textblock start, depth:", $cursor.depth)

  const { depth } = $cursor
  if (depth < 2) return false
  const blockDepth = depth - 1

  const blockNode = $cursor.node(blockDepth)
  console.log("[joinBlockUp] blockNode:", blockNode.type.name, "isBlock:", isBlockNode(blockNode))
  if (!isBlockNode(blockNode)) return false

  const indexInBlock = $cursor.index(blockDepth)
  const parentEmpty = parent.content.size === 0
  console.log("[joinBlockUp] indexInBlock:", indexInBlock, "blockNode.childCount:", blockNode.childCount, "parentEmpty:", parentEmpty)

  if (indexInBlock === 0) {
    const blockAttrs = blockNode.attrs as BlockAttrs
    if (parentEmpty && blockAttrs.kind !== "paragraph") {
      console.log("[joinBlockUp] empty list item, converting to paragraph")
      if (dispatch) {
        const tr = state.tr
        const blockPos = $cursor.before(blockDepth)
        tr.setNodeMarkup(blockPos, undefined, { kind: "paragraph", order: null })
        dispatch(tr)
      }
      return true
    }

    console.log("[joinBlockUp] at first child, trying to lift/dedent")
    const tr = state.tr
    const range = new NodeRange($cursor, tr.doc.resolve($cursor.end(blockDepth)), blockDepth)
    console.log("[joinBlockUp] range depth:", range.depth, "parent:", range.parent.type.name)

    if (dedentNodeRange(range, tr)) {
      console.log("[joinBlockUp] dedentNodeRange succeeded")
      dispatch?.(tr)
      return true
    }
    console.log("[joinBlockUp] dedentNodeRange failed, returning false to let other commands handle")
    return false
  }

  if (indexInBlock === blockNode.childCount - 1) {
    console.log("[joinBlockUp] at last child, lifting parent")
    const tr = state.tr
    const range = $cursor.blockRange()
    if (range && safeLift(tr, range)) {
      dispatch?.(tr)
      return true
    }
    return false
  }

  console.log("[joinBlockUp] not at first or last child, returning false")
  return false
}

function liftParent(
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  $cursor: any
) {
  const tr = state.tr
  const range = $cursor.blockRange()
  if (range && safeLift(tr, range)) dispatch(tr)
}

export const splitBlock = chainCommands(splitBlockCommand, enterWithoutLift)
