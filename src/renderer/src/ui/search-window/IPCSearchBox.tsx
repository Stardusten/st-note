import { FileIcon } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"
import { Component, createSignal, For, Show, onMount, onCleanup, createEffect } from "solid-js"
import type { SearchResultItem } from "src/preload"

type IPCSearchBoxProps = {
  onClose?: () => void
  resetTrigger?: number
}

const IPCSearchBox: Component<IPCSearchBoxProps> = (props) => {
  const [query, setQuery] = createSignal("")
  const [focusedIndex, setFocusedIndex] = createSignal(0)
  const [searchResults, setSearchResults] = createSignal<SearchResultItem[]>([])
  let inputRef: HTMLInputElement | undefined

  createEffect(() => {
    if (props.resetTrigger !== undefined) {
      setQuery("")
      setFocusedIndex(0)
      setSearchResults([])
      loadRecent()
      inputRef?.focus()
    }
  })

  const loadRecent = async () => {
    const results = await window.api.search.getRecent()
    if (!query().trim()) setSearchResults(results)
  }

  const handleSearch = async (value: string) => {
    setQuery(value)
    setFocusedIndex(0)
    if (!value.trim()) {
      loadRecent()
      return
    }
    const results = await window.api.search.query(value)
    setSearchResults(results)
  }

  const selectCard = async (cardId: string) => {
    await window.api.search.selectCard(cardId)
    window.api.hideSearchWindow()
  }

  const createNewNote = async () => {
    const title = query()
    await window.api.search.createCard(title)
    window.api.hideSearchWindow()
  }

  const totalItems = () => {
    const hasQuery = query().trim().length > 0
    return searchResults().length + (hasQuery ? 1 : 0)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
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
    loadRecent()
    if (inputRef) inputRef.focus()
  })

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
  })

  return (
    <>
      <div class="relative">
        <hr
          class="absolute -z-0 top-[45px] h-[1px] w-full bg-[#000]/40 border-[#fff]/20"
          style={{ "border-width": "0px 0px 0.5px" }}
        />
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
      </div>

      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="px-5 py-[13px] text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
          <Show when={query().trim()} fallback="RECENT NOTES">
            RESULTS ({searchResults().length})
          </Show>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div class="h-[2px]"></div>
          <For each={searchResults()}>
            {(item, index) => (
              <div
                class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
                classList={{ "bg-[#25262a]": focusedIndex() === index() }}
                style={{
                  "border-color": "transparent",
                  "box-shadow":
                    focusedIndex() === index()
                      ? "rgba(78, 79, 82, 0.9) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px"
                      : undefined
                }}
                onMouseEnter={() => setFocusedIndex(index())}
                onClick={() => selectCard(item.id)}>
                <FileIcon class="size-4 stroke-[1.5px] mr-2" />
                <span>{item.title}</span>
                <Show when={focusedIndex() === index()}>
                  <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[20px]"></div>
                </Show>
              </div>
            )}
          </For>

          <Show when={query().trim()}>
            <div
              class="relative flex items-center p-[8px] mx-5 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
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
          </Show>

          <div class="h-[8px]"></div>
        </div>
      </div>
    </>
  )
}

export default IPCSearchBox
