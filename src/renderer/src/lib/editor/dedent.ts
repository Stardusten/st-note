import { Fragment, NodeRange, Slice } from "prosemirror-model"
import { Command, Transaction } from "prosemirror-state"
import { ReplaceAroundStep } from "prosemirror-transform"
import { getBlockType, isBlockNode } from "./schema"
import { atStartBlockBoundary, atEndBlockBoundary, zoomInRange, mapPos, findBlocksRange, isBlocksRange, safeLift } from "./utils"

export function createDedentCommand(): Command {
  return (state, dispatch): boolean => {
    const tr = state.tr
    const { $from, $to } = tr.selection

    const range = findBlocksRange($from, $to)
    if (!range) return false

    if (dedentRange(range, tr)) {
      dispatch?.(tr)
      return true
    }
    return false
  }
}

function dedentRange(
  range: NodeRange,
  tr: Transaction,
  startBoundary?: boolean,
  endBoundary?: boolean
): boolean {
  const { depth, $from, $to } = range

  startBoundary = startBoundary || atStartBlockBoundary($from, depth + 1)

  if (!startBoundary) {
    const { startIndex, endIndex } = range
    if (endIndex - startIndex === 1) {
      const contentRange = zoomInRange(range)
      return contentRange ? dedentRange(contentRange, tr) : false
    } else {
      return splitAndDedentRange(range, tr, startIndex + 1)
    }
  }

  endBoundary = endBoundary || atEndBlockBoundary($to, depth + 1)

  if (!endBoundary) {
    fixEndBoundary(range, tr)
    const endOfParent = $to.end(depth)
    range = new NodeRange(
      tr.doc.resolve($from.pos),
      tr.doc.resolve(endOfParent),
      depth
    )
    return dedentRange(range, tr, undefined, true)
  }

  if (
    range.startIndex === 0 &&
    range.endIndex === range.parent.childCount &&
    isBlockNode(range.parent)
  ) {
    return dedentNodeRange(new NodeRange($from, $to, depth - 1), tr)
  }

  return dedentNodeRange(range, tr)
}

function splitAndDedentRange(range: NodeRange, tr: Transaction, splitIndex: number): boolean {
  const { $from, $to, depth } = range
  const splitPos = $from.posAtIndex(splitIndex, depth)

  const range1 = $from.blockRange(tr.doc.resolve(splitPos - 1))
  if (!range1) return false

  const getRange2From = mapPos(tr, splitPos + 1)
  const getRange2To = mapPos(tr, $to.pos)

  dedentRange(range1, tr, undefined, true)

  let range2 = tr.doc.resolve(getRange2From()).blockRange(tr.doc.resolve(getRange2To()))
  if (range2 && range2.depth >= depth) {
    range2 = new NodeRange(range2.$from, range2.$to, depth)
    dedentRange(range2, tr, true, undefined)
  }
  return true
}

export function dedentNodeRange(range: NodeRange, tr: Transaction): boolean {
  console.log("[dedentNodeRange] parent:", range.parent.type.name, "isBlockNode:", isBlockNode(range.parent), "isBlocksRange:", isBlocksRange(range))

  if (isBlockNode(range.parent)) {
    console.log("[dedentNodeRange] parent is block, calling safeLiftRange")
    return safeLiftRange(tr, range)
  } else if (isBlocksRange(range)) {
    console.log("[dedentNodeRange] isBlocksRange, checking canUnwrapBlock")
    if (canUnwrapBlock(tr, range)) {
      console.log("[dedentNodeRange] can unwrap, calling dedentOutOfBlock")
      return dedentOutOfBlock(tr, range)
    } else {
      console.log("[dedentNodeRange] cannot unwrap, calling resetBlockKind")
      return resetBlockKind(tr, range)
    }
  } else {
    console.log("[dedentNodeRange] fallback to safeLiftRange")
    return safeLiftRange(tr, range)
  }
}

function canUnwrapBlock(tr: Transaction, range: NodeRange): boolean {
  const { startIndex, parent } = range
  const blockNode = parent.maybeChild(startIndex)
  if (!blockNode) return false
  return parent.canReplace(startIndex, startIndex + 1, blockNode.content)
}

function resetBlockKind(tr: Transaction, range: NodeRange): boolean {
  const { startIndex, endIndex } = range
  let changed = false
  let pos = range.start
  console.log("[resetBlockKind] startIndex:", startIndex, "endIndex:", endIndex, "start pos:", pos)
  for (let i = startIndex; i < endIndex; i++) {
    const node = tr.doc.nodeAt(pos)
    console.log("[resetBlockKind] i:", i, "node:", node?.type.name, "attrs:", node?.attrs)
    if (node && isBlockNode(node)) {
      const attrs = node.attrs as { kind: string; order: number | null }
      if (attrs.kind !== "paragraph") {
        console.log("[resetBlockKind] changing kind from", attrs.kind, "to paragraph")
        tr.setNodeMarkup(pos, undefined, { kind: "paragraph", order: null })
        changed = true
      } else {
        console.log("[resetBlockKind] already paragraph, not changing")
      }
    }
    pos += node?.nodeSize || 0
  }
  console.log("[resetBlockKind] returning changed:", changed)
  return changed
}

function safeLiftRange(tr: Transaction, range: NodeRange): boolean {
  if (moveRangeSiblings(tr, range)) {
    const $from = tr.doc.resolve(range.$from.pos)
    const $to = tr.doc.resolve(range.$to.pos)
    range = new NodeRange($from, $to, range.depth)
  }
  return safeLift(tr, range)
}

function moveRangeSiblings(tr: Transaction, range: NodeRange): boolean {
  const blockType = getBlockType(tr.doc.type.schema)
  const { $to, depth, end, parent, endIndex } = range
  const endOfParent = $to.end(depth)

  if (end < endOfParent) {
    const lastChild = parent.maybeChild(endIndex - 1)
    if (!lastChild) return false

    const canAppend =
      endIndex < parent.childCount &&
      lastChild.canReplace(
        lastChild.childCount,
        lastChild.childCount,
        parent.content,
        endIndex,
        parent.childCount
      )

    if (canAppend) {
      tr.step(
        new ReplaceAroundStep(
          end - 1,
          endOfParent,
          end,
          endOfParent,
          new Slice(Fragment.from(blockType.create(null)), 1, 0),
          0,
          true
        )
      )
      return true
    } else {
      tr.step(
        new ReplaceAroundStep(
          end,
          endOfParent,
          end,
          endOfParent,
          new Slice(Fragment.from(blockType.create(null)), 0, 0),
          1,
          true
        )
      )
      return true
    }
  }
  return false
}

function fixEndBoundary(range: NodeRange, tr: Transaction): void {
  if (range.endIndex - range.startIndex >= 2) {
    range = new NodeRange(
      range.$to.doc.resolve(range.$to.posAtIndex(range.endIndex - 1, range.depth)),
      range.$to,
      range.depth
    )
  }

  const contentRange = zoomInRange(range)
  if (contentRange) {
    fixEndBoundary(contentRange, tr)
    range = new NodeRange(
      tr.doc.resolve(range.$from.pos),
      tr.doc.resolve(range.$to.pos),
      range.depth
    )
  }

  moveRangeSiblings(tr, range)
}

function dedentOutOfBlock(tr: Transaction, range: NodeRange): boolean {
  const { startIndex, endIndex, parent } = range

  const getRangeStart = mapPos(tr, range.start)
  const getRangeEnd = mapPos(tr, range.end)

  for (let end = getRangeEnd(), i = endIndex - 1; i > startIndex; i--) {
    end -= parent.child(i).nodeSize
    tr.delete(end - 1, end + 1)
  }

  const $start = tr.doc.resolve(getRangeStart())
  const blockNode = $start.nodeAfter

  if (!blockNode) return false

  const start = range.start
  const end = start + blockNode.nodeSize

  if (getRangeEnd() !== end) return false

  if (!$start.parent.canReplace(startIndex, startIndex + 1, Fragment.from(blockNode))) {
    return false
  }

  tr.step(
    new ReplaceAroundStep(
      start,
      end,
      start + 1,
      end - 1,
      new Slice(Fragment.empty, 0, 0),
      0,
      true
    )
  )
  return true
}

export const dedent = createDedentCommand()
