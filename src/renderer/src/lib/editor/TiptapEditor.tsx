import { Component, onMount, onCleanup, createEffect } from "solid-js"
import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import Dropcursor from "@tiptap/extension-dropcursor"
import Link from "@tiptap/extension-link"
import GlobalDragHandle from "tiptap-extension-global-drag-handle"
import { CustomDocument } from "./extensions/CustomDocument"
import { Title } from "./extensions/Title"
import { BetterIndent } from "./extensions/BetterIndent"
import { BulletListItemBlock } from "./extensions/BulletListItemBlock"
import { NumberedListItemBlock } from "./extensions/NumberedListItemBlock"
import { CardRef } from "./extensions/CardRef"
import { CardRefSuggestion, type CardSuggestionItem } from "./extensions/CardRefSuggestion"
import { createCardRefPopupRenderer } from "./extensions/CardRefPopup"
import { CodeBlock } from "./extensions/CodeBlockLowlight"
import { AutoLink } from "./extensions/AutoLink"

type TiptapEditorProps = {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  titlePlaceholder?: string
  class?: string
  searchCards?: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  onCardClick?: (cardId: string) => void
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
}

const TiptapEditor: Component<TiptapEditorProps> = (props) => {
  let editorElement: HTMLDivElement | undefined
  let editor: Editor | null = null

  const defaultSearchCards = () => [] as CardSuggestionItem[]
  const getSearchCards = () => props.searchCards || defaultSearchCards
  const getCreateCard = () => props.onCreateCard

  onMount(() => {
    if (!editorElement) return

    const popupRenderer = createCardRefPopupRenderer(
      (query) => getSearchCards()(query),
      (title) => getCreateCard()?.(title) ?? Promise.resolve(null)
    )

    editor = new Editor({
      element: editorElement,
      extensions: [
        CustomDocument,
        Title,
        StarterKit.configure({
          document: false,
          heading: { levels: [2, 3] },
          dropcursor: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          codeBlock: false
        }),
        CodeBlock,
        BulletListItemBlock,
        NumberedListItemBlock,
        Link.configure({
          openOnClick: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" }
        }),
        AutoLink,
        Dropcursor.configure({
          color: "#6366f1",
          width: 2
        }),
        GlobalDragHandle.configure({
          dragHandleWidth: 20,
          scrollTreshold: 100
        }),
        BetterIndent,
        CardRef.configure({
          onCardClick: props.onCardClick
        }),
        CardRefSuggestion.configure({
          suggestion: {
            items: (query) => getSearchCards()(query),
            render: () => popupRenderer
          }
        }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "title") {
              return props.titlePlaceholder || "Untitled"
            }
            return props.placeholder || "Write something..."
          }
        })
      ],
      content: props.content || {
        type: "doc",
        content: [{ type: "title", attrs: { level: 1 }, content: [] }, { type: "paragraph" }]
      },
      onUpdate: ({ editor }) => {
        const json = editor.getJSON()
        // console.log("Editor Content:", JSON.stringify(json, null, 2))
        const text = editor.getText()
        props.onUpdate?.(json, text)
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none"
        }
      }
    })
  })

  createEffect(() => {
    if (props.content && editor && !editor.isDestroyed) {
      const currentContent = editor.getJSON()
      if (JSON.stringify(currentContent) !== JSON.stringify(props.content)) {
        editor.commands.setContent(props.content)
      }
    }
  })

  onCleanup(() => {
    if (editor && !editor.isDestroyed) {
      editor.destroy()
    }
  })

  return <div ref={editorElement!} class={props.class || "w-full h-full"} />
}

export default TiptapEditor
