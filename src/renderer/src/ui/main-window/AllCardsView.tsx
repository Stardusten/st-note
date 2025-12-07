import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { appStore } from "@renderer/lib/state/AppStore"
import { Check, ChevronDown, Plus, SquareCheckBig, StickyNoteIcon, Trash } from "lucide-solid"
import { Component, createMemo, createSignal, For, Show } from "solid-js"
import { Button, ButtonProps } from "../solidui/button"
import { Checkbox } from "../solidui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "../solidui/dropdown-menu"
import "./all-cards-view.css"

type AllCardsViewProps = {
  onSelectCard: (id: string) => void
}

const AllCardsView: Component<AllCardsViewProps> = (props) => {
  const [sortOrder, setSortOrder] = createSignal<"updated" | "created" | "title">("updated")
  const [selectedIds, setSelectedIds] = createSignal<Set<string>>(new Set())

  const toggleSelection = (id: string) => {
    const current = new Set(selectedIds())
    if (current.has(id)) {
      current.delete(id)
    } else {
      current.add(id)
    }
    setSelectedIds(current)
  }

  const sortedCards = createMemo(() => {
    const all = appStore.getCards()
    return [...all].sort((a, b) => {
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

  const isAllSelected = createMemo(() => {
    const count = sortedCards().length
    return count > 0 && selectedIds().size === count
  })

  const isPartiallySelected = createMemo(() => {
    const count = sortedCards().length
    return count > 0 && selectedIds().size > 0 && selectedIds().size < count
  })

  const toggleSelectAll = () => {
    if (isAllSelected()) {
      setSelectedIds(new Set<string>())
    } else {
      setSelectedIds(new Set<string>(sortedCards().map((c) => c.id)))
    }
  }

  const handleDeleteSelected = async () => {
    if (confirm(`Delete ${selectedIds().size} notes?`)) {
      const ids = Array.from(selectedIds())
      for (const id of ids) {
        await appStore.deleteCard(id)
      }
      setSelectedIds(new Set<string>())
    }
  }

  const handleCreateCard = async () => {
    const newCard = await appStore.createCard()
    props.onSelectCard(newCard.id)
  }

  const handleToggleTaskStatus = () => {
    appStore.toggleCardTaskBulk(Array.from(selectedIds()))
  }

  const handleTaskCheckboxClick = (e: MouseEvent, cardId: string, checked: boolean | undefined) => {
    e.preventDefault()
    e.stopPropagation()
    // 仅切换 完成/未完成 状态，不改变是否为任务
    if (checked !== undefined) {
      appStore.updateCardChecked(cardId, !checked)
    }
  }

  return (
    <div
      class="flex flex-col w-full h-full relative overflow-hidden"
      style={{
        background: "rgba(26, 27, 31, 0.95)"
      }}>
      {/* Toolbar */}
      <div class="flex flex-row items-center justify-between pl-8 h-[42px] border-b shrink-0">
        <div class="flex flex-row items-center">
          <Checkbox
            checked={isAllSelected()}
            indeterminate={isPartiallySelected()}
            onChange={toggleSelectAll}
            class="mr-4"
          />
          <div class="text-sm text-muted-foreground mr-2">{appStore.getCards().length} cards</div>
          <Show when={selectedIds().size > 0}>
            <div class="h-3 w-[1px] bg-border mr-2"></div>
            <div class="text-sm text-muted-foreground">{selectedIds().size} selected</div>
          </Show>
        </div>

        <div class="flex flex-row items-center h-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              as={(props: ButtonProps) => (
                <Button
                  variant="text-only"
                  class="h-8 text-sm gap-2 mr-4 text-muted-foreground hover:text-foreground"
                  {...props}>
                  <span>Sort by</span>
                  <ChevronDown class="size-4 stroke-[1.5px]" />
                </Button>
              )}
            />
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={() => setSortOrder("updated")}>
                Updated Time
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortOrder("created")}>
                Created Time
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortOrder("title")}>Title</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Show when={selectedIds().size > 0}>
            <button
              class="h-full w-[42px] text-sm border-l border-border/40 text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleToggleTaskStatus}
              title="Toggle task status">
              <SquareCheckBig class="size-4 stroke-[1.5px]" />
            </button>

            <button
              class="h-full w-[42px] text-sm border-l border-border/40 text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer"
              onClick={handleDeleteSelected}
              title="Delete selected">
              <Trash class="size-4 stroke-[1.5px]" />
            </button>
          </Show>

          <button
            class="h-full w-[42px] border-l border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center justify-center cursor-pointer"
            onClick={handleCreateCard}
            title="New note">
            <Plus class="size-4 stroke-[1.5px]" />
          </button>
        </div>
      </div>

      <div
        class="flex-1 overflow-y-auto pb-8 min-h-0"
        // 解决莫名其妙的变黑问题
        style={{
          transform: "translate3d(0, 0, 0)",
          "will-change": "transform"
        }}>
        <For each={sortedCards()}>
          {(card) => (
            <div
              class="group flex items-center gap-4 py-3 px-8 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => props.onSelectCard(card.id)}>
              <Checkbox
                checked={selectedIds().has(card.id)}
                onChange={() => toggleSelection(card.id)}
              />
              <div class="flex-1 min-w-0 flex items-center gap-3">
                <Show
                  when={card.data.checked !== undefined}
                  fallback={
                    <div class="p-1.5 bg-muted rounded-md shrink-0">
                      <StickyNoteIcon class="size-4 stroke-[1.5px] text-muted-foreground" />
                    </div>
                  }>
                  <div class="w-7 flex justify-center shrink-0">
                    <div
                      class="task-checkbox border rounded-full shadow-[0_1px_0_0_rgba(26,27,31,1)] \
                      cursor-pointer relative transition-all inline-flex items-center justify-center \
                      size-[1.25em] border-[1px] border-[#d9d9d9] \
                      bg-[radial-gradient(\
                        39.58%_39.58%_at_16.79%_14.58%,\
                        rgba(255,255,255,0.23)_0%,\
                        rgba(255,255,255,0)_100%),\
                        rgba(255,255,255,0.05)\
                      ]"
                      onClick={(e) => handleTaskCheckboxClick(e, card.id, card.data.checked)}>
                      <Check
                        class="absolute z-1 text-[#fff] transition-opacity size-[0.7em] opacity-0 data-checked:opacity-100 hover:opacity-50"
                        data-checked={card.data.checked || undefined}
                      />
                    </div>
                  </div>
                </Show>

                <div class="flex-1 min-w-0">
                  <div class="text-sm text-foreground truncate">
                    {appStore.getCardTitle(card.id)() || "Untitled"}
                  </div>
                </div>

                <div class="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                  {formatRelativeTime(card.updatedAt)}
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default AllCardsView
