import { Plugin, PluginKey } from "prosemirror-state"
import type { EditorView } from "prosemirror-view"
import { Fragment } from "prosemirror-model"
import { serializeSliceToMarkdown } from "../markdown/serializer"
import { parseMarkdownToBlocks } from "../markdown/parser"
import { schema } from "../schema"
import { showLinkEditDialog } from "../components/LinkEditDialog"

export const contextMenuPluginKey = new PluginKey("contextMenu")

type MenuAction =
  | "copy" | "copyPlain" | "copyMarkdown"
  | "cut" | "paste" | "pastePlain" | "pasteMarkdown"
  | "addLink" | "editLink"
  | null

async function getClipboardText(): Promise<string> {
  try {
    return await navigator.clipboard.readText()
  } catch {
    return ""
  }
}

async function writeToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch (e) {
    console.error("Failed to write to clipboard", e)
  }
}

function getSelectionText(view: EditorView): string {
  const { from, to } = view.state.selection
  return view.state.doc.textBetween(from, to, "\n")
}

function getSelectionMarkdown(view: EditorView): string {
  const { from, to } = view.state.selection
  const slice = view.state.doc.slice(from, to)
  return serializeSliceToMarkdown(slice)
}

function deleteSelection(view: EditorView): void {
  const { from, to, empty } = view.state.selection
  if (empty) return
  const tr = view.state.tr.delete(from, to)
  view.dispatch(tr)
}

function insertText(view: EditorView, text: string): void {
  const { from, to } = view.state.selection
  const tr = view.state.tr.replaceWith(from, to, schema.text(text))
  view.dispatch(tr)
}

function insertMarkdown(view: EditorView, markdown: string): void {
  const { from, to } = view.state.selection
  const blocks = parseMarkdownToBlocks(markdown)
  if (blocks.length === 0) return

  if (blocks.length === 1) {
    const block = blocks[0]
    const paragraph = block.firstChild
    if (paragraph && paragraph.type === schema.nodes.paragraph) {
      const tr = view.state.tr.replaceWith(from, to, paragraph.content)
      view.dispatch(tr)
      return
    }
  }

  const fragment = Fragment.from(blocks)
  const tr = view.state.tr.replaceWith(from, to, fragment)
  view.dispatch(tr)
}

type LinkInfo = {
  from: number
  to: number
  href: string
  text: string
} | null

function getLinkAtSelection(view: EditorView): LinkInfo {
  const { from, to, empty } = view.state.selection
  const $from = view.state.doc.resolve(from)

  const linkMark = schema.marks.link
  let foundLink: LinkInfo = null

  if (empty) {
    const marks = $from.marks()
    const link = marks.find((m) => m.type === linkMark)
    if (link) {
      let start = from
      let end = from
      const parent = $from.parent
      const parentStart = $from.start()

      parent.forEach((node, offset) => {
        const nodeStart = parentStart + offset
        const nodeEnd = nodeStart + node.nodeSize
        if (nodeStart <= from && from <= nodeEnd) {
          if (node.marks.some((m) => m.type === linkMark && m.attrs.href === link.attrs.href)) {
            start = nodeStart
            end = nodeEnd
          }
        }
      })

      foundLink = {
        from: start,
        to: end,
        href: link.attrs.href,
        text: view.state.doc.textBetween(start, end)
      }
    }
  } else {
    const marks = $from.marksAcross(view.state.doc.resolve(to)) || []
    const link = marks.find((m) => m.type === linkMark)
    if (link) {
      foundLink = {
        from,
        to,
        href: link.attrs.href,
        text: view.state.doc.textBetween(from, to)
      }
    }
  }

  return foundLink
}

async function handleAddLink(view: EditorView): Promise<void> {
  const { from, to } = view.state.selection
  const selectedText = view.state.doc.textBetween(from, to)

  const result = await showLinkEditDialog("", selectedText, false)
  if (!result || !result.url.trim()) return

  const linkMark = schema.marks.link.create({ href: result.url })
  const textNode = schema.text(result.text || result.url, [linkMark])
  const tr = view.state.tr.replaceWith(from, to, textNode)
  view.dispatch(tr)
  view.focus()
}

async function handleEditLink(view: EditorView, linkInfo: LinkInfo): Promise<void> {
  if (!linkInfo) return

  const result = await showLinkEditDialog(linkInfo.href, linkInfo.text, true)
  if (!result) {
    view.focus()
    return
  }

  const { from, to } = linkInfo

  if (!result.url.trim()) {
    const textNode = schema.text(result.text || linkInfo.text)
    const tr = view.state.tr.replaceWith(from, to, textNode)
    view.dispatch(tr)
  } else {
    const linkMark = schema.marks.link.create({ href: result.url })
    const textNode = schema.text(result.text || result.url, [linkMark])
    const tr = view.state.tr.replaceWith(from, to, textNode)
    view.dispatch(tr)
  }
  view.focus()
}

async function handleAction(action: MenuAction, view: EditorView, linkInfo: LinkInfo): Promise<void> {
  switch (action) {
    case "copy": {
      const text = getSelectionText(view)
      const markdown = getSelectionMarkdown(view)
      try {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/plain": new Blob([text], { type: "text/plain" }),
            "text/html": new Blob([`<pre data-markdown="${encodeURIComponent(markdown)}">${text}</pre>`], { type: "text/html" })
          })
        ])
      } catch {
        await writeToClipboard(text)
      }
      break
    }
    case "copyPlain": {
      const text = getSelectionText(view)
      await writeToClipboard(text)
      break
    }
    case "copyMarkdown": {
      const markdown = getSelectionMarkdown(view)
      await writeToClipboard(markdown)
      break
    }
    case "cut": {
      const text = getSelectionText(view)
      await writeToClipboard(text)
      deleteSelection(view)
      break
    }
    case "paste": {
      const text = await getClipboardText()
      if (text) insertText(view, text)
      break
    }
    case "pastePlain": {
      const text = await getClipboardText()
      if (text) insertText(view, text)
      break
    }
    case "pasteMarkdown": {
      const text = await getClipboardText()
      if (text) insertMarkdown(view, text)
      break
    }
    case "addLink": {
      await handleAddLink(view)
      break
    }
    case "editLink": {
      await handleEditLink(view, linkInfo)
      break
    }
  }
}

async function showContextMenu(view: EditorView, event: MouseEvent): Promise<void> {
  event.preventDefault()

  const { empty } = view.state.selection
  const hasSelection = !empty
  const linkInfo = getLinkAtSelection(view)
  const hasLink = linkInfo !== null

  const items = [
    ...(hasSelection
      ? [
          { id: "cut", label: "Cut" },
          { id: "copy", label: "Copy" },
          { id: "copyPlain", label: "Copy as Plain Text" },
          { id: "copyMarkdown", label: "Copy as Markdown" },
          { id: "sep1", label: "", type: "separator" as const }
        ]
      : []),
    { id: "paste", label: "Paste" },
    { id: "pastePlain", label: "Paste as Plain Text" },
    { id: "pasteMarkdown", label: "Paste as Markdown" },
    { id: "sep2", label: "", type: "separator" as const },
    ...(hasLink
      ? [{ id: "editLink", label: "Edit Link..." }]
      : hasSelection
        ? [{ id: "addLink", label: "Add Link..." }]
        : [])
  ]

  const action = await window.api.contextMenu.show(items)
  if (action) await handleAction(action as MenuAction, view, linkInfo)
}

export function createContextMenuPlugin(): Plugin {
  return new Plugin({
    key: contextMenuPluginKey,
    props: {
      handleDOMEvents: {
        contextmenu(view, event) {
          showContextMenu(view, event)
          return true
        }
      }
    }
  })
}
