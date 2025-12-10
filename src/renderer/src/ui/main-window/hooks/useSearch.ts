import { createMemo, createSignal } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { prepareSearch } from "@renderer/lib/common/utils/search"

export function useSearch() {
  const [query, setQuery] = createSignal("")
  const [isComposing, setIsComposing] = createSignal(false)
  const [showHighlight, setShowHighlight] = createSignal(true)
  const [lastCommittedQuery, setLastCommittedQuery] = createSignal("")

  const searchQuery = createMemo(() => (isComposing() ? lastCommittedQuery() : query()))

  const filteredCards = createMemo(() => {
    const q = searchQuery()
    let cards = appStore.getCards()
    if (q.trim()) {
      const scorer = prepareSearch(q)
      return cards
        .map((card) => ({ card, score: scorer(appStore.getCardText(card.id)() || "") }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ card }) => card)
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
