import { Component, createSignal, createMemo, createEffect, For, Show, Setter, JSX } from "solid-js"
import { render } from "solid-js/web"
import { Plus } from "lucide-solid"
import type {
  CardSuggestionItem,
  SuggestionProps,
  SuggestionRenderer
} from "./cardref-suggestion-plugin"

type CardRefPopupProps = {
  items: () => CardSuggestionItem[]
  query: () => string
  selectedIndex: () => number
  setSelectedIndex: Setter<number>
  onSelect: (item: CardSuggestionItem) => void
  onCreateCard: (title: string) => void
  position: () => { left: number; top: number; lineHeight: number } | null
}

const POPUP_WIDTH = 280
const POPUP_MAX_HEIGHT = 200
const POPUP_SPACING = 4
const WINDOW_PADDING = 8

const CardRefPopupUI: Component<CardRefPopupProps> = (props) => {
  let listRef: HTMLDivElement | undefined
  const itemRefs = new Map<number, HTMLElement>()

  const setItemRef = (el: HTMLElement | undefined, index: number) => {
    if (el) itemRefs.set(index, el)
    else itemRefs.delete(index)
  }

  const popupStyle = createMemo<JSX.CSSProperties>(() => {
    const pos = props.position()
    if (!pos) return {}

    const { left: x, top: y, lineHeight } = pos
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = x
    if (left + POPUP_WIDTH > viewportWidth - WINDOW_PADDING) {
      left = viewportWidth - POPUP_WIDTH - WINDOW_PADDING
    }
    left = Math.max(WINDOW_PADDING, left)

    const spaceBelow = viewportHeight - y - POPUP_SPACING - WINDOW_PADDING
    const spaceAbove = y - lineHeight - POPUP_SPACING - WINDOW_PADDING

    if (spaceBelow < POPUP_MAX_HEIGHT && spaceAbove > spaceBelow) {
      const top = y - lineHeight - POPUP_SPACING
      const maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceAbove)
      return {
        left: `${left}px`,
        top: `${top}px`,
        "max-height": `${maxHeight}px`,
        transform: "translateY(-100%)"
      }
    } else {
      const top = y + POPUP_SPACING
      const maxHeight = Math.min(POPUP_MAX_HEIGHT, spaceBelow)
      return {
        left: `${left}px`,
        top: `${top}px`,
        "max-height": `${maxHeight}px`
      }
    }
  })

  createEffect(() => {
    props.selectedIndex()
    if (!listRef || props.selectedIndex() < 0 || props.items().length === 0) return
    const activeItem = itemRefs.get(props.selectedIndex())
    if (!activeItem) return
    activeItem.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" })
  })

  const showPopup = createMemo(() => {
    const pos = props.position()
    return pos !== null
  })

  const isCreateSelected = createMemo(() => {
    const hasQuery = props.query().trim().length > 0
    return hasQuery && props.selectedIndex() === props.items().length
  })

  return (
    <Show when={showPopup()}>
      <div
        class="fixed z-[9999] flex flex-col rounded-sm border border-border/50 overflow-hidden text-xs bg-surface shadow-xl"
        style={{
          width: `${POPUP_WIDTH}px`,
          ...popupStyle()
        }}>
        <div ref={listRef} class="overflow-y-auto">
          <For each={props.items()}>
            {(item, index) => (
              <div
                ref={(el) => setItemRef(el, index())}
                class={`flex items-center px-2 py-1 cursor-pointer ${
                  props.selectedIndex() === index() ? "bg-blue-500/30" : "hover:bg-muted/30"
                }`}
                onMouseEnter={() => props.setSelectedIndex(index())}
                onClick={() => props.onSelect(item)}>
                <span class="truncate text-foreground">{item.title || "Untitled"}</span>
              </div>
            )}
          </For>
          <Show when={props.query().trim().length > 0}>
            <div
              ref={(el) => setItemRef(el, props.items().length)}
              class={`flex items-center gap-2 px-2 py-1 cursor-pointer ${
                isCreateSelected() ? "bg-blue-500/30" : "hover:bg-muted/30"
              }`}
              onMouseEnter={() => props.setSelectedIndex(props.items().length)}
              onClick={() => props.onCreateCard(props.query().trim())}>
              <Plus class="size-3 stroke-[1.5px] text-muted-foreground shrink-0" />
              <span class="text-muted-foreground truncate">
                New note: "<span class="text-foreground">{props.query().trim()}</span>"
              </span>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}

export function createCardRefPopupRenderer(
  getItems: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>,
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
): () => SuggestionRenderer {
  let container: HTMLDivElement | null = null
  let currentCommand: ((item: CardSuggestionItem) => void) | null = null
  let currentQuery = ""

  const [items, setItems] = createSignal<CardSuggestionItem[]>([])
  const [query, setQuery] = createSignal("")
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [position, setPosition] = createSignal<{
    left: number
    top: number
    lineHeight: number
  } | null>(null)

  const handleSelect = (item: CardSuggestionItem) => {
    currentCommand?.(item)
  }

  const handleCreateCard = async (title: string) => {
    if (!onCreateCard) return
    const newCard = await onCreateCard(title)
    if (newCard) currentCommand?.(newCard)
  }

  const ensureRendered = () => {
    if (container) return

    container = document.createElement("div")
    document.body.appendChild(container)

    render(
      () => (
        <CardRefPopupUI
          items={items}
          query={query}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onSelect={handleSelect}
          onCreateCard={handleCreateCard}
          position={position}
        />
      ),
      container
    )
  }

  const getTotalCount = () => {
    const hasQuery = currentQuery.trim().length > 0
    return hasQuery ? items().length + 1 : items().length
  }

  const renderer: SuggestionRenderer = {
    onStart: async (props: SuggestionProps) => {
      ensureRendered()
      currentCommand = props.command
      currentQuery = props.query
      setQuery(props.query)
      setSelectedIndex(0)
      const loadedItems = await getItems(props.query)
      setItems(loadedItems)
      const rect = props.clientRect?.()
      if (rect) setPosition({ left: rect.left, top: rect.bottom, lineHeight: rect.height })
    },
    onUpdate: async (props: SuggestionProps) => {
      ensureRendered()
      currentCommand = props.command
      currentQuery = props.query
      setQuery(props.query)
      const loadedItems = await getItems(props.query)
      setItems(loadedItems)
      const total = props.query.trim().length > 0 ? loadedItems.length + 1 : loadedItems.length
      setSelectedIndex((prev) => Math.min(prev, Math.max(0, total - 1)))
      const rect = props.clientRect?.()
      if (rect) setPosition({ left: rect.left, top: rect.bottom, lineHeight: rect.height })
    },
    onExit: () => {
      setPosition(null)
      setItems([])
      setQuery("")
      setSelectedIndex(0)
      currentCommand = null
      currentQuery = ""
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.isComposing || event.keyCode === 229) return false
      const currentItems = items()
      const total = getTotalCount()
      if (!position() || total === 0) return false

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % total)
        return true
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + total) % total)
        return true
      }
      if (event.key === "Enter") {
        event.preventDefault()
        const idx = selectedIndex()
        if (idx < currentItems.length) {
          const item = currentItems[idx]
          if (item) currentCommand?.(item)
        } else if (currentQuery.trim().length > 0) {
          handleCreateCard(currentQuery.trim())
        }
        return true
      }
      if (event.key === "Escape") {
        event.preventDefault()
        setPosition(null)
        return true
      }
      return false
    }
  }

  return () => renderer
}
