import type { StObjectId } from "@renderer/lib/common/storage-types"
import type { BlockContext } from "./types"

export function extractCardRefs(content: any): StObjectId[] {
  const refs: StObjectId[] = []

  function traverse(node: any) {
    if (!node) return
    if (node.type === 'cardRef' && node.attrs?.cardId) {
      refs.push(node.attrs.cardId)
    }
    if (Array.isArray(node.content)) {
      node.content.forEach(traverse)
    }
  }

  traverse(content)
  return [...new Set(refs)]
}

function nodeContainsCardRef(node: any, targetCardId: StObjectId): boolean {
  if (!node) return false
  if (node.type === 'cardRef' && node.attrs?.cardId === targetCardId) return true
  if (Array.isArray(node.content)) {
    return node.content.some((child: any) => nodeContainsCardRef(child, targetCardId))
  }
  return false
}

function nodeContainsText(node: any, searchText: string): boolean {
  if (!node) return false
  if (node.type === 'text' && node.text) {
    return node.text.toLowerCase().includes(searchText.toLowerCase())
  }
  if (Array.isArray(node.content)) {
    return node.content.some((child: any) => nodeContainsText(child, searchText))
  }
  return false
}

function collectIndentedChildren(blocks: any[], startIndex: number, baseIndent: number): number[] {
  const children: number[] = []
  for (let i = startIndex + 1; i < blocks.length; i++) {
    const indent = blocks[i].attrs?.indent || 0
    if (indent > baseIndent) {
      children.push(i)
    } else {
      break
    }
  }
  return children
}

export function extractBlocksWithCardRef(content: any, targetCardId: StObjectId): BlockContext[] {
  if (!content?.content) return []

  const blocks = content.content as any[]
  const result: BlockContext[] = []
  const includedIndices = new Set<number>()

  for (let i = 0; i < blocks.length; i++) {
    if (includedIndices.has(i)) continue

    const block = blocks[i]
    if (nodeContainsCardRef(block, targetCardId)) {
      includedIndices.add(i)
      result.push({ nodeIndex: i, node: block, isMatch: true })

      const baseIndent = block.attrs?.indent || 0
      const childIndices = collectIndentedChildren(blocks, i, baseIndent)
      for (const idx of childIndices) {
        if (!includedIndices.has(idx)) {
          includedIndices.add(idx)
          result.push({ nodeIndex: idx, node: blocks[idx], isMatch: false })
        }
      }
    }
  }

  return result
}

export function extractBlocksWithText(content: any, searchText: string): BlockContext[] {
  if (!content?.content || !searchText.trim()) return []

  const blocks = content.content as any[]
  const result: BlockContext[] = []
  const includedIndices = new Set<number>()

  for (let i = 0; i < blocks.length; i++) {
    if (includedIndices.has(i)) continue

    const block = blocks[i]
    if (nodeContainsText(block, searchText)) {
      includedIndices.add(i)
      result.push({ nodeIndex: i, node: block, isMatch: true })

      const baseIndent = block.attrs?.indent || 0
      const childIndices = collectIndentedChildren(blocks, i, baseIndent)
      for (const idx of childIndices) {
        if (!includedIndices.has(idx)) {
          includedIndices.add(idx)
          result.push({ nodeIndex: idx, node: blocks[idx], isMatch: false })
        }
      }
    }
  }

  return result
}
