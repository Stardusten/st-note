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
  const content = card.data?.content?.content
  if (Array.isArray(content) && content.length > 0) {
    const titleNode = content[0]
    if (titleNode?.type === 'title' && Array.isArray(titleNode.content)) {
      const text = titleNode.content
        .filter((n: any) => n.type === 'text')
        .map((n: any) => n.text)
        .join('')
      if (text.trim()) return text.trim()
    }
  }
  return 'Untitled'
}