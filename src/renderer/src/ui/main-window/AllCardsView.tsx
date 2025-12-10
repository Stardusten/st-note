import { cn } from "@renderer/lib/common/utils/tailwindcss"
import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { useLayout } from "@renderer/lib/layout/LayoutContext"
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

const getCardBody = (cardId: string) => {
  const text = appStore.getCardText(cardId)() || ""
  const body = text.split("\n").slice(1).join(" ").trim()
  console.log("[getCardBody] text:", JSON.stringify(text))
  console.log("[getCardBody] body:", JSON.stringify(body))
  return body
}

type AllCardsViewProps = {
  onSelectCard: (id: string) => void
}

const AllCardsView: Component<AllCardsViewProps> = (props) => {
  const layout = useLayout()
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

  const toolbarHeight = () => (layout.isCompact() ? "h-[28px]" : "h-[42px]")
  const toolbarPaddingL = () => (layout.isCompact() ? "pl-2" : "pl-8")
  const toolbarIconWidth = () => (layout.isCompact() ? "w-[28px]" : "w-[42px]")
  const itemPadding = () => (layout.isCompact() ? "px-2 py-1" : "px-8 py-3")
  const textSize = () => (layout.isCompact() ? "text-xs" : "text-sm")
  const checkboxSize = () => (layout.isCompact() ? "scale-90" : "")

  return (
    <div
      class={`flex flex-col w-full h-full relative overflow-hidden ${textSize()}`}
      style={{ background: "rgba(26, 27, 31, 0.95)" }}>
      {/* Toolbar */}
      <div
        class={`flex flex-row items-center justify-between  border-b shrink-0 ${toolbarPaddingL()} ${toolbarHeight()}`}>
        <div class="flex flex-row items-center">
          <Checkbox
            checked={isAllSelected()}
            indeterminate={isPartiallySelected()}
            onChange={toggleSelectAll}
            class={`mr-4 ${checkboxSize()}`}
          />
          <div class="text-muted-foreground mr-2">{appStore.getCards().length} cards</div>
          <Show when={selectedIds().size > 0}>
            <div class="h-3 w-[1px] bg-border mr-2"></div>
            <div class="text-muted-foreground">{selectedIds().size} selected</div>
          </Show>
        </div>

        <div class="flex flex-row items-center h-full">
          <DropdownMenu>
            <DropdownMenuTrigger
              as={(props: ButtonProps) => (
                <Button
                  variant="text-only"
                  class={`h-8 gap-2 mr-4 text-muted-foreground hover:text-foreground ${textSize()}`}
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
              class={`h-full border-l border-border/40 text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center justify-center cursor-pointer`}
              onClick={handleToggleTaskStatus}
              title="Toggle task status">
              <SquareCheckBig class="size-4 stroke-[1.5px]" />
            </button>

            <button
              class={`h-full ${toolbarIconWidth()} border-l border-border/40 text-destructive hover:bg-destructive/10 transition-colors flex items-center justify-center cursor-pointer`}
              onClick={handleDeleteSelected}
              title="Delete selected">
              <Trash class="size-4 stroke-[1.5px]" />
            </button>
          </Show>

          <button
            class={`h-full ${toolbarIconWidth()} border-l border-border/40 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors flex items-center justify-center cursor-pointer`}
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
              class={`group flex items-center gap-4 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer ${itemPadding()}`}
              onClick={() => props.onSelectCard(card.id)}>
              <Checkbox
                checked={selectedIds().has(card.id)}
                onChange={() => toggleSelection(card.id)}
                onClick={(e: MouseEvent) => e.stopPropagation()}
                class={checkboxSize()}
              />
              <div class="flex-1 min-w-0 flex items-center gap-3">
                <div class="flex-1 min-w-0 flex items-center">
                  <span class="text-foreground shrink-0">
                    {appStore.getCardTitle(card.id)() || "Untitled"}
                  </span>
                  <Show when={getCardBody(card.id)}>
                    <span class="text-muted-foreground truncate ml-2">
                      - {getCardBody(card.id)}
                    </span>
                  </Show>
                </div>

                <div class="text-muted-foreground whitespace-nowrap shrink-0">
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
