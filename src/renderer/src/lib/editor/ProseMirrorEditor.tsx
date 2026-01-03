import { onMount, onCleanup, JSX, createEffect } from "solid-js"
import { EditorState, Plugin, Selection, TextSelection } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { history } from "prosemirror-history"
import { gapCursor } from "prosemirror-gapcursor"
import { dropCursor } from "prosemirror-dropcursor"
import { common, createLowlight } from "lowlight"
import { schema } from "./schema"
import { buildKeymap, buildInputRules } from "./keymap"
import { CodeBlockView } from "./nodeviews/CodeBlockView"
import { CardRefView, CardRefOptions } from "./nodeviews/CardRefView"
import { ImageView } from "./nodeviews/ImageView"
import { createBlockNodeView } from "./nodeviews/BlockView"
import { createLowlightPlugin } from "./plugins/lowlight-plugin"
import { createBlockCollapsePlugin } from "./plugins/block-collapse-plugin"
import { createCardRefSuggestionPlugin } from "./plugins/cardref-suggestion-plugin"
import { createCardRefPopupRenderer } from "./plugins/CardRefPopup"
import { createAutoLinkPlugin } from "./plugins/auto-link-plugin"
import { createBacklinkViewPlugin } from "./plugins/backlink-view-plugin"
import { createCollapsedIndicatorPlugin } from "./plugins/collapsed-indicator-plugin"
import { createBlockFocusPlugin } from "./plugins/block-focus-plugin"
import { createClipboardPlugin } from "./plugins/clipboard-plugin"
import { createImagePlugin, createImageSelectionPlugin } from "./plugins/image-plugin"
import { createSearchHighlightPlugin, searchHighlightPluginKey } from "./plugins/search-highlight-plugin"
import { createTimestampHighlightPlugin } from "./plugins/timestamp-highlight-plugin"
import { createClickBelowPlugin } from "./plugins/click-below-plugin"
import { createContextMenuPlugin } from "./plugins/context-menu-plugin"
import { findHighlightRanges } from "@renderer/lib/common/utils/highlight"
import type { EditorContext } from "./EditorContext"
import "./note-editor.css"

const lowlight = createLowlight(common)

export type ProseMirrorEditorHandle = {
  focus: () => void
  focusEnd: () => void
  focusFirstMatch: () => void
  focusEndOfTitle: () => void
  selectTitle: () => void
  scrollToPos: (pos: number) => void
}

export type ProseMirrorEditorProps = {
  ref?: ProseMirrorEditorHandle | ((ref: ProseMirrorEditorHandle) => void)
  context: EditorContext
  backlinkTargetCardId?: string
}

const createPlaceholderPlugin = (placeholder: string) => {
  return new Plugin({
    view(editorView) {
      const updatePlaceholder = () => {
        const doc = editorView.state.doc
        let showPlaceholder = false

        const title = doc.firstChild
        if (title && title.type === schema.nodes.title && !title.textContent) {
          if (doc.childCount === 1) {
            showPlaceholder = true
          } else if (doc.childCount === 2) {
            const secondChild = doc.child(1)
            if (secondChild.type === schema.nodes.block && !secondChild.textContent) {
              showPlaceholder = true
            }
          }
        }

        editorView.dom.setAttribute("data-placeholder", showPlaceholder ? placeholder : "")
      }

      updatePlaceholder()
      return { update: updatePlaceholder }
    }
  })
}

const migrateDocJSON = (json: any): any => {
  if (!json || !json.content) return json

  const newContent: any[] = []
  for (const node of json.content) {
    if (node.type === "title") {
      newContent.push(node)
    } else if (node.type === "block") {
      newContent.push(node)
    } else if (node.type === "paragraph") {
      newContent.push({
        type: "block",
        attrs: { kind: "paragraph", order: null },
        content: [node]
      })
    } else {
      newContent.push({
        type: "block",
        attrs: { kind: "paragraph", order: null },
        content: [{ type: "paragraph", content: node.content }]
      })
    }
  }
  return { ...json, content: newContent }
}

const createDocFromJSON = (json: any): ProseMirrorNode => {
  if (!json || !json.content || json.content.length === 0) {
    return schema.nodes.doc.create(null, [
      schema.nodes.title.create(),
      schema.nodes.block.create(null, schema.nodes.paragraph.create())
    ])
  }
  try {
    const migrated = migrateDocJSON(json)
    return ProseMirrorNode.fromJSON(schema, migrated)
  } catch (e) {
    console.error("Failed to parse document JSON:", e)
    return schema.nodes.doc.create(null, [
      schema.nodes.title.create(),
      schema.nodes.block.create(null, schema.nodes.paragraph.create())
    ])
  }
}

export const ProseMirrorEditor = (props: ProseMirrorEditorProps): JSX.Element => {
  let containerRef: HTMLDivElement | undefined
  let view: EditorView | undefined
  let lastCardId: string | undefined

  const ctx = props.context

  const findFirstMatchPos = (): number | null => {
    if (!view) return null
    const query = ctx.searchQuery ?? ""
    if (!query.trim()) return null

    let firstPos: number | null = null
    view.state.doc.descendants((node, pos) => {
      if (firstPos !== null) return false
      if (node.isText && node.text) {
        const ranges = findHighlightRanges(node.text, query)
        if (ranges.length > 0) {
          firstPos = pos + ranges[0][0]
          return false
        }
      }
      return true
    })
    return firstPos
  }

  const handle: ProseMirrorEditorHandle = {
    focus: () => view?.focus(),
    focusEnd: () => {
      if (!view) return
      view.focus()
      const end = view.state.doc.content.size
      const tr = view.state.tr.setSelection(Selection.near(view.state.doc.resolve(end), -1))
      view.dispatch(tr.scrollIntoView())
    },
    focusFirstMatch: () => {
      if (!view) return
      view.focus()
      const pos = findFirstMatchPos()
      if (pos !== null) {
        const tr = view.state.tr.setSelection(
          Selection.near(view.state.doc.resolve(pos))
        )
        view.dispatch(tr.scrollIntoView())
      }
    },
    focusEndOfTitle: () => {
      if (!view) return
      view.focus()
      const title = view.state.doc.firstChild
      if (title && title.type.name === "title") {
        const end = 1 + title.content.size
        const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, end))
        view.dispatch(tr)
      }
    },
    selectTitle: () => {
      if (!view) return
      view.focus()
      const title = view.state.doc.firstChild
      if (title && title.type.name === "title") {
        const start = 1
        const end = 1 + title.content.size
        const tr = view.state.tr.setSelection(TextSelection.create(view.state.doc, start, end))
        view.dispatch(tr)
      }
    },
    scrollToPos: (pos: number) => {
      if (!view) return
      view.focus()
      const resolvedPos = Math.min(pos, view.state.doc.content.size)
      const tr = view.state.tr.setSelection(Selection.near(view.state.doc.resolve(resolvedPos)))
      view.dispatch(tr.scrollIntoView())
    }
  }

  if (typeof props.ref === "function") props.ref(handle)
  else if (props.ref) Object.assign(props.ref, handle)

  const cardRefOptions: CardRefOptions = {
    onCardClick: (cardId) => ctx.onCardClick(cardId),
    getTitle: (cardId) => ctx.getCardTitle(cardId) ?? "Untitled"
  }

  onMount(() => {
    if (!containerRef) return

    lastCardId = ctx.cardId
    const content = ctx.getCard()?.data?.content
    const doc = createDocFromJSON(content)

    const plugins: Plugin[] = []

    if (ctx.searchCards) {
      plugins.push(
        createCardRefSuggestionPlugin({
          items: ctx.searchCards,
          render: createCardRefPopupRenderer(ctx.searchCards, ctx.createCard)
        })
      )
    }

    plugins.push(
      buildInputRules(),
      buildKeymap(),
      history(),
      gapCursor(),
      dropCursor({ color: "var(--color-ring)" }),
      createPlaceholderPlugin(ctx.placeholder || ""),
      createLowlightPlugin("code_block", lowlight),
      createAutoLinkPlugin(),
      createCollapsedIndicatorPlugin(),
      createBlockFocusPlugin(),
      createBlockCollapsePlugin(),
      createClipboardPlugin(schema),
      createImageSelectionPlugin(),
      createSearchHighlightPlugin(),
      createTimestampHighlightPlugin(),
      createClickBelowPlugin(),
      createContextMenuPlugin()
    )

    plugins.push(createImagePlugin({ getDbPath: () => ctx.dbPath }))

    if (props.backlinkTargetCardId) {
      plugins.push(
        createBacklinkViewPlugin({
          targetCardId: props.backlinkTargetCardId
        })
      )
    }

    const state = EditorState.create({ doc, plugins })

    view = new EditorView(containerRef, {
      state,
      nodeViews: {
        block: (node) => createBlockNodeView(node),
        code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos),
        cardRef: (node, view, getPos) => new CardRefView(node, view, getPos, cardRefOptions),
        image: (node, view, getPos) => new ImageView(node, view, getPos, { getDbPath: () => ctx.dbPath })
      },
      dispatchTransaction(transaction) {
        if (!view) return
        const newState = view.state.apply(transaction)
        view.updateState(newState)

        if (transaction.docChanged) {
          const json = newState.doc.toJSON()
          ctx.updateCard(json)
          ctx.onDocChange?.()
        }
      }
    })
  })

  createEffect(() => {
    if (!view) return

    const cardIdChanged = ctx.cardId !== lastCardId
    lastCardId = ctx.cardId

    if (cardIdChanged) {
      const content = ctx.getCard()?.data?.content
      const doc = createDocFromJSON(content)
      let state = EditorState.create({
        doc,
        plugins: view.state.plugins
      })
      const query = ctx.searchQuery ?? ""
      if (query) {
        state = state.apply(state.tr.setMeta(searchHighlightPluginKey, { query }))
      }
      view.updateState(state)
      return
    }

    const content = ctx.getCard()?.data?.content
    if (!content) return

    const lastSource = ctx.getLastUpdateSource()
    if (lastSource === ctx.editorId) return

    const newJSON = JSON.stringify(content)
    const currentJSON = JSON.stringify(view.state.doc.toJSON())
    if (currentJSON !== newJSON) {
      const doc = createDocFromJSON(content)
      let state = EditorState.create({
        doc,
        plugins: view.state.plugins
      })
      const query = ctx.searchQuery ?? ""
      if (query) {
        state = state.apply(state.tr.setMeta(searchHighlightPluginKey, { query }))
      }
      view.updateState(state)
    }
  })

  createEffect(() => {
    if (!view) return
    const query = ctx.searchQuery ?? ""
    const currentQuery = searchHighlightPluginKey.getState(view.state)?.query ?? ""
    if (query === currentQuery) return
    const tr = view.state.tr.setMeta(searchHighlightPluginKey, { query })
    view.dispatch(tr)
  })

  onCleanup(() => {
    view?.destroy()
  })

  return (
    <div
      ref={containerRef}
      class={`prosemirror-editor ${ctx.class || ""}`}
      onFocusIn={() => ctx.onFocus?.()}
      onFocusOut={(e) => {
        if (!containerRef?.contains(e.relatedTarget as Node)) ctx.onBlur?.()
      }}
    />
  )
}
