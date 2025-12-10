import { Component, Show } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import type { Card } from "@renderer/lib/common/types/card"

export type ContentAreaProps = {
  focusedCard: Card | null
  isNewNote: boolean
  editorRef?: (ref: any) => void
  editorId?: string
  highlightQuery: string
  onUpdate: (content: object) => void
  getLastUpdateSource: () => string | undefined
}

const ContentArea: Component<ContentAreaProps> = (props) => (
  <>
    <Show when={props.focusedCard}>
      <div class="flex-1 min-h-0 border-t overflow-auto bg-surface" style={{ zoom: "0.8" }}>
        <NoteEditor
          ref={props.editorRef}
          cardId={props.focusedCard!.id}
          content={props.focusedCard!.data?.content}
          onUpdate={props.onUpdate}
          editorId={props.editorId}
          getLastUpdateSource={props.getLastUpdateSource}
          getCardSuggestions={(q) => appStore.searchCards(q)}
          onCreateCard={async (title) => {
            const card = await appStore.createCard(title)
            return card ? { id: card.id, title: appStore.getCardTitle(card.id)() } : null
          }}
          onCardClick={(cardId) => appStore.selectCard(cardId)}
          getCardTitle={(cardId) => appStore.getCardTitle(cardId)()}
          searchQuery={props.highlightQuery}
          class="w-full h-full p-4"
        />
      </div>
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

export default ContentArea
