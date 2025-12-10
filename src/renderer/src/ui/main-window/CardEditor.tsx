import { prepareSearch } from "@renderer/lib/common/utils/search"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import { appStore } from "@renderer/lib/state/AppStore"
import { ArrowLeft, ArrowRight, Pin, Plus, Trash } from "lucide-solid"
import { Component, Show } from "solid-js"
import { Button } from "../solidui/button"
import "./card-editor.css"

const EDITOR_ID = "card-main-editor"

const CardMainEditor: Component = () => {
  let saveTimeout: NodeJS.Timeout

  const handleContentChange = (content: any, text: string) => {
    const currentCard = appStore.getCurrentCard()
    if (!currentCard) return

    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      appStore.updateCard(currentCard.id, content, text, EDITOR_ID)
    }, 500)
  }

  const handleCreateNewCard = async () => {
    await appStore.createCard()
  }

  const getCardSuggestions = async (query: string) => {
    const cards = appStore.getCards()
    if (!query.trim()) {
      return cards.slice(0, 10).map((c) => ({
        id: c.id,
        title: appStore.getCardTitle(c.id)() || "Untitled"
      }))
    }
    const search = prepareSearch(query)
    return cards
      .map((c) => ({ card: c, score: search(c.text || "") }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((r) => ({
        id: r.card.id,
        title: appStore.getCardTitle(r.card.id)() || "Untitled"
      }))
  }

  const handleCreateCard = async (title: string) => {
    const card = await appStore.createCardWithoutSelect(title)
    return { id: card.id, title }
  }

  const handleCardClick = (cardId: string) => {
    appStore.selectCard(cardId)
  }

  const getCardTitle = (cardId: string) => {
    return appStore.getCardTitle(cardId)() || "Untitled"
  }

  const sortedCards = () => {
    return [...appStore.getCards()].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  const currentIndex = () => {
    const cardId = appStore.getCurrentCardId()
    if (!cardId) return -1
    return sortedCards().findIndex((c) => c.id === cardId)
  }

  const canGoPrev = () => currentIndex() > 0
  const canGoNext = () => {
    const idx = currentIndex()
    return idx >= 0 && idx < sortedCards().length - 1
  }

  const handleGoPrev = () => {
    const idx = currentIndex()
    if (idx > 0) {
      appStore.selectCard(sortedCards()[idx - 1].id)
    }
  }

  const handleGoNext = () => {
    const idx = currentIndex()
    const cards = sortedCards()
    if (idx >= 0 && idx < cards.length - 1) {
      appStore.selectCard(cards[idx + 1].id)
    }
  }

  const handleTogglePin = () => {
    const cardId = appStore.getCurrentCardId()
    if (cardId) appStore.togglePinCard(cardId)
  }

  const handleDelete = () => {
    const cardId = appStore.getCurrentCardId()
    if (!cardId) return
    const title = appStore.getCardTitle(cardId)() || "Untitled"
    if (confirm(`Delete "${title}"?`)) {
      appStore.deleteCard(cardId)
    }
  }

  const currentCardId = appStore.getCurrentCardId
  const isPinned = () => {
    const cardId = currentCardId()
    return cardId ? appStore.isPinned(cardId) : false
  }

  return (
    <div
      class="w-full card-editor"
      style={{
        color: "rgb(217, 217, 217)",
        transition: "box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
        "border-radius": "8px",
        position: "relative",
        border: "0.5px solid transparent",
        "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
        background:
          "radial-gradient(100% 210px at center top, rgb(49, 49, 53) 30px, rgb(49, 49, 53) -300%, rgb(31, 32, 36) 780px) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        overflow: "visible"
      }}>
      <Show
        when={currentCardId()}
        fallback={
          <div class="flex flex-col items-center justify-center h-[300px]">
            <p class="text-muted-foreground mb-4">Oops, No card opened</p>
            <Button variant="outline" onClick={handleCreateNewCard}>
              <Plus class="size-4 stroke-[1.5px]" />
              Create New Card
            </Button>
          </div>
        }>
        <div class="absolute top-0 right-0 p-6 flex flex-row gap-2">
          <Button
            variant="ghost"
            size="xs-icon"
            onClick={handleGoPrev}
            disabled={!canGoPrev()}
            title="Previous card">
            <ArrowLeft class="size-4 stroke-[1.5]" />
          </Button>
          <Button
            variant="ghost"
            size="xs-icon"
            onClick={handleGoNext}
            disabled={!canGoNext()}
            title="Next card">
            <ArrowRight class="size-4 stroke-[1.5]" />
          </Button>
          <Button
            variant="ghost"
            size="xs-icon"
            onClick={handleTogglePin}
            class={isPinned() ? "text-yellow-500" : ""}
            title={isPinned() ? "Unpin" : "Pin"}>
            <Pin class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="destructiveGhost" size="xs-icon" onClick={handleDelete} title="Delete">
            <Trash class="size-4 stroke-[1.5]" />
          </Button>
        </div>
        <div class="pb-[68px] pt-[86px] px-[64px]">
          <NoteEditor
            content={appStore.getCurrentCard()?.data.content}
            onUpdate={handleContentChange}
            titlePlaceholder="Untitled"
            placeholder="Start writing..."
            showTitleToolbar={true}
            editorId={EDITOR_ID}
            getLastUpdateSource={() => {
              const cardId = appStore.getCurrentCardId()
              return cardId ? appStore.getLastUpdateSource(cardId) : undefined
            }}
            getCardSuggestions={getCardSuggestions}
            onCreateCard={handleCreateCard}
            onCardClick={handleCardClick}
            getCardTitle={getCardTitle}
          />
        </div>
      </Show>
    </div>
  )
}

export default CardMainEditor
