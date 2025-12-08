import { Component, JSX } from "solid-js"
import { ProseMirrorEditor } from "./ProseMirrorEditor"
import type { CardSuggestionItem } from "./plugins/cardref-suggestion-plugin"

type NoteEditorProps = {
  content?: object
  onUpdate?: (content: object, text: string) => void
  titlePlaceholder?: string
  placeholder?: string
  showTitleToolbar?: boolean
  autoFocus?: boolean
  class?: string
  editorId?: string
  getLastUpdateSource?: () => string | undefined
  getCardSuggestions?: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
  onCardClick?: (cardId: string) => void
  getCardTitle?: (cardId: string) => string
}

const getTextFromDoc = (doc: any): string => {
  if (!doc || !doc.content) return ""
  let text = ""
  for (const node of doc.content) {
    if (node.type === "title" || node.type === "paragraph" || node.type === "block") {
      text += getTextFromNode(node) + "\n"
    }
  }
  return text.trim()
}

const getTextFromNode = (node: any): string => {
  if (!node) return ""
  if (node.type === "text") return node.text || ""
  if (!node.content) return ""
  return node.content.map(getTextFromNode).join("")
}

const NoteEditor: Component<NoteEditorProps> = (props): JSX.Element => {
  const handleUpdate = (json: object) => {
    if (props.onUpdate) {
      const text = getTextFromDoc(json)
      props.onUpdate(json, text)
    }
  }

  return (
    <ProseMirrorEditor
      content={props.content}
      onUpdate={handleUpdate}
      placeholder={props.placeholder || props.titlePlaceholder}
      class={props.class}
      editorId={props.editorId}
      getLastUpdateSource={props.getLastUpdateSource}
      getCardSuggestions={props.getCardSuggestions}
      onCreateCard={props.onCreateCard}
      onCardClick={props.onCardClick}
      getCardTitle={props.getCardTitle}
    />
  )
}

export default NoteEditor
