import { Component, createSignal, onMount, Show, onCleanup } from "solid-js"
import { Pin } from "lucide-solid"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import type { EditorContext } from "@renderer/lib/editor/EditorContext"
import type { Card } from "@renderer/lib/common/types/card"

const EditorWindow: Component = () => {
  const [card, setCard] = createSignal<Card | null>(null)
  const [title, setTitle] = createSignal("Editor")
  const [isPinned, setIsPinned] = createSignal(false)
  const [editorContext, setEditorContext] = createSignal<EditorContext | null>(null)
  const titleCache = new Map<string, string>()
  let lastUpdateSource: string | undefined

  onMount(async () => {
    const params = new URLSearchParams(window.location.search)
    const cardId = params.get("cardId") || ""
    const dbPath = params.get("dbPath") || ""

    window.api.window.onPinChanged((pinned) => setIsPinned(pinned))

    if (cardId && dbPath) {
      const editorId = `editor-window-${cardId}-${Date.now()}`
      const cardData = await window.api.editorWindow.getCard(dbPath, cardId)
      if (cardData) {
        setCard(cardData)
        const cardTitle = await window.api.editorWindow.getCardTitle(dbPath, cardId)
        setTitle(cardTitle || "Untitled")
        titleCache.set(cardId, cardTitle || "")
      }

      const context: EditorContext = {
        cardId,
        editorId,
        dbPath,
        getCard: () => card(),
        getCardTitle: (cid) => titleCache.get(cid) || "",
        getLastUpdateSource: () => lastUpdateSource,
        updateCard: (content) => {
          lastUpdateSource = editorId
          window.api.editorWindow.updateCard(dbPath, cardId, content, editorId)
        },
        searchCards: async (query) => {
          const results = await window.api.editorWindow.searchCards(dbPath, query)
          for (const item of results) titleCache.set(item.id, item.title)
          return results
        },
        createCard: async (cardTitle) => {
          const newCard = await window.api.editorWindow.createCard(dbPath, cardTitle)
          if (newCard) titleCache.set(newCard.id, newCard.title)
          return newCard
        },
        onCardClick: (cid) => {
          window.api.editorWindow.navigateToCard(cid)
        },
        class: "w-full h-full p-4"
      }
      setEditorContext(context)

      const unsubscribe = window.api.editorWindow.onCardUpdated((updatedCard: Card, source?: string) => {
        if (updatedCard.id === cardId && source !== editorId) {
          lastUpdateSource = source
          setCard(updatedCard)
        }
      })
      onCleanup(() => unsubscribe?.())
    }
  })

  return (
    <div class="h-screen w-full flex flex-col bg-[#1a1b1e] select-none overflow-hidden">
      <div
        class="shrink-0 h-[34px] flex items-center justify-center bg-[#151619] relative"
        style={{ "-webkit-app-region": "drag" }}
      >
        <span class="text-[13px] font-medium text-white/70 truncate px-16 max-w-full">{title()}</span>
        <Show when={isPinned()}>
          <Pin class="absolute right-2 w-3.5 h-3.5 text-white/70" />
        </Show>
      </div>

      <div class="flex-1 overflow-auto" style={{ zoom: "0.8" }}>
        <Show when={editorContext()} fallback={<div class="p-4 text-white/50">Loading...</div>}>
          <NoteEditor context={editorContext()!} />
        </Show>
      </div>
    </div>
  )
}

export default EditorWindow
