import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { appStore } from "@renderer/lib/state/AppStore"
import type { Card } from "@renderer/lib/common/types/card"
import { getStatusConfig } from "@renderer/lib/common/types/card"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import { Plus } from "lucide-solid"
import { Component, createEffect, createMemo, For, Show } from "solid-js"
import HighlightedText from "./components/HighlightedText"
import type { AgendaGroup } from "./hooks/useAgenda"
import { formatRelativeDate } from "./hooks/useAgenda"

const getCardBody = (cardId: string) => {
  const text = appStore.getCardText(cardId)() || ""
  return text.split("\n").slice(1).join(" ").trim()
}

const TaskStatusIcon: Component<{ status?: string }> = (props) => {
  const config = () => getStatusConfig(props.status, settingsStore.getTaskStatuses())
  return (
    <Show when={config()}>
      <span class="text-xs font-bold font-mono shrink-0" style={{ color: config()!.color }}>
        {config()!.name}
      </span>
    </Show>
  )
}

const parseDate = (value: any): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

const DateBadge: Component<{ card: Card; isOverdue?: boolean }> = (props) => {
  const today = new Date()
  const deadline = () => parseDate(props.card.data.deadline)
  const schedule = () => parseDate(props.card.data.schedule)
  const displayDate = () => deadline() || schedule()
  const isDeadline = () => !!deadline()

  return (
    <Show when={displayDate()}>
      <span
        class="text-[10px] shrink-0 px-1 rounded"
        classList={{
          "text-destructive font-medium": props.isOverdue,
          "text-muted-foreground": !props.isOverdue && !isDeadline(),
          "text-orange-600 dark:text-orange-400": !props.isOverdue && isDeadline()
        }}>
        {isDeadline() ? "⏰" : "📅"} {formatRelativeDate(displayDate(), today)}
      </span>
    </Show>
  )
}

type NoteListProps = {
  query: string
  highlightQuery: string
  cards: Card[]
  focusedIndex: number
  listHasFocus: boolean
  compact?: boolean
  agendaGroups?: AgendaGroup[]
  onFocusIndex: (index: number) => void
  onFocusList?: () => void
  onCreateNote: (title: string) => void
  onOpenInNewWindow?: (card: Card) => void
  onDeleteCard?: (card: Card) => void
  onTogglePin?: (card: Card) => void
}

const NoteList: Component<NoteListProps> = (props) => {
  let listRef: HTMLDivElement | undefined

  const isNewNoteItem = (index: number) => index === props.cards.length
  const isAgendaMode = () => props.agendaGroups && props.agendaGroups.length > 0

  const groupHeaderIndices = createMemo(() => {
    if (!isAgendaMode()) return new Map<number, string>()
    const map = new Map<number, string>()
    let idx = 0
    for (const group of props.agendaGroups!) {
      map.set(idx, group.label)
      idx += group.cards.length
    }
    return map
  })

  const isOverdueCard = createMemo(() => {
    if (!isAgendaMode()) return new Set<string>()
    const overdueGroup = props.agendaGroups!.find((g) => g.id === "overdue")
    return new Set(overdueGroup?.cards.map((c) => c.id) || [])
  })

  createEffect(() => {
    const idx = props.focusedIndex
    if (idx >= 0 && listRef) {
      const item = listRef.querySelector(`[data-index="${idx}"]`) as HTMLElement | undefined
      item?.scrollIntoView({ block: "nearest", behavior: "instant" })
    }
  })

  const getItemClass = (isFocused: boolean) => {
    if (!isFocused) return "hover:bg-muted/30"
    return props.listHasFocus ? "bg-list-active" : "bg-list-active-muted"
  }

  const handleItemClick = (index: number) => {
    props.onFocusIndex(index)
    props.onFocusList?.()
  }

  const compact = () => props.compact ?? true

  const handleContextMenu = async (e: MouseEvent, card: Card) => {
    e.preventDefault()
    const isPinned = appStore.isPinned(card.id)
    const statuses = settingsStore.getTaskStatuses()
    const statusSubmenu = [
      { id: "status:", label: "(Not a task)", checked: card.data.status === undefined },
      ...statuses.map((s) => ({
        id: `status:${s.id}`,
        label: s.name,
        checked: card.data.status === s.id
      }))
    ]

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const scheduleSubmenu = [
      { id: "schedule:", label: "(Clear)", checked: !card.data.schedule },
      { id: `schedule:${today.toISOString()}`, label: "Today", checked: false },
      { id: `schedule:${tomorrow.toISOString()}`, label: "Tomorrow", checked: false },
      { id: `schedule:${nextWeek.toISOString()}`, label: "Next Week", checked: false }
    ]

    const deadlineSubmenu = [
      { id: "deadline:", label: "(Clear)", checked: !card.data.deadline },
      { id: `deadline:${today.toISOString()}`, label: "Today", checked: false },
      { id: `deadline:${tomorrow.toISOString()}`, label: "Tomorrow", checked: false },
      { id: `deadline:${nextWeek.toISOString()}`, label: "Next Week", checked: false }
    ]

    const action = await window.api.contextMenu.show([
      { id: "open", label: "Open in New Window" },
      { id: "pin", label: isPinned ? "Unpin" : "Pin" },
      {
        id: "status",
        label: "Switch status to...",
        type: "submenu" as const,
        submenu: statusSubmenu
      },
      {
        id: "schedule",
        label: "Schedule...",
        type: "submenu" as const,
        submenu: scheduleSubmenu
      },
      {
        id: "deadline",
        label: "Deadline...",
        type: "submenu" as const,
        submenu: deadlineSubmenu
      },
      { id: "sep", label: "", type: "separator" },
      { id: "delete", label: "Delete", destructive: true }
    ])
    if (action === "open") props.onOpenInNewWindow?.(card)
    else if (action === "pin") props.onTogglePin?.(card)
    else if (action === "delete") props.onDeleteCard?.(card)
    else if (action?.startsWith("status:")) {
      const statusId = action.slice(7)
      await appStore.updateCardStatus(card.id, statusId || undefined)
    } else if (action?.startsWith("schedule:")) {
      const date = action.slice(9)
      await appStore.updateCardSchedule(card.id, date || undefined)
    } else if (action?.startsWith("deadline:")) {
      const date = action.slice(9)
      await appStore.updateCardDeadline(card.id, date || undefined)
    }
  }

  return (
    <div
      class="flex flex-col w-full overflow-hidden text-xs bg-surface/95"
      classList={{ "h-[200px] shrink-0 border-b": compact(), "flex-1 min-h-0": !compact() }}>
      <div
        ref={listRef}
        class="flex-1 overflow-y-auto min-h-0"
        style={{ transform: "translate3d(0, 0, 0)", "will-change": "transform" }}>
        <For each={props.cards}>
          {(card, index) => (
            <>
              <Show when={groupHeaderIndices().get(index())}>
                <div class="px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-muted/30 border-b border-border/40 sticky top-0">
                  {groupHeaderIndices().get(index())}
                </div>
              </Show>
              <div
                data-index={index()}
                class={`group flex border-b border-border/40 cursor-pointer px-2 ${compact() ? "items-center gap-2 py-0.5" : "flex-col py-1.5"} ${getItemClass(props.focusedIndex === index())}`}
                onClick={() => handleItemClick(index())}
                onContextMenu={(e) => handleContextMenu(e, card)}>
                <Show
                  when={compact()}
                  fallback={
                    <>
                      <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-1.5 min-w-0">
                          <TaskStatusIcon status={card.data.status} />
                          <span
                            class={`truncate ${card.data.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                            <HighlightedText
                              text={appStore.getCardTitle(card.id)() || "Untitled"}
                              query={props.highlightQuery}
                            />
                          </span>
                        </div>
                        <Show
                          when={isAgendaMode()}
                          fallback={
                            <div class="text-muted-foreground whitespace-nowrap shrink-0 text-[10px]">
                              {formatRelativeTime(card.updatedAt)}
                            </div>
                          }>
                          <DateBadge card={card} isOverdue={isOverdueCard().has(card.id)} />
                        </Show>
                      </div>
                      <Show when={getCardBody(card.id)}>
                        <div
                          class={`mt-0.5 line-clamp-2 text-[11px] leading-relaxed ${card.data.status === "done" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          <HighlightedText text={getCardBody(card.id)} query={props.highlightQuery} />
                        </div>
                      </Show>
                    </>
                  }>
                  <div class="flex-1 min-w-0 flex items-center gap-1.5">
                    <TaskStatusIcon status={card.data.status} />
                    <div class="flex-1 min-w-0 flex items-center">
                      <span
                        class={`shrink-0 ${card.data.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        <HighlightedText
                          text={appStore.getCardTitle(card.id)() || "Untitled"}
                          query={props.highlightQuery}
                        />
                      </span>
                      <Show when={!isAgendaMode() && getCardBody(card.id)}>
                        <span
                          class={`truncate ml-2 ${card.data.status === "done" ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
                          -{" "}
                          <HighlightedText text={getCardBody(card.id)} query={props.highlightQuery} />
                        </span>
                      </Show>
                    </div>
                    <Show
                      when={isAgendaMode()}
                      fallback={
                        <div class="text-muted-foreground whitespace-nowrap shrink-0 text-[10px]">
                          {formatRelativeTime(card.updatedAt)}
                        </div>
                      }>
                      <DateBadge card={card} isOverdue={isOverdueCard().has(card.id)} />
                    </Show>
                  </div>
                </Show>
              </div>
            </>
          )}
        </For>
        <Show when={!isAgendaMode()}>
          <div
            data-index={props.cards.length}
            class={`flex items-center gap-3 border-b border-border/40 cursor-pointer px-2 ${compact() ? "py-0.5" : "py-1.5"} ${getItemClass(isNewNoteItem(props.focusedIndex))}`}
            onClick={() => handleItemClick(props.cards.length)}>
          <Plus class="size-3.5 stroke-[1.5px] text-muted-foreground ml-0.5" />
          <span class="text-muted-foreground">
            New note: "<span class="text-foreground">{props.query || "Untitled"}</span>"
          </span>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default NoteList
