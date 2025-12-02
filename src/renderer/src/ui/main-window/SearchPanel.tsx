import { FileIcon } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"
import { Component, createSignal, For, Show, onMount, onCleanup } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { getCardTitle } from "@renderer/lib/common/types/card"

type SearchPanelProps = {
  onClose?: () => void
}

const SearchPanel: Component<SearchPanelProps> = (props) => {
  const [query, setQuery] = createSignal("")
  const [focusedIndex, setFocusedIndex] = createSignal(0)
  let inputRef: HTMLInputElement | undefined

  const handleSearch = (value: string) => {
    setQuery(value)
    appStore.performSearch(value)
    // Reset focus: if no results, focus on "New note" item
    const results = appStore.getSearchResults()
    setFocusedIndex(results.length === 0 ? 0 : 0)
  }

  const selectCard = (cardId: string) => {
    appStore.selectCard(cardId)
    props.onClose?.()
    appStore.clearSearch()
    setQuery("")
  }

  const createNewNote = async () => {
    await appStore.createCard(query())
    props.onClose?.()
    appStore.clearSearch()
    setQuery("")
  }

  const searchResults = () => {
    const q = query().trim()
    if (!q) {
      // Show recent cards when no query
      const recent = appStore.getRecentCards()
      if (recent.length > 0) return recent
      // Fallback to first 10 cards if no recent cards
      return appStore.getCards().slice(0, 10)
    }
    return appStore.getSearchResults()
  }
  const totalItems = () => {
    const hasQuery = query().trim().length > 0
    return searchResults().length + (hasQuery ? 1 : 0) // +1 for "New note" item only when there's a query
  }

  const handleKeyDown = (e: KeyboardEvent) => {
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
    // Focus the input when the panel opens
    if (inputRef) {
      inputRef.focus()
    }
  })

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <div class="fixed top-0 left-0 h-screen w-screen flex items-start justify-center pt-[80px] bg-[#000]/40">
      {/* Backdrop for closing */}
      <div class="absolute inset-0" onClick={() => props.onClose?.()} />

      <div
        class="relative w-[650px] max-h-[80vh] flex flex-col border rounded-md bg-[#181a1c] z-10"
        style={{
          "box-shadow":
            "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
        }}>
        <hr
          class="absolute -z-0 top-[45px] h-[1px] w-full bg-[#000]/40 border-[#fff]/20"
          style={{
            "border-width": "0px 0px 0.5px"
          }}></hr>
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
            onInput={(e) => handleSearch(e.currentTarget.value)}
            autofocus
          />
        </TextField>

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-5 py-[13px] text-muted-foreground/60 font-medium text-[0.625rem] py-[8px] tracking-[0.8px]">
            <Show when={query().trim()} fallback="RECENT NOTES">
              RESULTS ({searchResults().length})
            </Show>
          </div>
          <div class="flex-1 overflow-y-auto">
            <div class="h-[2px]"></div>
            {/* Search results or recent cards */}
            <For each={searchResults()}>
              {(card, index) => (
                <div
                  class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
                  classList={{
                    "bg-[#25262a]": focusedIndex() === index()
                  }}
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
                  <span>{getCardTitle(card)}</span>
                  <Show when={focusedIndex() === index()}>
                    <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[20px]"></div>
                  </Show>
                </div>
              )}
            </For>

            {/* New note item - only show when there's a query */}
            <Show when={query().trim()}>
              <div
                class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
                classList={{
                  "bg-[#25262a]": focusedIndex() === searchResults().length
                }}
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
            </Show>

            <div class="h-[8px]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SearchPanel
