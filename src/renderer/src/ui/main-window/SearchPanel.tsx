import { Component, createSignal, Show } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import SearchBox from "../common/SearchBox"
import NoteEditor from "@renderer/lib/editor/NoteEditor"

type SearchPanelProps = {
  onClose?: () => void
}

const SearchPanel: Component<SearchPanelProps> = (props) => {
  const [resetTrigger, setResetTrigger] = createSignal(0)
  const [focusedCardId, setFocusedCardId] = createSignal<string | null>(null)

  const handleSelectCard = (cardId: string) => {
    appStore.selectCard(cardId)
    props.onClose?.()
  }

  const handleCreateNote = async (title: string) => {
    await appStore.createCard(title)
    props.onClose?.()
  }

  const handleClose = () => {
    setResetTrigger((prev) => prev + 1)
    setFocusedCardId(null)
    props.onClose?.()
  }

  const focusedCard = () => {
    const id = focusedCardId()
    if (!id) return null
    return appStore.getCard(id)
  }

  return (
    <div class="fixed z-50 top-0 left-0 h-screen w-screen flex items-start justify-center pt-[80px] bg-[#000]/40">
      <div class="absolute inset-0" onClick={handleClose} />
      <div
        class="relative flex gap-3 z-10"
        style={{ "max-height": "calc(100vh - 160px)" }}>
        <div
          class="w-[400px] max-h-full flex flex-col border rounded-md bg-[#181a1c] overflow-hidden"
          style={{
            "box-shadow":
              "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
          }}>
          <SearchBox
            onSelectCard={handleSelectCard}
            onCreateNote={handleCreateNote}
            onClose={handleClose}
            onFocusedCardChange={setFocusedCardId}
            resetTrigger={resetTrigger()}
          />
        </div>
        <Show when={focusedCard()}>
          <div
            class="w-[500px] max-h-full flex flex-col border rounded-md bg-[#181a1c] overflow-hidden"
            style={{
              "box-shadow":
                "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
            }}>
            <div class="flex-1 overflow-y-auto p-4">
              <NoteEditor
                content={focusedCard()?.data?.content}
                onUpdate={(content) => {
                  const id = focusedCardId()
                  if (id) appStore.updateCardContent(id, content)
                }}
                getCardSuggestions={(query) => appStore.searchCards(query)}
                onCreateCard={async (title) => {
                  const card = await appStore.createCard(title)
                  return { id: card.id, title }
                }}
                onCardClick={(cardId) => {
                  handleSelectCard(cardId)
                }}
                getCardTitle={(cardId) => appStore.getCardTitle(cardId)()}
              />
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default SearchPanel
