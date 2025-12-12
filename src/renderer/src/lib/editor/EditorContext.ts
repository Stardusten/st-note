import type { Accessor } from "solid-js"
import type { Card } from "../common/types/card"
import type { CardSuggestionItem } from "./plugins/cardref-suggestion-plugin"

export type EditorContext = {
  cardId: string
  editorId: string
  dbPath: string

  getCard: Accessor<Card | null>
  getCardTitle: (cardId: string) => string
  getLastUpdateSource: () => string | undefined

  updateCard: (content: object) => void
  searchCards: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  createCard: (title: string) => Promise<CardSuggestionItem | null>
  onCardClick: (cardId: string) => void

  onFocus?: () => void
  onBlur?: () => void
  placeholder?: string
  class?: string
  searchQuery?: string
}
