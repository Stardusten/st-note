import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { appStore } from "@renderer/lib/state/AppStore"
import type { Card } from "@renderer/lib/common/types/card"
import { Plus } from "lucide-solid"
import { Component, createEffect, For, Show } from "solid-js"
import HighlightedText from "./components/HighlightedText"
import type { SearchListItem } from "./hooks/useSearch"

type NoteListProps = {
  query: string
  highlightQuery: string
  items: SearchListItem[]
  focusedIndex: number
  listHasFocus: boolean
  compact?: boolean
  onFocusIndex: (index: number) => void
  onFocusList?: () => void
  onCreateNote: (title: string) => void
  onOpenInNewWindow?: (card: Card) => void
  onDeleteCard?: (card: Card) => void
  onTogglePin?: (card: Card) => void
}

const NoteList: Component<NoteListProps> = (props) => {
  let listRef: HTMLDivElement | undefined

  const isNewNoteItem = (index: number) => index === props.items.length

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

    const action = await window.api.contextMenu.show([
      { id: "open", label: "Open in New Window" },
      { id: "pin", label: isPinned ? "Unpin" : "Pin" },
      { id: "sep", label: "", type: "separator" },
      { id: "delete", label: "Delete", destructive: true }
    ])
    if (action === "open") props.onOpenInNewWindow?.(card)
    else if (action === "pin") props.onTogglePin?.(card)
    else if (action === "delete") props.onDeleteCard?.(card)
  }

  return (
    <div
      class="flex flex-col w-full overflow-hidden text-xs bg-surface/95"
      classList={{ "h-[200px] shrink-0 border-b": compact(), "flex-1 min-h-0": !compact() }}>
      <div
        ref={listRef}
        class="flex-1 overflow-y-auto min-h-0"
        style={{ transform: "translate3d(0, 0, 0)", "will-change": "transform" }}>
        <For each={props.items}>
          {(item, index) => (
            <div
              data-index={index()}
              class={`group flex border-b border-border/40 cursor-pointer px-2 ${compact() ? "items-center gap-2 py-0.5" : "flex-col py-1.5"} ${getItemClass(props.focusedIndex === index())}`}
              onClick={() => handleItemClick(index())}
              onContextMenu={(e) => handleContextMenu(e, item.card)}>
              <Show
                when={compact()}
                fallback={
                  <>
                    <div class="flex items-center justify-between gap-2">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <span class="truncate text-foreground">
                          <HighlightedText text={item.title || "Untitled"} query={props.highlightQuery} />
                        </span>
                      </div>
                      <div class="text-muted-foreground whitespace-nowrap shrink-0 text-[10px]">
                        {formatRelativeTime(item.card.updatedAt)}
                      </div>
                    </div>
                    <Show when={item.body}>
                      <div class="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                        <HighlightedText text={item.body} query={props.highlightQuery} />
                      </div>
                    </Show>
                  </>
                }>
                <div class="flex-1 min-w-0 flex items-center gap-1.5">
                  <div class="flex-1 min-w-0 flex items-center">
                    <span class="shrink-0 text-foreground">
                      <HighlightedText text={item.title || "Untitled"} query={props.highlightQuery} />
                    </span>
                    <Show when={item.body}>
                      <span class="truncate ml-2 text-muted-foreground">
                        - <HighlightedText text={item.body} query={props.highlightQuery} />
                      </span>
                    </Show>
                  </div>
                  <div class="text-muted-foreground whitespace-nowrap shrink-0 text-[10px]">
                    {formatRelativeTime(item.card.updatedAt)}
                  </div>
                </div>
              </Show>
            </div>
          )}
        </For>
        <div
          data-index={props.items.length}
          class={`flex items-center gap-3 border-b border-border/40 cursor-pointer px-2 ${compact() ? "py-0.5" : "py-1.5"} ${getItemClass(isNewNoteItem(props.focusedIndex))}`}
          onClick={() => handleItemClick(props.items.length)}>
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
