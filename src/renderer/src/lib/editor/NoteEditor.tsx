import { Component, JSX } from "solid-js"
import { ProseMirrorEditor, ProseMirrorEditorHandle } from "./ProseMirrorEditor"
import type { CardSuggestionItem } from "./plugins/cardref-suggestion-plugin"

export type NoteEditorHandle = {
  focus: () => void
  focusFirstMatch: () => void
  selectTitle: () => void
}

type NoteEditorProps = {
  ref?: NoteEditorHandle | ((ref: NoteEditorHandle) => void)
  cardId?: string
  content?: object
  onUpdate?: (content: object) => void
  onFocus?: () => void
  onBlur?: () => void
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
  getDbPath?: () => string
  searchQuery?: string
}

const NoteEditor: Component<NoteEditorProps> = (props): JSX.Element => {
  let editorHandle: ProseMirrorEditorHandle | undefined

  const handle: NoteEditorHandle = {
    focus: () => editorHandle?.focus(),
    focusFirstMatch: () => editorHandle?.focusFirstMatch(),
    selectTitle: () => editorHandle?.selectTitle()
  }

  if (typeof props.ref === "function") props.ref(handle)
  else if (props.ref) Object.assign(props.ref, handle)

  const handleUpdate = (json: object) => {
    props.onUpdate?.(json)
  }

  return (
    <ProseMirrorEditor
      ref={(r) => { editorHandle = r }}
      cardId={props.cardId}
      content={props.content}
      onUpdate={handleUpdate}
      onFocus={props.onFocus}
      onBlur={props.onBlur}
      placeholder={props.placeholder || props.titlePlaceholder}
      class={props.class}
      editorId={props.editorId}
      getLastUpdateSource={props.getLastUpdateSource}
      getCardSuggestions={props.getCardSuggestions}
      onCreateCard={props.onCreateCard}
      onCardClick={props.onCardClick}
      getCardTitle={props.getCardTitle}
      getDbPath={props.getDbPath}
      searchQuery={props.searchQuery}
    />
  )
}

export default NoteEditor
