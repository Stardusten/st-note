import { createMemo, createSignal, untrack } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import { prepareSearch } from "@renderer/lib/common/utils/search"

export function useSearch() {
  const [query, setQuery] = createSignal("")
  const [isComposing, setIsComposing] = createSignal(false)
  const [showHighlight, setShowHighlight] = createSignal(true)
  const [lastCommittedQuery, setLastCommittedQuery] = createSignal("")

  const searchQuery = createMemo(() => (isComposing() ? lastCommittedQuery() : query()))

  // Track card IDs only (not content) to trigger recalc on add/delete
  const cardIds = createMemo(() => appStore.getCards().map((c) => c.id).join(","))

  const filteredCards = createMemo(() => {
    const q = searchQuery()
    cardIds() // subscribe to card list changes
    const threshold = untrack(() => settingsStore.getSearchMatchThreshold())
    const cards = untrack(() => appStore.getCards())
    if (q.trim()) {
      const scorer = prepareSearch(q, threshold)
      const results = cards
        .map((card) => {
          const text = untrack(() => appStore.getCardText(card.id)()) || ""
          const score = scorer(text)
          return { card, text, score }
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score
          const timeA = a.card.updatedAt ? new Date(a.card.updatedAt).getTime() : 0
          const timeB = b.card.updatedAt ? new Date(b.card.updatedAt).getTime() : 0
          return timeB - timeA
        })
      return results.map(({ card }) => card)
    }
    return [...cards].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return timeB - timeA
    })
  })

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
    filteredCards,
    highlightQuery,
    updateQuery,
    commitComposition,
    clearQuery,
    hideHighlight: () => setShowHighlight(false)
  }
}

export type SearchState = ReturnType<typeof useSearch>
