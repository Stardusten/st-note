import { createMemo, createSignal } from "solid-js"
import type { Card } from "@renderer/lib/common/types/card"

export function useNavigation(filteredCards: () => Card[]) {
  const [focusedIndex, setFocusedIndex] = createSignal(-1)
  const [listHasFocus, setListHasFocus] = createSignal(false)

  const totalItems = createMemo(() => filteredCards().length + 1)
  const isNewNoteIndex = (idx: number) => idx === filteredCards().length

  const focusedCard = createMemo(() => {
    const idx = focusedIndex()
    const cards = filteredCards()
    return idx >= 0 && idx < cards.length ? cards[idx] : null
  })

  const moveUp = () => {
    const total = totalItems()
    if (total === 0) return
    setFocusedIndex((idx) => (idx <= 0 ? total - 1 : idx - 1))
  }

  const moveDown = () => {
    const total = totalItems()
    if (total === 0) return
    setFocusedIndex((idx) => (idx + 1 >= total ? 0 : idx + 1))
  }

  const focusList = () => setListHasFocus(true)
  const blurList = () => setListHasFocus(false)

  return {
    focusedIndex,
    setFocusedIndex,
    focusedCard,
    isNewNoteIndex,
    moveUp,
    moveDown,
    listHasFocus,
    focusList,
    blurList
  }
}

export type NavigationState = ReturnType<typeof useNavigation>
