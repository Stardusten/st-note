import { createMemo, createSignal } from "solid-js"
import type { Card } from "@renderer/lib/common/types/card"

export type AgendaGroup = {
  id: string
  label: string
  cards: Card[]
}

const startOfDay = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date: Date): Date => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

const parseDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const getWeekday = (date: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  return days[date.getDay()]
}

export const formatRelativeDate = (date: Date | null, today: Date): string => {
  if (!date) return ""
  const start = startOfDay(today)
  const target = startOfDay(date)
  const diff = Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

  if (diff < -1) return `${Math.abs(diff)}d ago`
  if (diff === -1) return "Yesterday"
  if (diff === 0) return "Today"
  if (diff === 1) return "Tomorrow"
  if (diff < 7) return getWeekday(date)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function useAgenda(filteredCards: () => Card[]) {
  const [isAgendaMode, setIsAgendaMode] = createSignal(false)

  const toggleAgendaMode = () => setIsAgendaMode(!isAgendaMode())

  const agendaGroups = createMemo((): AgendaGroup[] => {
    if (!isAgendaMode()) return []

    const now = new Date()
    const today = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekEnd = endOfDay(addDays(today, 6))

    const overdue: Card[] = []
    const todayCards: Card[] = []
    const thisWeek: Card[] = []
    const later: Card[] = []
    const noDate: Card[] = []

    for (const card of filteredCards()) {
      if (!card.data.status) continue

      const schedule = parseDate(card.data.schedule)
      const deadline = parseDate(card.data.deadline)
      const effectiveDate = deadline || schedule

      if (!effectiveDate) {
        noDate.push(card)
        continue
      }

      if (effectiveDate < today) {
        overdue.push(card)
      } else if (effectiveDate <= todayEnd) {
        todayCards.push(card)
      } else if (effectiveDate <= weekEnd) {
        thisWeek.push(card)
      } else {
        later.push(card)
      }
    }

    const sortByDate = (a: Card, b: Card) => {
      const aDate = parseDate(a.data.deadline) || parseDate(a.data.schedule)
      const bDate = parseDate(b.data.deadline) || parseDate(b.data.schedule)
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return aDate.getTime() - bDate.getTime()
    }

    overdue.sort(sortByDate)
    todayCards.sort(sortByDate)
    thisWeek.sort(sortByDate)
    later.sort(sortByDate)

    const groups: AgendaGroup[] = []
    if (overdue.length) groups.push({ id: "overdue", label: "Overdue", cards: overdue })
    if (todayCards.length) groups.push({ id: "today", label: "Today", cards: todayCards })
    if (thisWeek.length) groups.push({ id: "week", label: "This Week", cards: thisWeek })
    if (later.length) groups.push({ id: "later", label: "Later", cards: later })
    if (noDate.length) groups.push({ id: "nodate", label: "No Date", cards: noDate })

    return groups
  })

  const agendaCards = createMemo((): Card[] => {
    if (!isAgendaMode()) return []
    return agendaGroups().flatMap((g) => g.cards)
  })

  return {
    isAgendaMode,
    toggleAgendaMode,
    agendaGroups,
    agendaCards
  }
}

export type AgendaState = ReturnType<typeof useAgenda>
