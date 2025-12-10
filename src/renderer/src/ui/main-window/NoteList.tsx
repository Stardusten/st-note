import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { findHighlightRanges } from "@renderer/lib/common/utils/highlight"
import { appStore } from "@renderer/lib/state/AppStore"
import type { Card } from "@renderer/lib/common/types/card"
import { ChevronDown, Plus, SquareCheckBig, Trash } from "lucide-solid"
import { Component, createEffect, createMemo, createSignal, For, JSX, Show } from "solid-js"
import { Button, ButtonProps } from "../solidui/button"
import { Checkbox } from "../solidui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../solidui/dropdown-menu"

const getCardBody = (cardId: string) => {
  const text = appStore.getCardText(cardId)() || ""
  return text.split("\n").slice(1).join(" ").trim()
}

const HighlightedText: Component<{ text: string; query: string }> = (props) => {
  const parts = createMemo(() => {
    if (!props.query.trim()) return [{ text: props.text, highlight: false }]
    const ranges = findHighlightRanges(props.text, props.query)
    if (ranges.length === 0) return [{ text: props.text, highlight: false }]

    const result: { text: string; highlight: boolean }[] = []
    let lastEnd = 0
    for (const [start, end] of ranges) {
      if (start > lastEnd) result.push({ text: props.text.slice(lastEnd, start), highlight: false })
      result.push({ text: props.text.slice(start, end), highlight: true })
      lastEnd = end
    }
    if (lastEnd < props.text.length)
      result.push({ text: props.text.slice(lastEnd), highlight: false })
    return result
  })

  return (
    <>
      <For each={parts()}>
        {(part) =>
          part.highlight ? (
            <mark class="bg-yellow-500/40 text-inherit">{part.text}</mark>
          ) : (
            <>{part.text}</>
          )
        }
      </For>
    </>
  ) as JSX.Element
}

type NoteListProps = {
  query: string
  cards: Card[]
  focusedIndex: number
  onFocusIndex: (index: number) => void
  onCreateNote: (title: string) => void
}

const NoteList: Component<NoteListProps> = (props) => {
  const [sortOrder, setSortOrder] = createSignal<"updated" | "created" | "title">("updated")
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set())
  let listRef: HTMLDivElement | undefined

  const sortedCards = createMemo(() => {
    if (props.query.trim()) return props.cards
    return [...props.cards].sort((a, b) => {
      if (sortOrder() === "updated") {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      }
      if (sortOrder() === "created") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
      }
      if (sortOrder() === "title") {
        const titleA = appStore.getCardTitle(a.id)() || ""
        const titleB = appStore.getCardTitle(b.id)() || ""
        return titleA.localeCompare(titleB)
      }
      return 0
    })
  })

  const isNewNoteItem = (index: number) => index === sortedCards().length

  createEffect(() => {
    const idx = props.focusedIndex
    if (idx >= 0 && listRef) {
      const item = listRef.children[idx] as HTMLElement | undefined
      item?.scrollIntoView({ block: "nearest", behavior: "instant" })
    }
  })

  const toggleSelection = (id: string) => {
    const current = new Set(selectedIds())
    if (current.has(id)) current.delete(id)
    else current.add(id)
    setSelectedIds(current)
  }

  const isAllSelected = createMemo(() => {
    const count = sortedCards().length
    return count > 0 && selectedIds().size === count
  })

  const isPartiallySelected = createMemo(() => {
    const count = sortedCards().length
    return count > 0 && selectedIds().size > 0 && selectedIds().size < count
  })

  const toggleSelectAll = () => {
    if (isAllSelected()) setSelectedIds(new Set<string>())
    else setSelectedIds(new Set<string>(sortedCards().map((c) => c.id)))
  }

  const handleDeleteSelected = async () => {
    if (confirm(`Delete ${selectedIds().size} notes?`)) {
      for (const id of Array.from(selectedIds())) await appStore.deleteCard(id)
      setSelectedIds(new Set<string>())
    }
  }

  const handleCreateCard = async () => {
    await appStore.createCard()
  }

  const handleToggleTaskStatus = () => {
    appStore.toggleCardTaskBulk(Array.from(selectedIds()))
  }

  return (
    <div
      class="flex flex-col w-full h-[200px] shrink-0 overflow-hidden text-xs border-b"
      style={{ background: "rgba(26, 27, 31, 0.95)" }}>
      <div class="flex flex-row items-center justify-between border-b shrink-0 pl-2 h-[24px]">
        <div class="flex flex-row items-center">
          <Checkbox
            checked={isAllSelected()}
            indeterminate={isPartiallySelected()}
            onChange={toggleSelectAll}
            class="mr-4 scale-90"
          />
          <div class="text-muted-foreground mr-2">{sortedCards().length} notes</div>
          <Show when={selectedIds().size > 0}>
            <div class="h-3 w-[1px] bg-border mr-2" />
            <div class="text-muted-foreground">{selectedIds().size} selected</div>
          </Show>
        </div>

        <div class="flex flex-row items-center h-full">
          <Show when={!props.query.trim()}>
            <DropdownMenu>
              <DropdownMenuTrigger
                as={(triggerProps: ButtonProps) => (
                  <Button
                    variant="text-only"
                    class="h-6 gap-1 mr-2 text-muted-foreground hover:text-foreground text-xs"
                    {...triggerProps}>
                    <span>Sort</span>
                    <ChevronDown class="size-3 stroke-[1.5px]" />
                  </Button>
                )}
              />
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setSortOrder("updated")}>
                  Updated
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("created")}>
                  Created
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setSortOrder("title")}>Title</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Show>

          <Show when={selectedIds().size > 0}>
            <button
              class="h-full w-[24px] border-l border-border/40 text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleToggleTaskStatus}
              title="Toggle task status">
              <SquareCheckBig class="size-3.5 stroke-[1.5px]" />
            </button>
            <button
              class="h-full w-[24px] border-l border-border/40 text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleDeleteSelected}
              title="Delete selected">
              <Trash class="size-3.5 stroke-[1.5px]" />
            </button>
          </Show>

          <button
            class="h-full w-[24px] border-l border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center justify-center cursor-pointer"
            onClick={handleCreateCard}
            title="New note">
            <Plus class="size-3.5 stroke-[1.5px]" />
          </button>
        </div>
      </div>

      <div
        ref={listRef}
        class="flex-1 overflow-y-auto min-h-0"
        style={{ transform: "translate3d(0, 0, 0)", "will-change": "transform" }}>
        <For each={sortedCards()}>
          {(card, index) => (
            <div
              class={`group flex items-center gap-3 border-b border-border/40 cursor-pointer px-2 py-0.5 ${
                props.focusedIndex === index() ? "bg-blue-500/30" : "hover:bg-muted/30"
              }`}
              onClick={() => props.onFocusIndex(index())}>
              <Checkbox
                checked={selectedIds().has(card.id)}
                onChange={() => toggleSelection(card.id)}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                class="scale-75"
              />
              <div class="flex-1 min-w-0 flex items-center gap-2">
                <div class="flex-1 min-w-0 flex items-center">
                  <span class="text-foreground shrink-0">
                    <HighlightedText
                      text={appStore.getCardTitle(card.id)() || "Untitled"}
                      query={props.query}
                    />
                  </span>
                  <Show when={getCardBody(card.id)}>
                    <span class="text-muted-foreground truncate ml-2">
                      - <HighlightedText text={getCardBody(card.id)} query={props.query} />
                    </span>
                  </Show>
                </div>
                <div class="text-muted-foreground whitespace-nowrap shrink-0 text-[10px]">
                  {formatRelativeTime(card.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </For>
        <div
          class={`flex items-center gap-3 border-b border-border/40 cursor-pointer px-2 py-0.5 ${
            isNewNoteItem(props.focusedIndex) ? "bg-blue-500/30" : "hover:bg-muted/30"
          }`}
          onClick={() => props.onFocusIndex(sortedCards().length)}>
          <Plus class="size-3.5 stroke-[1.5px] text-muted-foreground ml-0.5" />
          <span class="text-muted-foreground">
            New note: "<span class="text-foreground">{props.query || "Untitled"}</span>"
          </span>
        </div>
      </div>
    </div>
  )
}

export default NoteList
