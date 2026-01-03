import { NodeRange, Node as PMNode } from "prosemirror-model"
import { Command, TextSelection } from "prosemirror-state"
import { canSplit } from "prosemirror-transform"
import { getBlockType, isBlockNode, BlockAttrs, schema } from "../schema"
import { atTextblockStart } from "./utils"
import { dedentNodeRange } from "./dedent"
import { fixBlocks } from "./auto-fix"

function deriveBlockAttrs(blockNode: PMNode): BlockAttrs {
  return { kind: (blockNode.attrs as BlockAttrs).kind, order: null, collapsed: false, checked: null }
}

export const splitBlock: Command = (state, dispatch): boolean => {
  const { $from, $to } = state.selection
  if (!$from.sameParent($to)) return false

  const parent = $from.parent

  // 1. 代码块中：插入换行
  if (parent.type === schema.nodes.code_block) {
    if (dispatch) {
      const tr = state.tr.replaceSelectionWith(schema.text("\n"), true)
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  // 标题中：按 Enter 跳到第一个 block 或创建新 block
  if (parent.type === schema.nodes.title) {
    if (dispatch) {
      const tr = state.tr
      const doc = state.doc

      const hasOnlyOneEmptyBlock = doc.childCount === 2 && (() => {
        const firstBlock = doc.child(1)
        return isBlockNode(firstBlock) &&
          firstBlock.childCount === 1 &&
          firstBlock.firstChild?.type === schema.nodes.paragraph &&
          firstBlock.firstChild?.content.size === 0
      })()

      if (hasOnlyOneEmptyBlock) {
        const blockPos = $from.after() + 2
        tr.setSelection(TextSelection.create(tr.doc, blockPos))
        dispatch(tr.scrollIntoView())
        return true
      }

      const titleEnd = $from.end()
      const contentAfter = parent.cut($from.parentOffset)
      const afterTitle = $from.after()

      const paragraph = contentAfter.content.size > 0
        ? schema.nodes.paragraph.create(null, contentAfter.content)
        : schema.nodes.paragraph.create()
      const newBlock = schema.nodes.block.create({ kind: "paragraph", order: null, collapsed: false }, paragraph)

      tr.insert(afterTitle, newBlock)

      if ($from.parentOffset < parent.content.size) {
        const mappedPos = tr.mapping.map($from.pos)
        const mappedEnd = tr.mapping.map(titleEnd)
        tr.delete(mappedPos, mappedEnd)
      }

      tr.setSelection(TextSelection.create(tr.doc, afterTitle + 2))
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  // 段落中
  if (parent.type !== schema.nodes.paragraph) return false
  if ($from.depth < 2) return false

  const blockDepth = $from.depth - 1
  const blockNode = $from.node(blockDepth)
  if (!isBlockNode(blockNode)) return false

  const blockAttrs = blockNode.attrs as BlockAttrs
  const paragraphEmpty = parent.content.size === 0
  const indexInBlock = $from.index(blockDepth)

  // 2. 段落非空或在段落中间/末尾：分割段落
  if (!paragraphEmpty || indexInBlock > 0) {
    if (dispatch) {
      const tr = state.tr
      tr.delete(tr.selection.from, tr.selection.to)

      const { $from: newFrom } = tr.selection
      const atEnd = newFrom.parentOffset === newFrom.parent.content.size
      const newAttrs = deriveBlockAttrs(blockNode)
      const blockType = getBlockType(state.schema)

      if (indexInBlock > 0) {
        // 段落不是 block 的第一个子节点，在 block 后面插入新 block
        const blockPos = newFrom.after(blockDepth)
        const contentAfter = atEnd ? undefined : newFrom.parent.cut(newFrom.parentOffset)
        const paragraph = contentAfter
          ? schema.nodes.paragraph.create(null, contentAfter.content)
          : schema.nodes.paragraph.create()
        const newBlock = blockType.create(newAttrs, paragraph)
        tr.insert(blockPos, newBlock)
        if (!atEnd) tr.delete(newFrom.pos, newFrom.end())
        tr.setSelection(TextSelection.create(tr.doc, blockPos + 2))
      } else {
        // 段落是 block 的第一个子节点，使用 split
        const typesAfter = [
          { type: blockType, attrs: newAttrs },
          atEnd ? { type: schema.nodes.paragraph } : null
        ]

        if (canSplit(tr.doc, newFrom.pos, 2, typesAfter)) {
          tr.split(newFrom.pos, 2, typesAfter)
        }
      }

      fixBlocks(tr)
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  // 3 & 4. 空段落在 block 开头
  // 3. 空 bullet/ordered/quote：转为普通块
  if (blockAttrs.kind !== "paragraph") {
    if (dispatch) {
      const tr = state.tr
      const blockPos = $from.before(blockDepth)
      tr.setNodeMarkup(blockPos, undefined, { kind: "paragraph", order: null, collapsed: false })
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  // 4. 空普通块：尝试减少缩进
  const blockParentDepth = blockDepth - 1
  const blockParent = $from.node(blockParentDepth)

  if (isBlockNode(blockParent)) {
    // 嵌套在另一个 block 中，dedent
    if (dispatch) {
      const tr = state.tr
      const $blockEnd = state.doc.resolve($from.end(blockDepth))
      const range = new NodeRange($from, $blockEnd, blockDepth)
      if (dedentNodeRange(range, tr)) {
        fixBlocks(tr)
        dispatch(tr.scrollIntoView())
      }
    }
    return true
  }

  // 5. 已经在最外层，在下方创建新块
  if (dispatch) {
    const tr = state.tr
    const blockType = getBlockType(state.schema)
    const blockPos = $from.after(blockDepth)
    const newBlock = blockType.create(
      { kind: "paragraph", order: null, collapsed: false },
      schema.nodes.paragraph.create()
    )
    tr.insert(blockPos, newBlock)
    tr.setSelection(TextSelection.create(tr.doc, blockPos + 2))
    dispatch(tr.scrollIntoView())
  }
  return true
}

export const joinBlockUp: Command = (state, dispatch, view) => {
  const $cursor = atTextblockStart(state, view)
  if (!$cursor) return false

  const parent = $cursor.parent

  // 空代码块：转为段落
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

  if (indexInBlock === 0 && parentEmpty) {
    // 空段落在 block 开头，删除并移到前一个位置
    if (isNestedInBlock) {
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
        fixBlocks(tr)
        dispatch(tr.scrollIntoView())
      }
      return true
    }

    // 非空 bullet/ordered/quote 转普通块
    if (blockAttrs.kind !== "paragraph") {
      if (dispatch) {
        const tr = state.tr
        const blockPos = $cursor.before(blockDepth)
        tr.setNodeMarkup(blockPos, undefined, { kind: "paragraph", order: null, collapsed: false })
        dispatch(tr)
      }
      return true
    }

    // 已经是普通块且在最外层，尝试 dedent（实际上已经没法再 dedent 了）
    return false
  }

  return false
}
