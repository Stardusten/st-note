import type { StObject } from "../types"

export type Card = StObject & {
  type: 'card'
  data: {
    content: any  // ProseMirror doc JSON

    // Task related (optional)
    checked?: boolean
    schedule?: Date
    deadline?: Date

    // Display properties (placeholder for now)
    coverImage?: string
    emoji?: string
  }
}

export const isTask = (card: Card): boolean => card.data.checked !== undefined

export const getCardTitle = (card: Card): string => {
  // Extract first line from text field as title
  const firstLine = card.text?.split('\n')[0] || ''
  return firstLine.trim() || 'Untitled'
}