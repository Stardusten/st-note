import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  Show
} from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import NoteList from "./NoteList"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import { prepareSearch } from "@renderer/lib/common/utils/search"

const MainWindow: Component = () => {
  const [query, setQuery] = createSignal("")
  const [focusedIndex, setFocusedIndex] = createSignal(-1)
  let searchInputRef: HTMLInputElement | undefined
  let editorRef: { focus: () => void; focusFirstMatch: () => void } | undefined

  const filteredCards = createMemo(() => {
    let cards = appStore.getCards()
    if (query().trim()) {
      const scorer = prepareSearch(query())
      cards = cards
        .map((card) => {
          const text = appStore.getCardText(card.id)() || ""
          return { card, score: scorer(text) }
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ card }) => card)
    } else {
      cards = [...cards].sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return timeB - timeA
      })
    }
    return cards
  })

  const totalItems = createMemo(() => filteredCards().length + 1)
  const isNewNoteIndex = (idx: number) => idx === filteredCards().length

  const focusedCard = createMemo(() => {
    const idx = focusedIndex()
    const cards = filteredCards()
    return idx >= 0 && idx < cards.length ? cards[idx] : null
  })

  const focusSearchInput = () => {
    searchInputRef?.focus()
    searchInputRef?.select()
    setFocusedIndex(-1)
  }

  onMount(async () => {
    await settingsStore.init()
    appStore.init()
    focusSearchInput()
  })

  createEffect(() => {
    query()
    const cards = filteredCards()
    setFocusedIndex(cards.length > 0 ? 0 : -1)
  })

  const handleCreateNote = async (title: string) => {
    const card = await appStore.createCard(title)
    if (card) {
      const cards = filteredCards()
      const newIndex = cards.findIndex((c) => c.id === card.id)
      if (newIndex >= 0) setFocusedIndex(newIndex)
    }
  }

  const isEditorFocused = () => {
    const active = document.activeElement
    return active?.closest(".prosemirror-editor") !== null
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    const total = totalItems()

    if (e.key === "Escape") {
      e.preventDefault()
      focusSearchInput()
      return
    }

    if (isEditorFocused()) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (total === 0) return
      const newIndex = focusedIndex() + 1 >= total ? 0 : focusedIndex() + 1
      setFocusedIndex(newIndex)
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (total === 0) return
      const newIndex = focusedIndex() <= 0 ? total - 1 : focusedIndex() - 1
      setFocusedIndex(newIndex)
      return
    }

    if (e.key === "Tab" && !e.shiftKey && focusedIndex() >= 0 && !isNewNoteIndex(focusedIndex())) {
      e.preventDefault()
      if (editorRef) {
        if (query().trim()) editorRef.focusFirstMatch()
        else editorRef.focus()
      }
      return
    }

    if (e.key === "Enter" && focusedIndex() >= 0) {
      e.preventDefault()
      if (isNewNoteIndex(focusedIndex())) {
        handleCreateNote(query() || "Untitled")
      } else {
        const card = focusedCard()
        if (card) appStore.selectCard(card.id)
      }
      return
    }
  }

  onMount(() => {
    window.addEventListener("keydown", handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener("keydown", handleKeyDown)
  })

  createEffect(() => {
    const theme = settingsStore.getTheme()
    const resolvedTheme =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme
    document.documentElement.setAttribute("data-kb-theme", resolvedTheme)
  })

  const editorId = createMemo(() => (focusedCard()?.id ? `editor-${focusedCard()!.id}` : undefined))

  const handleEditorUpdate = (content: object, text: string) => {
    const card = focusedCard()
    if (card) appStore.updateCard(card.id, content, text, editorId())
  }

  const getLastUpdateSource = () => {
    const card = focusedCard()
    return card ? appStore.getLastUpdateSource(card.id) : undefined
  }

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <div
        class="shrink-0 h-[34px] select-none flex items-center justify-center"
        style={{ "-webkit-app-region": "drag", background: "rgb(21, 22, 25)" }}>
        <span class="text-[13px] font-medium text-muted-foreground">nv25</span>
      </div>
      <div class="shrink-0 px-2 pb-2 border-b" style={{ background: "rgb(21, 22, 25)" }}>
        <input
          ref={searchInputRef}
          type="text"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder="Search or create..."
          class="w-full h-[26px] px-2 text-[13px] bg-[#2a2b2f] border border-border/50 rounded outline-none \
          focus:border-blue-500/50 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <NoteList
        query={query()}
        cards={filteredCards()}
        focusedIndex={focusedIndex()}
        onFocusIndex={setFocusedIndex}
        onCreateNote={handleCreateNote}
      />
      <Show when={focusedCard()}>
        <div
          class="flex-1 min-h-0 border-t overflow-auto"
          style={{ background: "rgb(26, 27, 31)", zoom: "0.8" }}>
          <NoteEditor
            ref={editorRef}
            content={focusedCard()!.data?.content}
            onUpdate={handleEditorUpdate}
            editorId={editorId()}
            getLastUpdateSource={getLastUpdateSource}
            getCardSuggestions={(q) => appStore.searchCards(q)}
            onCreateCard={async (title) => {
              const card = await appStore.createCard(title)
              return card ? { id: card.id, title: appStore.getCardTitle(card.id)() } : null
            }}
            onCardClick={(cardId) => appStore.selectCard(cardId)}
            getCardTitle={(cardId) => appStore.getCardTitle(cardId)()}
            searchQuery={query()}
            class="w-full h-full p-4"
          />
        </div>
      </Show>
      <Show when={isNewNoteIndex(focusedIndex())}>
        <div
          class="flex-1 min-h-0 border-t overflow-auto flex items-center justify-center"
          style={{ background: "rgb(26, 27, 31)" }}>
          <span class="text-muted-foreground text-sm">Card not created</span>
        </div>
      </Show>
    </div>
  )
}

export default MainWindow
