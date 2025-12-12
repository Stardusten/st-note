import { Component, Show, createMemo } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import type { Card } from "@renderer/lib/common/types/card"
import type { EditorContext } from "@renderer/lib/editor/EditorContext"

export type ContentAreaProps = {
  focusedCard: Card | null
  isNewNote: boolean
  editorRef?: (ref: any) => void
  highlightQuery: () => string
  onFocus?: () => void
  onBlur?: () => void
  onDocChange?: () => void
}

const ContentArea: Component<ContentAreaProps> = (props) => {
  const cardId = createMemo(() => props.focusedCard?.id)

  const context = createMemo<EditorContext | null>((prev) => {
    const id = cardId()
    if (!id) return null
    if (prev && prev.cardId === id) return prev
    return {
      ...appStore.getEditorContext(id),
      onFocus: props.onFocus,
      onBlur: props.onBlur,
      onDocChange: props.onDocChange,
      get searchQuery() { return props.highlightQuery() },
      class: "w-full h-full px-4 pt-2"
    }
  })

  return (
    <>
      <Show when={context()} keyed>
        {(ctx) => (
          <div class="flex-1 min-h-0 overflow-auto bg-surface" style={{ zoom: "0.8" }}>
            <NoteEditor ref={props.editorRef} context={ctx} />
          </div>
        )}
      </Show>
      <Show when={props.isNewNote}>
        <div class="flex-1 min-h-0 border-t overflow-auto flex items-center justify-center bg-surface">
          <span class="text-muted-foreground text-sm">Card not created</span>
        </div>
      </Show>
      <Show when={!props.focusedCard && !props.isNewNote}>
        <div class="flex-1 min-h-0 border-t overflow-auto flex items-center justify-center bg-surface">
          <span class="text-muted-foreground text-sm">No card selected</span>
        </div>
      </Show>
    </>
  )
}

export default ContentArea
