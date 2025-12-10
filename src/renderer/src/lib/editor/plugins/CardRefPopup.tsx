import { Component, createSignal, createMemo, createEffect, For, Show, Setter, JSX } from "solid-js"
import { render } from "solid-js/web"
import type { CardSuggestionItem, SuggestionProps, SuggestionRenderer } from "./cardref-suggestion-plugin"

type CardRefPopupProps = {
  items: () => CardSuggestionItem[]
  query: () => string
  selectedIndex: () => number
  setSelectedIndex: Setter<number>
  onSelect: (item: CardSuggestionItem) => void
  onCreateCard: (title: string) => void
  position: () => { left: number; top: number; lineHeight: number } | null
}

const POPUP_WIDTH = 250
const POPUP_MAX_HEIGHT = 240
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
    activeItem.scrollIntoView({ block: "nearest", inline: "nearest" })
  })

  const showPopup = createMemo(() => {
    const pos = props.position()
    const hasItems = props.items().length > 0
    const hasQuery = props.query().trim().length > 0
    return pos && (hasItems || hasQuery)
  })

  const isCreateSelected = createMemo(() => {
    const hasQuery = props.query().trim().length > 0
    return hasQuery && props.selectedIndex() === props.items().length
  })

  return (
    <Show when={showPopup()}>
      <div
        class="fixed z-[9999] w-[250px] flex flex-col rounded-lg border-[0.5px] border-white/16 bg-[rgb(26,27,31)] py-1.5 pr-1.5"
        style={{
          filter: "drop-shadow(rgba(0, 0, 0, 0.16) 0px 8px 12px)",
          ...popupStyle()
        }}>
        <div class="pt-0.5 pb-1.5 pl-2.5 text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
          INSERT REFERENCES
        </div>
        <div ref={listRef} class="overflow-y-auto" style={{ "max-height": "200px" }}>
          <For each={props.items()}>
            {(item, index) => (
              <div
                ref={(el) => setItemRef(el, index())}
                class="relative flex items-center h-7 text-sm cursor-pointer select-none leading-[120%]"
                onMouseEnter={() => props.setSelectedIndex(index())}
                onClick={() => props.onSelect(item)}>
                <Show when={props.selectedIndex() === index()}>
                  <div
                    class="absolute bg-[#b8b8b8] w-[2px] h-4 rounded-r-[2px] left-0"
                    style={{ "box-shadow": "rgba(255, 255, 255, 0.4) 0px 0px 8px" }}
                  />
                </Show>
                <div
                  class="flex-1 flex items-center h-full ml-1.5 mr-0.5 px-2 rounded-sm overflow-hidden"
                  classList={{
                    "bg-[rgba(21,22,25,0.9)] border-[0.5px] border-[rgb(78,79,82)]": props.selectedIndex() === index(),
                    "border-[0.5px] border-transparent": props.selectedIndex() !== index()
                  }}>
                  <span class="truncate">{item.title || "Untitled"}</span>
                </div>
              </div>
            )}
          </For>
          <Show when={props.query().trim().length > 0}>
            <div
              ref={(el) => setItemRef(el, props.items().length)}
              class="relative flex items-center h-7 text-sm cursor-pointer select-none leading-[120%]"
              onMouseEnter={() => props.setSelectedIndex(props.items().length)}
              onClick={() => props.onCreateCard(props.query().trim())}>
              <Show when={isCreateSelected()}>
                <div
                  class="absolute bg-[#b8b8b8] w-[2px] h-4 rounded-r-[2px] left-0"
                  style={{ "box-shadow": "rgba(255, 255, 255, 0.4) 0px 0px 8px" }}
                />
              </Show>
              <div
                class="flex-1 flex items-center gap-1.5 h-full ml-1.5 mr-0.5 px-2 rounded-sm text-muted-foreground overflow-hidden"
                classList={{
                  "bg-[rgba(21,22,25,0.9)] border-[0.5px] border-[rgb(78,79,82)]": isCreateSelected(),
                  "border-[0.5px] border-transparent": !isCreateSelected()
                }}>
                <span class="truncate">
                  <span class="text-muted-foreground whitespace-nowrap">+ New note: "</span>
                  <span class="text-foreground underline">{props.query().trim()}</span>
                  <span class="text-foreground whitespace-nowrap">"</span>
                </span>
              </div>
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
  const [position, setPosition] = createSignal<{ left: number; top: number; lineHeight: number } | null>(null)

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
