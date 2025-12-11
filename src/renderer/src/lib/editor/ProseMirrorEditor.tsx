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
import { createCardRefSuggestionPlugin, CardSuggestionItem } from "./plugins/cardref-suggestion-plugin"
import { createCardRefPopupRenderer } from "./plugins/CardRefPopup"
import { createAutoLinkPlugin } from "./plugins/auto-link-plugin"
import { createBacklinkViewPlugin } from "./plugins/backlink-view-plugin"
import { createCollapsedIndicatorPlugin } from "./plugins/collapsed-indicator-plugin"
import { createBlockFocusPlugin } from "./plugins/block-focus-plugin"
import { createClipboardPlugin } from "./plugins/clipboard-plugin"
import { createImagePlugin, createImageSelectionPlugin } from "./plugins/image-plugin"
import { createSearchHighlightPlugin, searchHighlightPluginKey } from "./plugins/search-highlight-plugin"
import { createTimestampHighlightPlugin } from "./plugins/timestamp-highlight-plugin"
import { findHighlightRanges } from "@renderer/lib/common/utils/highlight"
import "./note-editor.css"

const lowlight = createLowlight(common)

export type ProseMirrorEditorHandle = {
  focus: () => void
  focusFirstMatch: () => void
  selectTitle: () => void
}

export type ProseMirrorEditorProps = {
  ref?: ProseMirrorEditorHandle | ((ref: ProseMirrorEditorHandle) => void)
  cardId?: string
  content?: object
  onUpdate?: (json: object) => void
  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  class?: string
  editorId?: string
  getLastUpdateSource?: () => string | undefined
  getCardSuggestions?: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
  onCardClick?: (cardId: string) => void
  getCardTitle?: (cardId: string) => string
  getDbPath?: () => string
  backlinkTargetCardId?: string
  searchQuery?: string
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

  const findFirstMatchPos = (): number | null => {
    if (!view) return null
    const query = props.searchQuery ?? ""
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
    }
  }

  if (typeof props.ref === "function") props.ref(handle)
  else if (props.ref) Object.assign(props.ref, handle)

  const cardRefOptions: CardRefOptions = {
    onCardClick: (cardId) => props.onCardClick?.(cardId),
    getTitle: (cardId) => props.getCardTitle?.(cardId) ?? "Untitled"
  }

  onMount(() => {
    if (!containerRef) return

    lastCardId = props.cardId
    const doc = createDocFromJSON(props.content)

    const plugins: Plugin[] = []

    console.log("[ProseMirrorEditor] onMount, getCardSuggestions:", !!props.getCardSuggestions)

    if (props.getCardSuggestions) {
      console.log("[ProseMirrorEditor] Adding cardref suggestion plugin")
      plugins.push(
        createCardRefSuggestionPlugin({
          items: props.getCardSuggestions,
          render: createCardRefPopupRenderer(props.getCardSuggestions, props.onCreateCard)
        })
      )
    }

    plugins.push(
      buildInputRules(),
      buildKeymap(),
      history(),
      gapCursor(),
      dropCursor({ color: "var(--color-ring)" }),
      createPlaceholderPlugin(props.placeholder || ""),
      createLowlightPlugin("code_block", lowlight),
      createAutoLinkPlugin(),
      createCollapsedIndicatorPlugin(),
      createBlockFocusPlugin(),
      createBlockCollapsePlugin(),
      createClipboardPlugin(schema),
      createImageSelectionPlugin(),
      createSearchHighlightPlugin(),
      createTimestampHighlightPlugin()
    )

    if (props.getDbPath) {
      plugins.push(createImagePlugin({ getDbPath: props.getDbPath }))
    }

    if (props.backlinkTargetCardId) {
      plugins.push(
        createBacklinkViewPlugin({
          targetCardId: props.backlinkTargetCardId
        })
      )
    }

    const state = EditorState.create({ doc, plugins })

    const imageViewOptions = props.getDbPath ? { getDbPath: props.getDbPath } : null

    view = new EditorView(containerRef, {
      state,
      nodeViews: {
        block: (node) => createBlockNodeView(node),
        code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos),
        cardRef: (node, view, getPos) => new CardRefView(node, view, getPos, cardRefOptions),
        ...(imageViewOptions && {
          image: (node, view, getPos) => new ImageView(node, view, getPos, imageViewOptions)
        })
      },
      dispatchTransaction(transaction) {
        if (!view) return
        const newState = view.state.apply(transaction)
        view.updateState(newState)

        if (transaction.docChanged && props.onUpdate) {
          const json = newState.doc.toJSON()
          props.onUpdate(json)
        }
      }
    })
  })

  createEffect(() => {
    if (!view) return

    const cardIdChanged = props.cardId !== lastCardId
    lastCardId = props.cardId

    if (cardIdChanged) {
      const doc = createDocFromJSON(props.content)
      let state = EditorState.create({
        doc,
        plugins: view.state.plugins
      })
      const query = props.searchQuery ?? ""
      if (query) {
        state = state.apply(state.tr.setMeta(searchHighlightPluginKey, { query }))
      }
      view.updateState(state)
      return
    }

    if (!props.content) return

    if (props.editorId && props.getLastUpdateSource) {
      const lastSource = props.getLastUpdateSource()
      if (lastSource === props.editorId) return
    }

    const newJSON = JSON.stringify(props.content)
    const currentJSON = JSON.stringify(view.state.doc.toJSON())
    if (currentJSON !== newJSON) {
      console.log("[ProseMirrorEditor] createEffect: content changed externally, resetting state")
      const doc = createDocFromJSON(props.content)
      let state = EditorState.create({
        doc,
        plugins: view.state.plugins
      })
      const query = props.searchQuery ?? ""
      if (query) {
        state = state.apply(state.tr.setMeta(searchHighlightPluginKey, { query }))
      }
      view.updateState(state)
    }
  })

  createEffect(() => {
    if (!view) return
    const query = props.searchQuery ?? ""
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
      class={`prosemirror-editor ${props.class || ""}`}
      onFocusIn={() => props.onFocus?.()}
      onFocusOut={(e) => {
        if (!containerRef?.contains(e.relatedTarget as Node)) props.onBlur?.()
      }}
    />
  )
}
