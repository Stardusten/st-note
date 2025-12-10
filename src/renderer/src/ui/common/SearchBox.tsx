import { FileIcon } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"
import { Component, createSignal, For, Show, onMount, onCleanup, createEffect, on } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"

type SearchBoxProps = {
  onSelectCard: (cardId: string) => void
  onCreateNote: (title: string) => void
  onClose?: () => void
  onFocusedCardChange?: (cardId: string | null) => void
  resetTrigger?: number
}

const SearchBox: Component<SearchBoxProps> = (props) => {
  const [query, setQuery] = createSignal("")
  const [focusedIndex, setFocusedIndex] = createSignal(0)
  const [itemRefs, setItemRefs] = createSignal<Record<number, HTMLElement>>({})
  let inputRef: HTMLInputElement | undefined

  const setItemRef = (el: HTMLElement | undefined, index: number) => {
    setItemRefs((prev) => {
      const next = { ...prev }
      if (el) next[index] = el
      else delete next[index]
      return next
    })
  }

  const searchResults = () => {
    const q = query().trim()
    if (!q) {
      const allCards = appStore.getCards()
      const recentIds = new Set(appStore.getRecentCards().map((c) => c.id))
      const recentCards = appStore.getRecentCards()
      const otherCards = allCards.filter((c) => !recentIds.has(c.id))
      return [...recentCards, ...otherCards]
    }
    return appStore.getSearchResults()
  }

  const scrollToFocusedItem = () => {
    const el = itemRefs()[focusedIndex()]
    if (el) el.scrollIntoView({ block: "nearest" })
  }

  createEffect(on(focusedIndex, scrollToFocusedItem))

  createEffect(
    on([focusedIndex, searchResults], () => {
      const index = focusedIndex()
      const results = searchResults()
      if (index < results.length) {
        props.onFocusedCardChange?.(results[index].id)
      } else {
        props.onFocusedCardChange?.(null)
      }
    })
  )

  createEffect(() => {
    if (props.resetTrigger !== undefined) {
      setQuery("")
      setFocusedIndex(0)
      appStore.clearSearch()
      inputRef?.focus()
    }
  })

  const handleSearch = (value: string) => {
    setQuery(value)
    appStore.performSearch(value)
    setFocusedIndex(0)
  }

  const handleInput = (e: InputEvent) => {
    if (e.isComposing) return
    handleSearch((e.target as HTMLInputElement).value)
  }

  const handleCompositionEnd = (e: CompositionEvent) => {
    handleSearch((e.target as HTMLInputElement).value)
  }

  const selectCard = (cardId: string) => {
    props.onSelectCard(cardId)
    appStore.clearSearch()
    setQuery("")
  }

  const createNewNote = async () => {
    const title = query()
    props.onCreateNote(title)
    appStore.clearSearch()
    setQuery("")
  }

  const totalItems = () => {
    const hasQuery = query().trim().length > 0
    return searchResults().length + (hasQuery ? 1 : 0)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return
    if (e.key === "Escape") {
      e.preventDefault()
      props.onClose?.()
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev + 1) % totalItems())
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setFocusedIndex((prev) => (prev - 1 + totalItems()) % totalItems())
    } else if (e.key === "Enter") {
      e.preventDefault()
      const focused = focusedIndex()
      if (focused < searchResults().length) {
        selectCard(searchResults()[focused].id)
      } else {
        createNewNote()
      }
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown)
    if (inputRef) inputRef.focus()
  })

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <>
      <div class="relative">
        <TextField class="px-5 pt-4">
          <TextFieldInput
            ref={inputRef}
            class="h-[60px] z-1 !text-lg placeholder:text-lg placeholder:text-muted-foreground"
            style={{
              background:
                "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
              "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
              border: "0.5px solid transparent"
            }}
            placeholder="Find, create or ask AI"
            value={query()}
            onInput={handleInput}
            onCompositionEnd={handleCompositionEnd}
            autofocus
          />
        </TextField>
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="px-5 py-[13px] text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
          <Show when={query().trim()} fallback="ALL NOTES">
            RESULTS ({searchResults().length})
          </Show>
        </div>
        <div class="flex-1 overflow-y-auto">
          <For each={searchResults()}>
            {(card, index) => (
              <div ref={(el) => setItemRef(el, index())} class="px-5 py-1 first:pt-1">
                <div
                  class="relative flex items-center p-[8px] text-foreground text-sm rounded-md cursor-pointer"
                  classList={{ "bg-[#25262a]": focusedIndex() === index() }}
                  style={{
                    "border-color": "transparent",
                    "box-shadow":
                      focusedIndex() === index()
                        ? "rgba(78, 79, 82, 0.9) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px"
                        : undefined
                  }}
                  onMouseEnter={() => setFocusedIndex(index())}
                  onClick={() => selectCard(card.id)}>
                  <FileIcon class="size-4 stroke-[1.5px] mr-2" />
                  <span>{appStore.getCardTitle(card.id)()}</span>
                  <Show when={focusedIndex() === index()}>
                    <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[20px]"></div>
                  </Show>
                </div>
              </div>
            )}
          </For>

          <Show when={query().trim()}>
            <div
              ref={(el) => setItemRef(el, searchResults().length)}
              class="px-5 pt-1 pb-2"
              classList={{ "first:pt-2": searchResults().length === 0 }}>
              <div
                class="relative flex items-center p-[8px] text-foreground text-sm rounded-md cursor-pointer"
                classList={{ "bg-[#25262a]": focusedIndex() === searchResults().length }}
                style={{
                  "border-color": "transparent",
                  "box-shadow":
                    focusedIndex() === searchResults().length
                      ? "rgba(78, 79, 82, 0.9) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px"
                      : undefined
                }}
                onMouseEnter={() => setFocusedIndex(searchResults().length)}
                onClick={createNewNote}>
                <span class="text-muted-foreground">
                  + New note:{" "}
                  <span class="text-foreground">
                    "<span class="underline">{query()}</span>"
                  </span>
                </span>
                <Show when={focusedIndex() === searchResults().length}>
                  <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[20px]"></div>
                </Show>
              </div>
            </div>
          </Show>
        </div>
        {/* <div class="h-[16px]"></div> */}
      </div>
    </>
  )
}

export default SearchBox
