import { Component, createSignal, createEffect, onMount, onCleanup, Match, Switch, Show, For, JSX } from "solid-js"
import { FileIcon } from "lucide-solid"
import { TextField, TextFieldInput } from "../solidui/text-field"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import { appStoreIpc } from "@renderer/lib/state/appStoreIpc"
import { findHighlightRanges, HighlightRange } from "@renderer/lib/common/utils/highlight"
import type { CardContent, SearchResultItem } from "src/preload"
import "./search-window.css"

type FocusedItem =
  | { type: "card"; cardId: string }
  | { type: "new"; title: string }
  | null

const renderHighlightedText = (text: string, ranges: HighlightRange[]): JSX.Element => {
  if (ranges.length === 0) return <>{text}</>

  const result: JSX.Element[] = []
  let lastEnd = 0

  for (const [start, end] of ranges) {
    if (start > lastEnd) {
      result.push(<span>{text.slice(lastEnd, start)}</span>)
    }
    result.push(<span class="search-highlight">{text.slice(start, end)}</span>)
    lastEnd = end
  }

  if (lastEnd < text.length) {
    result.push(<span>{text.slice(lastEnd)}</span>)
  }

  return <>{result}</>
}

const SearchWindow: Component = () => {
  const [query, setQuery] = createSignal("")
  const [focusedIndex, setFocusedIndex] = createSignal(0)
  const [searchResults, setSearchResults] = createSignal<SearchResultItem[]>([])
  const [cardContent, setCardContent] = createSignal<CardContent | null>(null)
  const [titleCache, setTitleCache] = createSignal<Record<string, string>>({})
  const [itemRefs, setItemRefs] = createSignal<Record<number, HTMLElement>>({})
  let inputRef: HTMLInputElement | undefined
  let isComposing = false
  let loadAllSeq = 0

  const setItemRef = (el: HTMLElement | undefined, index: number) => {
    setItemRefs((prev) => {
      const next = { ...prev }
      if (el) next[index] = el
      else delete next[index]
      return next
    })
  }

  const focusedItem = (): FocusedItem => {
    const index = focusedIndex()
    const results = searchResults()
    const q = query().trim()
    if (index < results.length) {
      return { type: "card", cardId: results[index].id }
    } else if (q) {
      return { type: "new", title: q }
    }
    return null
  }

  const scrollToFocusedItem = () => {
    const el = itemRefs()[focusedIndex()]
    if (el) el.scrollIntoView({ block: "nearest" })
  }

  const loadAll = async () => {
    const seq = ++loadAllSeq
    console.log("[SearchWindow] loadAll called, seq:", seq)
    const results = await appStoreIpc.getAll()
    console.log("[SearchWindow] loadAll got results:", results.length, "seq:", seq, "current:", loadAllSeq)
    if (seq !== loadAllSeq) {
      console.log("[SearchWindow] loadAll skipping stale results")
      return
    }
    if (!query().trim()) {
      console.log("[SearchWindow] loadAll setting results")
      setSearchResults(results)
    }
  }

  const doSearch = async (value: string) => {
    setFocusedIndex(0)
    if (!value.trim()) {
      loadAll()
      return
    }
    const results = await appStoreIpc.query(value)
    setSearchResults(results)
  }

  const handleSearch = async (value: string) => {
    setQuery(value)
    if (isComposing) return
    doSearch(value)
  }

  const handleCompositionStart = () => {
    isComposing = true
  }

  const handleCompositionEnd = (e: CompositionEvent) => {
    isComposing = false
    const value = (e.target as HTMLInputElement).value
    doSearch(value)
  }

  const selectCard = async (cardId: string) => {
    await appStoreIpc.selectCard(cardId)
    appStoreIpc.hideSearchWindow()
  }

  const createNewNote = async () => {
    const title = query()
    await appStoreIpc.createCard(title)
    appStoreIpc.hideSearchWindow()
  }

  const totalItems = () => {
    const hasQuery = query().trim().length > 0
    return searchResults().length + (hasQuery ? 1 : 0)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isComposing) return
    if (e.key === "Escape") {
      e.preventDefault()
      appStoreIpc.hideSearchWindow()
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

  const reset = async () => {
    console.log("[SearchWindow] reset called")
    setQuery("")
    setFocusedIndex(0)
    setCardContent(null)
    await loadAll()
    inputRef?.focus()
  }

  onMount(() => {
    console.log("[SearchWindow] onMount")
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("focus", reset)
    loadAll()
    if (inputRef) inputRef.focus()
  })

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
    window.removeEventListener("focus", reset)
  })

  createEffect(() => {
    scrollToFocusedItem()
  })

  createEffect(async () => {
    const item = focusedItem()
    if (!item || item.type !== "card") {
      setCardContent(null)
      return
    }
    const content = await appStoreIpc.getCardContent(item.cardId)
    if (content) {
      setTitleCache((prev) => ({ ...prev, [content.id]: content.title }))
    }
    setCardContent(content)
  })

  const handleContentUpdate = (content: any) => {
    const item = focusedItem()
    const current = cardContent()
    if (item?.type === "card" && current) {
      appStoreIpc.updateCardContent(item.cardId, content)
      setCardContent({ ...current, content })
    }
  }

  const handleCreateCard = async (title: string) => {
    const result = await appStoreIpc.createCard(title)
    if (result) {
      setTitleCache((prev) => ({ ...prev, [result.id]: result.title }))
    }
    return result
  }

  const handleCardClick = (cardId: string) => {
    appStoreIpc.selectCard(cardId)
    appStoreIpc.hideSearchWindow()
  }

  const getCardTitle = (cardId: string): string => {
    const cached = titleCache()[cardId]
    if (cached) return cached
    appStoreIpc.getCardContent(cardId).then((content) => {
      if (content) setTitleCache((prev) => ({ ...prev, [cardId]: content.title }))
    })
    return "Loading..."
  }

  const previewCardStyle = {
    color: "rgb(217, 217, 217)",
    border: "0.5px solid transparent",
    "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
    background:
      "radial-gradient(100% 210px at center top, rgb(49, 49, 53) 30px, rgb(49, 49, 53) -300%, rgb(31, 32, 36) 780px) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box"
  }

  const focusedItemStyle = "rgba(78, 79, 82, 0.9) 0px 0px 0px 0.5px, rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px"

  return (
    <div
      class="search-window h-full w-full flex rounded-lg overflow-visible"
      style={{
        background: "#181a1c",
        "box-shadow":
          "rgba(0, 0, 0, 0.12) 0px 5px 22px 4px, rgba(0, 0, 0, 0.14) 0px 12px 17px 2px, rgba(0, 0, 0, 0.2) 0px 7px 8px -4px"
      }}>
      <div class="w-[400px] shrink-0 h-full flex flex-col overflow-hidden rounded-lg">
        <div class="relative">
          <hr
            class="absolute -z-0 top-[33px] h-[1px] w-full bg-[#000]/40 border-[#fff]/20"
            style={{ "border-width": "0px 0px 0.5px" }}
          />
          <TextField class="px-4 pt-3">
            <TextFieldInput
              ref={inputRef}
              class="h-[44px] z-1 !text-base placeholder:text-base placeholder:text-muted-foreground"
              style={{
                background:
                  "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(35, 37, 40) 92.59%) padding-box padding-box, \
                  linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(80, 80, 84) 100%) border-box border-box",
                "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
                border: "0.5px solid transparent"
              }}
              placeholder="Find, create or ask AI"
              value={query()}
              onInput={(e) => handleSearch(e.currentTarget.value)}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              autofocus
            />
          </TextField>
        </div>

        <div class="flex-1 flex flex-col overflow-hidden">
          <div class="px-4 py-[10px] text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
            <Show when={query().trim()} fallback="ALL NOTES">
              RESULTS ({searchResults().length})
            </Show>
          </div>
          <div class="flex-1 overflow-y-auto pt-1 pr-1 mr-2">
            <For each={searchResults()}>
              {(item, index) => (
                <div
                  ref={(el) => setItemRef(el, index())}
                  class="relative flex items-center p-[8px] ml-4 mr-1 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
                  classList={{ "bg-[#25262a]": focusedIndex() === index() }}
                  style={{
                    "border-color": "transparent",
                    "box-shadow": focusedIndex() === index() ? focusedItemStyle : undefined
                  }}
                  onMouseEnter={() => setFocusedIndex(index())}
                  onClick={() => selectCard(item.id)}>
                  <FileIcon class="size-4 stroke-[1.5px] mr-2 shrink-0" />
                  <span class="truncate">
                    {renderHighlightedText(item.title, findHighlightRanges(item.title, query()))}
                  </span>
                  <Show when={focusedIndex() === index()}>
                    <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[16px]"></div>
                  </Show>
                </div>
              )}
            </For>

            <Show when={query().trim()}>
              <div
                ref={(el) => setItemRef(el, searchResults().length)}
                class="relative flex items-center p-[8px] ml-4 mr-1 mb-[4px] text-foreground text-sm rounded-md cursor-pointer"
                classList={{ "bg-[#25262a]": focusedIndex() === searchResults().length }}
                style={{
                  "border-color": "transparent",
                  "box-shadow": focusedIndex() === searchResults().length ? focusedItemStyle : undefined
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
                  <div class="absolute bg-[#b8b8b8] w-[3px] h-[24px] rounded-r-[2px] -left-[16px]"></div>
                </Show>
              </div>
            </Show>

            <div class="h-[8px]"></div>
          </div>
        </div>
      </div>

      <Switch>
        <Match when={focusedItem()?.type === "card" && cardContent()}>
          <div
            class="flex-1 h-[calc(100%-24px)] my-3 mr-3 flex flex-col rounded-lg overflow-hidden"
            style={previewCardStyle}>
            <div class="flex-1 overflow-y-auto py-6 px-8">
              <NoteEditor
                content={cardContent()?.content}
                onUpdate={handleContentUpdate}
                searchQuery={query()}
                getCardSuggestions={async (q) => {
                  const results = await appStoreIpc.query(q)
                  results.forEach((r) => {
                    setTitleCache((prev) => ({ ...prev, [r.id]: r.title }))
                  })
                  return results.map((r) => ({ id: r.id, title: r.title }))
                }}
                onCreateCard={handleCreateCard}
                onCardClick={handleCardClick}
                getCardTitle={getCardTitle}
              />
            </div>
          </div>
        </Match>
        <Match when={focusedItem()?.type === "new"}>
          <div
            class="flex-1 h-[calc(100%-24px)] my-3 mr-3 flex flex-col rounded-lg overflow-hidden"
            style={previewCardStyle}>
            <div class="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div class="text-lg mb-2">"{query()}"</div>
              <div class="text-sm">Press Enter to create this note</div>
            </div>
          </div>
        </Match>
      </Switch>
    </div>
  )
}

export default SearchWindow
