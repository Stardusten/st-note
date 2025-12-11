import { Plugin, NodeSelection, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { schema } from "../schema"

export type ImagePluginOptions = {
  getDbPath: () => string
}

async function insertImageFile(view: EditorView, file: File, dbPath: string, dropPos?: number) {
  const id = crypto.randomUUID()
  const buffer = new Uint8Array(await file.arrayBuffer())
  const filename = file.name || null
  await window.api.file.insert(dbPath, id, filename, file.type, buffer)

  const imageNode = schema.nodes.image.create({ fileId: id })
  const { state } = view
  const { $from } = state.selection

  if (dropPos !== undefined) {
    const blockNode = schema.nodes.block.create({ kind: "paragraph" }, imageNode)
    view.dispatch(state.tr.insert(dropPos, blockNode))
    return
  }

  const parentBlock = $from.depth >= 1 ? $from.node($from.depth - 1) : null
  const isInParagraph = $from.parent.type === schema.nodes.paragraph
  const isEmptyParagraph = isInParagraph && $from.parent.content.size === 0
  const isParentBlock = parentBlock?.type === schema.nodes.block

  if (isEmptyParagraph && isParentBlock) {
    const paragraphStart = $from.before($from.depth)
    const paragraphEnd = $from.after($from.depth)
    view.dispatch(state.tr.replaceWith(paragraphStart, paragraphEnd, imageNode))
  } else if (isParentBlock) {
    const blockEnd = $from.after($from.depth - 1)
    const newBlock = schema.nodes.block.create(parentBlock!.attrs, imageNode)
    view.dispatch(state.tr.insert(blockEnd, newBlock))
  } else {
    const blockNode = schema.nodes.block.create({ kind: "paragraph" }, imageNode)
    view.dispatch(state.tr.insert($from.pos, blockNode))
  }
}

export function createImagePlugin(options: ImagePluginOptions): Plugin {
  return new Plugin({
    props: {
      handleDrop(view, event, _slice, moved) {
        if (moved || !event.dataTransfer?.files.length) return false

        const file = event.dataTransfer.files[0]
        if (!file.type.startsWith("image/")) return false

        event.preventDefault()
        const coords = view.posAtCoords({ left: event.clientX, top: event.clientY })
        insertImageFile(view, file, options.getDbPath(), coords?.pos)
        return true
      },
      handlePaste(view, event) {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile()
            if (file) {
              event.preventDefault()
              insertImageFile(view, file, options.getDbPath())
              return true
            }
          }
        }
        return false
      }
    }
  })
}

export function createImageSelectionPlugin(): Plugin {
  return new Plugin({
    appendTransaction(_transactions, _oldState, newState) {
      const sel = newState.selection
      const { $from } = sel

      // Case 1: NodeSelection on a block containing only an image -> select the image
      if (sel instanceof NodeSelection) {
        const node = sel.node
        if (node.type === schema.nodes.block && node.childCount === 1) {
          const child = node.firstChild
          if (child?.type === schema.nodes.image) {
            return newState.tr.setSelection(NodeSelection.create(newState.doc, $from.pos + 1))
          }
        }
        return null
      }

      // Case 2: TextSelection adjacent to an image -> select the image
      if (!(sel instanceof TextSelection) || !sel.empty) return null

      const parent = $from.parent
      if (parent.type !== schema.nodes.block) return null

      const nodeAfter = $from.nodeAfter
      const nodeBefore = $from.nodeBefore

      if (nodeAfter?.type === schema.nodes.image) {
        return newState.tr.setSelection(NodeSelection.create(newState.doc, $from.pos))
      }

      if (nodeBefore?.type === schema.nodes.image) {
        return newState.tr.setSelection(NodeSelection.create(newState.doc, $from.pos - nodeBefore.nodeSize))
      }

      return null
    }
  })
}
