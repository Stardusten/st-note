import { createMemo, createSignal, untrack } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import { prepareSearchWithTitle } from "@renderer/lib/common/utils/search"
import type { Card } from "@renderer/lib/common/types/card"

export type SearchListItem = {
  card: Card
  title: string
  body: string
}

const getBodyFromText = (text: string) => text.split("\n").slice(1).join(" ").trim()

export function useSearch() {
  const [query, setQuery] = createSignal("")
  const [isComposing, setIsComposing] = createSignal(false)
  const [showHighlight, setShowHighlight] = createSignal(true)
  const [lastCommittedQuery, setLastCommittedQuery] = createSignal("")

  const searchQuery = createMemo(() => (isComposing() ? lastCommittedQuery() : query()))

  // Only change the list when:
  // - query changes, or
  // - cards are added/removed (ID set changes)
  // Reordering due to updatedAt/content updates should NOT affect this.
  const cardIds = createMemo(() => appStore.getCards().map((c) => c.id).sort().join(","))

  const filteredItems = createMemo<SearchListItem[]>(() => {
    const q = searchQuery()
    cardIds() // subscribe to add/delete only

    const threshold = untrack(() => settingsStore.getSearchMatchThreshold())
    const cards = untrack(() => appStore.getCards())

    if (q.trim()) {
      const scorer = prepareSearchWithTitle(q, threshold)
      const results = cards
        .map((card) => {
          const title = untrack(() => appStore.getCardTitle(card.id)()) || ""
          const text = untrack(() => appStore.getCardText(card.id)()) || ""
          const body = getBodyFromText(text)
          const result = scorer(title, text)
          return { card, title, body, ...result }
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
          if (a.titleMatched !== b.titleMatched) return a.titleMatched ? -1 : 1
          if (b.score !== a.score) return b.score - a.score
          const timeA = a.card.updatedAt ? new Date(a.card.updatedAt).getTime() : 0
          const timeB = b.card.updatedAt ? new Date(b.card.updatedAt).getTime() : 0
          return timeB - timeA
        })

      return results.map(({ card, title, body }) => ({ card, title, body }))
    }

    return [...cards]
      .sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      })
      .map((card) => {
        const title = untrack(() => appStore.getCardTitle(card.id)()) || ""
        const text = untrack(() => appStore.getCardText(card.id)()) || ""
        const body = getBodyFromText(text)
        return { card, title, body }
      })
  })

  const filteredCards = createMemo(() => filteredItems().map((i) => i.card))

  const highlightQuery = createMemo(() => (showHighlight() ? searchQuery() : ""))

  const updateQuery = (value: string, composing: boolean) => {
    setQuery(value)
    setIsComposing(composing)
    if (!composing) setLastCommittedQuery(value)
    setShowHighlight(true)
  }

  const commitComposition = (value: string) => {
    setQuery(value)
    setIsComposing(false)
    setLastCommittedQuery(value)
  }

  const clearQuery = () => {
    setQuery("")
    setLastCommittedQuery("")
    setIsComposing(false)
  }

  return {
    query,
    filteredItems,
    filteredCards,
    highlightQuery,
    updateQuery,
    commitComposition,
    clearQuery,
    hideHighlight: () => setShowHighlight(false)
  }
}

export type SearchState = ReturnType<typeof useSearch>
