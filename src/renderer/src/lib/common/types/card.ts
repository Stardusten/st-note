import type { StObject } from "../types"
import type { TaskStatusConfig } from "src/preload"

export type Card = StObject & {
  type: 'card'
  data: {
    content: any  // ProseMirror doc JSON

    // Task related (optional)
    status?: string
    schedule?: string  // ISO date string
    deadline?: string  // ISO date string

    // Display properties (placeholder for now)
    coverImage?: string
    emoji?: string
  }
}

export const isTask = (card: Card): boolean => card.data.status !== undefined

export const getStatusConfig = (status: string | undefined, statuses: TaskStatusConfig[]): TaskStatusConfig | undefined =>
  status ? statuses.find((s) => s.id === status) : undefined

export const getCycleStatuses = (statuses: TaskStatusConfig[]): TaskStatusConfig[] =>
  statuses.filter((s) => s.inCycle)

export const nextCycleStatus = (current: string | undefined, statuses: TaskStatusConfig[]): string | undefined => {
  const cycle = getCycleStatuses(statuses)
  if (cycle.length === 0) return undefined
  if (!current) return cycle[0].id
  const idx = cycle.findIndex((s) => s.id === current)
  if (idx === -1) return cycle[0].id
  if (idx === cycle.length - 1) return undefined
  return cycle[idx + 1].id
}

export const prevCycleStatus = (current: string | undefined, statuses: TaskStatusConfig[]): string | undefined => {
  const cycle = getCycleStatuses(statuses)
  if (cycle.length === 0) return undefined
  if (!current) return cycle[cycle.length - 1].id
  const idx = cycle.findIndex((s) => s.id === current)
  if (idx === -1) return cycle[cycle.length - 1].id
  if (idx === 0) return undefined
  return cycle[idx - 1].id
}

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