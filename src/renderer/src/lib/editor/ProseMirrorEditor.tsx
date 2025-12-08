import { onMount, onCleanup, JSX, createEffect } from "solid-js"
import { EditorState, Plugin } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { Node as ProseMirrorNode } from "prosemirror-model"
import { history } from "prosemirror-history"
import { common, createLowlight } from "lowlight"
import { schema } from "./schema"
import { buildKeymap, buildInputRules } from "./keymap"
import { CodeBlockView } from "./CodeBlockView"
import { createLowlightPlugin } from "./lowlight-plugin"
import "./note-editor.css"

const lowlight = createLowlight(common)

export type ProseMirrorEditorProps = {
  content?: object
  onUpdate?: (json: object) => void
  placeholder?: string
  class?: string
  editorId?: string
  getLastUpdateSource?: () => string | undefined
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

  onMount(() => {
    if (!containerRef) return

    const doc = createDocFromJSON(props.content)

    const state = EditorState.create({
      doc,
      plugins: [
        buildInputRules(),
        buildKeymap(),
        history(),
        createPlaceholderPlugin(props.placeholder || ""),
        createLowlightPlugin("code_block", lowlight)
      ]
    })

    view = new EditorView(containerRef, {
      state,
      nodeViews: {
        code_block: (node, view, getPos) => new CodeBlockView(node, view, getPos)
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
      const state = EditorState.create({
        doc,
        plugins: view.state.plugins
      })
      view.updateState(state)
    }
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
