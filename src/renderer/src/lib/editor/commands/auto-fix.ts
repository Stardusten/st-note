import { Transaction } from "prosemirror-state"
import { canJoin, canSplit } from "prosemirror-transform"
import { Node as PMNode } from "prosemirror-model"
import { isBlockNode } from "../schema"

function* getTransactionRanges(tr: Transaction): Generator<number[], never> {
  const ranges: number[] = []
  let i = 0

  while (true) {
    for (; i < tr.mapping.maps.length; i++) {
      const map = tr.mapping.maps[i]
      for (let j = 0; j < ranges.length; j++) {
        ranges[j] = map.map(ranges[j])
      }
      map.forEach((_oldStart, _oldEnd, newStart, newEnd) =>
        ranges.push(newStart, newEnd)
      )
    }
    yield ranges
  }
}

function findBoundaries(
  positions: number[],
  doc: PMNode,
  prediction: (before: PMNode, after: PMNode, parent: PMNode, index: number) => boolean
): number[] {
  const boundaries = new Set<number>()
  const joinable: number[] = []

  for (const pos of positions) {
    const $pos = doc.resolve(pos)
    for (let depth = $pos.depth; depth >= 0; depth--) {
      const boundary = $pos.before(depth + 1)
      if (boundaries.has(boundary)) break
      boundaries.add(boundary)

      const index = $pos.index(depth)
      const parent = $pos.node(depth)

      const before = parent.maybeChild(index - 1)
      if (!before) continue

      const after = parent.maybeChild(index)
      if (!after) continue

      if (prediction(before, after, parent, index)) {
        joinable.push(boundary)
      }
    }
  }

  return joinable.sort((a, b) => b - a)
}

function isBlockJoinable(before: PMNode, after: PMNode): boolean {
  return isBlockNode(before) && isBlockNode(after) && isBlockNode(after.firstChild)
}

function isBlockSplitable(before: PMNode, after: PMNode, parent: PMNode, index: number): boolean {
  if (index === 1 && isBlockNode(parent) && isBlockNode(before) && !isBlockNode(after)) {
    return true
  }
  return false
}

export function fixBlocks(tr: Transaction): Transaction {
  const ranges = getTransactionRanges(tr)

  const joinable = findBoundaries(ranges.next().value, tr.doc, isBlockJoinable)
  for (const pos of joinable) {
    if (canJoin(tr.doc, pos)) {
      tr.join(pos)
    }
  }

  const splitable = findBoundaries(ranges.next().value, tr.doc, isBlockSplitable)
  for (const pos of splitable) {
    if (canSplit(tr.doc, pos)) {
      tr.split(pos)
    }
  }

  return tr
}
