import { Component, createSignal, Show } from "solid-js"
import { Button } from "../solidui/button"
import { Inbox } from "lucide-solid"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import { appStore } from "@renderer/lib/state/AppStore"
import { getCardTitle } from "@renderer/lib/common/types/card"
import type { CardSuggestionItem } from "@renderer/lib/editor/extensions/CardRefSuggestion"
import "./quick-window.css"

const emptyContent = {
  type: "doc",
  content: [{ type: "title", attrs: { level: 1 }, content: [] }, { type: "paragraph" }]
}

const QuickWindow: Component = () => {
  const [content, setContent] = createSignal<any>(emptyContent)
  const [isEmpty, setIsEmpty] = createSignal(true)
  const [resetKey, setResetKey] = createSignal(1)

  const handleUpdate = (newContent: any, text: string) => {
    setContent(newContent)
    setIsEmpty(text.trim().length === 0)
  }

  const resetEditor = () => {
    setContent(emptyContent)
    setIsEmpty(true)
    setResetKey((k) => k + 1)
  }

  const handleCapture = async () => {
    if (isEmpty()) {
      window.api.hideQuickWindow()
      return
    }
    await appStore.createCardWithoutSelect(undefined, content())
    resetEditor()
    window.api.hideQuickWindow()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (isEmpty()) {
        window.api.hideQuickWindow()
      } else {
        const discard = window.confirm("Discard this note?")
        if (discard) {
          resetEditor()
          window.api.hideQuickWindow()
        }
      }
    }
  }

  const searchCards = (query: string): CardSuggestionItem[] => {
    const cards = appStore.getCards()

    if (!query.trim()) {
      return cards
        .slice(0, 10)
        .map((c) => ({ id: c.id, title: getCardTitle(c) }))
    }

    const lowerQuery = query.toLowerCase()
    return cards
      .filter((c) => getCardTitle(c).toLowerCase().includes(lowerQuery))
      .slice(0, 10)
      .map((c) => ({ id: c.id, title: getCardTitle(c) }))
  }

  const handleCardClick = (cardId: string) => {
    appStore.selectCard(cardId)
    window.api.hideQuickWindow()
  }

  const handleCreateCard = async (title: string) => {
    const newCard = await appStore.createCardWithoutSelect(title)
    if (newCard) return { id: newCard.id, title: getCardTitle(newCard) }
    return null
  }

  return (
    <div class="quick-capture-window px-4 pt-4 h-full flex flex-col" onKeyDown={handleKeyDown}>
      <div class="absolute left-0 top-0 h-full w-full flex flex-col">
        <div
          class="flex-1 w-full"
          style={{
            background:
              "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box"
          }}></div>
        <hr
          style={{
            margin: "0px",
            "flex-shrink": 0,
            "border-image": "unset",
            height: "1px",
            "background-color": "rgba(0, 0, 0, 0.4)",
            "border-style": "solid",
            "border-width": "0px 0px 0.5px",
            "border-color": "rgba(255, 255, 255, 0.2)"
          }}
        />
        <div class="h-[76px] bg-[#1c1c20]"></div>
      </div>
      <div class="z-1 flex flex-col flex-1 max-h-[284px]">
        <div
          class="flex-1 overflow-y-auto rounded-sm p-6"
          style={{
            background:
              "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
            border: "0.5px solid transparent",
            "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
            transition: "all 300ms ease 0s"
          }}>
          <Show when={resetKey()} keyed>
            {(_key) => (
              <NoteEditor
                content={content()}
                onUpdate={handleUpdate}
                titlePlaceholder="Untitled"
                placeholder="Start writing..."
                showTitleToolbar={false}
                searchCards={searchCards}
                onCardClick={handleCardClick}
                onCreateCard={handleCreateCard}
              />
            )}
          </Show>
        </div>
        <div class="py-3 flex flex-row justify-between items-center ">
          <div class="text-sm text-foreground flex flex-row items-center gap-2 pl-2">
            <Inbox class="size-4 stroke-[1.5px]" />
            Notes Inbox
          </div>
          <Button variant="outline" onClick={handleCapture}>
            Capture
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QuickWindow
