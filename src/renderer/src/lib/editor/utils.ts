import { NodeRange, ResolvedPos, Node as PMNode } from "prosemirror-model"
import { Transaction, EditorState, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { liftTarget } from "prosemirror-transform"
import { isBlockNode } from "./schema"

export function atStartBlockBoundary($pos: ResolvedPos, depth: number): boolean {
  for (let d = depth; d <= $pos.depth; d++) {
    if ($pos.node(d).isTextblock) continue
    if ($pos.index(d) !== 0) return false
  }
  return true
}

export function atEndBlockBoundary($pos: ResolvedPos, depth: number): boolean {
  for (let d = depth; d <= $pos.depth; d++) {
    if ($pos.node(d).isTextblock) continue
    if ($pos.index(d) !== $pos.node(d).childCount - 1) return false
  }
  return true
}

export function zoomInRange(range: NodeRange): NodeRange | null {
  const { $from, $to, depth, start, end } = range
  const doc = $from.doc
  const deeper = (
    $from.pos > start ? $from : doc.resolve(start + 1)
  ).blockRange($to.pos < end ? $to : doc.resolve(end - 1))
  if (deeper && deeper.depth > depth) return deeper
  return null
}

export function mapPos(tr: Transaction, pos: number) {
  let nextStepIndex = tr.steps.length
  return (): number => {
    if (nextStepIndex < tr.steps.length) {
      const mapping = tr.mapping.slice(nextStepIndex)
      nextStepIndex = tr.steps.length
      pos = mapping.map(pos)
    }
    return pos
  }
}

export function safeLift(tr: Transaction, range: NodeRange): boolean {
  const target = liftTarget(range)
  if (target == null) return false
  tr.lift(range, target)
  return true
}

export function findBlocksRange($from: ResolvedPos, $to: ResolvedPos = $from): NodeRange | null {
  if ($to.pos < $from.pos) return findBlocksRange($to, $from)
  let range = $from.blockRange($to)
  while (range) {
    if (isBlocksRange(range)) return range
    if (range.depth <= 0) break
    range = new NodeRange($from, $to, range.depth - 1)
  }
  return null
}

export function isBlocksRange(range: NodeRange): boolean {
  const { startIndex, endIndex, parent } = range
  for (let i = startIndex; i < endIndex; i++) {
    if (!isBlockNode(parent.child(i))) return false
  }
  return true
}

export function atTextblockStart(state: EditorState, view?: EditorView): ResolvedPos | null {
  const { $cursor } = state.selection as TextSelection
  if (!$cursor || (view ? !view.endOfTextblock("backward", state) : $cursor.parentOffset > 0))
    return null
  return $cursor
}

export function createAndFill(type: PMNode["type"], attrs?: Record<string, unknown>) {
  const node = type.createAndFill(attrs)
  if (!node) throw new RangeError(`Failed to create '${type.name}' node`)
  node.check()
  return node
}
