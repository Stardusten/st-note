import { Fragment, NodeRange, Slice } from "prosemirror-model"
import { Command, Transaction } from "prosemirror-state"
import { ReplaceAroundStep } from "prosemirror-transform"
import { getBlockType, isBlockNode, BlockAttrs } from "../schema"
import { atStartBlockBoundary, atEndBlockBoundary, zoomInRange, mapPos, findBlocksRange } from "./utils"

export function createIndentCommand(): Command {
  return (state, dispatch): boolean => {
    const tr = state.tr
    const { $from, $to } = tr.selection

    console.log("[indent] $from.pos:", $from.pos, "$to.pos:", $to.pos)
    console.log("[indent] $from.depth:", $from.depth)

    const range = findBlocksRange($from, $to) || $from.blockRange($to)
    console.log("[indent] range:", range ? `depth=${range.depth} parent=${range.parent.type.name}` : null)
    if (!range) {
      console.log("[indent] no range found, returning false")
      return false
    }

    if (indentRange(range, tr)) {
      console.log("[indent] indentRange succeeded")
      dispatch?.(tr)
      return true
    }
    console.log("[indent] indentRange failed")
    return false
  }
}

function indentRange(
  range: NodeRange,
  tr: Transaction,
  startBoundary?: boolean,
  endBoundary?: boolean
): boolean {
  const { depth, $from, $to } = range

  console.log("[indentRange] depth:", depth, "parent:", range.parent.type.name, "startIndex:", range.startIndex, "endIndex:", range.endIndex)

  startBoundary = startBoundary || atStartBlockBoundary($from, depth + 1)
  console.log("[indentRange] startBoundary:", startBoundary)

  if (!startBoundary) {
    const { startIndex, endIndex } = range
    if (endIndex - startIndex === 1) {
      const contentRange = zoomInRange(range)
      console.log("[indentRange] zooming in (start), contentRange:", contentRange ? `depth=${contentRange.depth}` : null)
      return contentRange ? indentRange(contentRange, tr) : false
    } else {
      console.log("[indentRange] splitting (start)")
      return splitAndIndentRange(range, tr, startIndex + 1)
    }
  }

  endBoundary = endBoundary || atEndBlockBoundary($to, depth + 1)
  console.log("[indentRange] endBoundary:", endBoundary)

  if (!endBoundary) {
    const { startIndex, endIndex } = range
    if (endIndex - startIndex === 1) {
      const contentRange = zoomInRange(range)
      console.log("[indentRange] zooming in (end), contentRange:", contentRange ? `depth=${contentRange.depth}` : null)
      return contentRange ? indentRange(contentRange, tr) : false
    } else {
      console.log("[indentRange] splitting (end)")
      return splitAndIndentRange(range, tr, endIndex - 1)
    }
  }

  console.log("[indentRange] calling indentNodeRange")
  return indentNodeRange(range, tr)
}

function splitAndIndentRange(range: NodeRange, tr: Transaction, splitIndex: number): boolean {
  const { $from, $to, depth } = range
  const splitPos = $from.posAtIndex(splitIndex, depth)

  const range1 = $from.blockRange(tr.doc.resolve(splitPos - 1))
  if (!range1) return false

  const getRange2From = mapPos(tr, splitPos + 1)
  const getRange2To = mapPos(tr, $to.pos)

  indentRange(range1, tr, undefined, true)

  const range2 = tr.doc.resolve(getRange2From()).blockRange(tr.doc.resolve(getRange2To()))
  if (range2) indentRange(range2, tr, true, undefined)

  return true
}

function indentNodeRange(range: NodeRange, tr: Transaction): boolean {
  const blockType = getBlockType(tr.doc.type.schema)
  const { parent, startIndex } = range
  const prevChild = startIndex >= 1 && parent.child(startIndex - 1)

  console.log("[indentNodeRange] parent:", parent.type.name, "startIndex:", startIndex)
  console.log("[indentNodeRange] prevChild:", prevChild ? prevChild.type.name : null, "isBlockNode:", prevChild && isBlockNode(prevChild))

  if (prevChild && isBlockNode(prevChild)) {
    const { start, end } = range
    console.log("[indentNodeRange] case 1: appending to prevChild, start:", start, "end:", end)
    tr.step(
      new ReplaceAroundStep(
        start - 1,
        end,
        start,
        end,
        new Slice(Fragment.from(blockType.create(null)), 1, 0),
        0,
        true
      )
    )
    return true
  }

  const isParentBlock = isBlockNode(parent)
  const firstChildInRange = parent.maybeChild(startIndex)
  const isFirstChildBlock = isBlockNode(firstChildInRange)

  console.log("[indentNodeRange] isParentBlock:", isParentBlock, "firstChildInRange:", firstChildInRange?.type.name, "isFirstChildBlock:", isFirstChildBlock)

  if ((startIndex === 0 && isParentBlock) || isFirstChildBlock) {
    const { start, end } = range
    const blockAttrs: BlockAttrs | null = isFirstChildBlock
      ? (firstChildInRange!.attrs as BlockAttrs)
      : isParentBlock
        ? (parent.attrs as BlockAttrs)
        : null
    console.log("[indentNodeRange] case 2: wrapping, start:", start, "end:", end, "blockAttrs:", blockAttrs)
    tr.step(
      new ReplaceAroundStep(
        start,
        end,
        start,
        end,
        new Slice(Fragment.from(blockType.create(blockAttrs)), 0, 0),
        1,
        true
      )
    )
    return true
  }

  console.log("[indentNodeRange] no case matched, returning false")
  return false
}

export const indent = createIndentCommand()
