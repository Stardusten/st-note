import { createMemo, createSignal } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { prepareSearch } from "@renderer/lib/common/utils/search"
import type { Card } from "@renderer/lib/common/types/card"

export function useSearch() {
  const [query, setQuery] = createSignal("")
  const [isComposing, setIsComposing] = createSignal(false)
  const [showHighlight, setShowHighlight] = createSignal(true)
  const [lastCommittedQuery, setLastCommittedQuery] = createSignal("")
  const [isPaused, setIsPaused] = createSignal(false)
  const [frozenCards, setFrozenCards] = createSignal<Card[] | null>(null)

  const searchQuery = createMemo(() => (isComposing() ? lastCommittedQuery() : query()))

  const computeFilteredCards = () => {
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
  }

  const filteredCards = createMemo(() => {
    if (isPaused()) return frozenCards() || computeFilteredCards()
    return computeFilteredCards()
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

  const pause = () => {
    if (!isPaused()) {
      setFrozenCards(filteredCards())
      setIsPaused(true)
    }
  }

  const resume = () => {
    setIsPaused(false)
    setFrozenCards(null)
  }

  return {
    query,
    filteredCards,
    highlightQuery,
    updateQuery,
    commitComposition,
    clearQuery,
    hideHighlight: () => setShowHighlight(false),
    pause,
    resume,
    isPaused
  }
}

export type SearchState = ReturnType<typeof useSearch>
