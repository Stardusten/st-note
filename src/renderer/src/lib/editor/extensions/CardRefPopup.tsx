import { Component, createSignal, createMemo, createEffect, For, Show, Setter, JSX } from "solid-js"
import { render } from "solid-js/web"
import type { CardSuggestionItem, SuggestionProps } from "./CardRefSuggestion"

type CardRefPopupProps = {
  items: () => CardSuggestionItem[]
  selectedIndex: () => number
  setSelectedIndex: Setter<number>
  onSelect: (item: CardSuggestionItem) => void
  position: () => { left: number; top: number; lineHeight: number } | null
}

const POPUP_WIDTH = 200
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

  const scrollToActiveItem = () => {
    if (!listRef || props.selectedIndex() < 0 || props.items().length === 0) return
    const activeItem = itemRefs.get(props.selectedIndex())
    if (!activeItem) return
    activeItem.scrollIntoView({ block: "nearest", inline: "nearest" })
  }

  createEffect(() => {
    props.selectedIndex()
    scrollToActiveItem()
  })

  return (
    <Show when={props.position() && props.items().length > 0}>
      <div
        class="fixed z-[9999] w-[200px] flex flex-col rounded-lg border-[0.5px] border-white/16 bg-[rgb(26,27,31)] py-1.5 pr-1.5"
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
                class="relative flex items-center h-7 text-xs cursor-pointer select-none leading-[120%]"
                onMouseEnter={() => props.setSelectedIndex(index())}
                onClick={() => props.onSelect(item)}>
                <Show when={props.selectedIndex() === index()}>
                  <div
                    class="absolute bg-[#b8b8b8] w-[2px] h-4 rounded-r-[2px] left-0"
                    style={{ "box-shadow": "rgba(255, 255, 255, 0.4) 0px 0px 8px" }}
                  />
                </Show>
                <div
                  class="flex-1 flex items-center h-full ml-1.5 mr-0.5 px-2 rounded-sm"
                  classList={{
                    "bg-[rgba(21,22,25,0.9)] border-[0.5px] border-[rgb(78,79,82)]":
                      props.selectedIndex() === index(),
                    "border-[0.5px] border-transparent": props.selectedIndex() !== index()
                  }}>
                  {item.title || "Untitled"}
                </div>
              </div>
            )}
          </For>
        </div>
      </div>
    </Show>
  )
}

export function createCardRefPopupRenderer(
  getItems: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
) {
  let container: HTMLDivElement | null = null
  let currentCommand: ((item: CardSuggestionItem) => void) | null = null

  const [items, setItems] = createSignal<CardSuggestionItem[]>([])
  const [selectedIndex, setSelectedIndex] = createSignal(0)
  const [position, setPosition] = createSignal<{
    left: number
    top: number
    lineHeight: number
  } | null>(null)

  const handleSelect = (item: CardSuggestionItem) => {
    currentCommand?.(item)
  }

  const ensureRendered = () => {
    if (container) return

    container = document.createElement("div")
    document.body.appendChild(container)

    render(
      () => (
        <CardRefPopupUI
          items={items}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          onSelect={handleSelect}
          position={position}
        />
      ),
      container
    )
  }

  return {
    onStart: async (props: SuggestionProps) => {
      ensureRendered()
      currentCommand = props.command
      setSelectedIndex(0)
      const loadedItems = await getItems(props.query)
      setItems(loadedItems)
      const rect = props.clientRect?.()
      if (rect) setPosition({ left: rect.left, top: rect.bottom, lineHeight: rect.height })
    },
    onUpdate: async (props: SuggestionProps) => {
      ensureRendered()
      currentCommand = props.command
      const loadedItems = await getItems(props.query)
      setItems(loadedItems)
      setSelectedIndex((prev) => Math.min(prev, Math.max(0, loadedItems.length - 1)))
      const rect = props.clientRect?.()
      if (rect) setPosition({ left: rect.left, top: rect.bottom, lineHeight: rect.height })
    },
    onExit: () => {
      setPosition(null)
      setItems([])
      setSelectedIndex(0)
      currentCommand = null
    },
    onKeyDown: (event: KeyboardEvent) => {
      const currentItems = items()
      if (!position() || currentItems.length === 0) return false

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % currentItems.length)
        return true
      }
      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length)
        return true
      }
      if (event.key === "Enter") {
        event.preventDefault()
        const item = currentItems[selectedIndex()]
        if (item) currentCommand?.(item)
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
}
