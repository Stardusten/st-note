import { onMount, onCleanup, JSX, createEffect } from "solid-js"
import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { history } from "prosemirror-history"
import { common, createLowlight } from "lowlight"
import { schema } from "./schema"
import { buildKeymap, buildInputRules } from "./keymap"
import { CodeBlockView } from "./nodeviews/CodeBlockView"
import { CardRefView, CardRefOptions } from "./nodeviews/CardRefView"
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
import { createSearchHighlightPlugin, searchHighlightPluginKey } from "./plugins/search-highlight-plugin"
import "./note-editor.css"

const lowlight = createLowlight(common)

export type ProseMirrorEditorProps = {
  content?: object
  onUpdate?: (json: object) => void
  placeholder?: string
  class?: string
  editorId?: string
  getLastUpdateSource?: () => string | undefined
  getCardSuggestions?: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
  onCardClick?: (cardId: string) => void
  getCardTitle?: (cardId: string) => string
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

  const cardRefOptions: CardRefOptions = {
    onCardClick: (cardId) => props.onCardClick?.(cardId),
    getTitle: (cardId) => props.getCardTitle?.(cardId) ?? "Untitled"
  }

  onMount(() => {
    if (!containerRef) return

    const doc = createDocFromJSON(props.content)

    const plugins: Plugin[] = []

    if (props.getCardSuggestions) {
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
      createPlaceholderPlugin(props.placeholder || ""),
      createLowlightPlugin("code_block", lowlight),
      createAutoLinkPlugin(),
      createCollapsedIndicatorPlugin(),
      createBlockFocusPlugin(),
      createBlockCollapsePlugin(),
      createClipboardPlugin(schema),
      createSearchHighlightPlugin()
    )

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
        cardRef: (node, view, getPos) => new CardRefView(node, view, getPos, cardRefOptions)
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
    if (!view || !props.content) return

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
    />
  )
}
