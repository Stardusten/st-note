import { Component, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import type { NoteEditorHandle } from "@renderer/lib/editor/NoteEditor"
import NoteList from "./NoteList"
import TitleBar from "./components/TitleBar"
import SearchInput from "./components/SearchInput"
import ContentArea from "./components/ContentArea"
import { useSearch } from "./hooks/useSearch"
import { useNavigation } from "./hooks/useNavigation"
import { useTheme } from "./hooks/useTheme"
import { useMenuHandlers } from "./hooks/useMenuHandlers"
import { useKeyboard } from "./hooks/useKeyboard"

const HORIZONTAL_BREAKPOINT = 600

const MainWindow: Component = () => {
  let searchInputRef: HTMLInputElement | undefined
  let editorRef: NoteEditorHandle | undefined

  const [windowWidth, setWindowWidth] = createSignal(window.innerWidth)

  const search = useSearch()
  const nav = useNavigation(search.filteredCards)

  const focusSearchInput = () => {
    searchInputRef?.focus()
    searchInputRef?.select()
  }

  useTheme()
  useMenuHandlers(focusSearchInput)

  onMount(async () => {
    await settingsStore.init()
    const lastDbPath = await window.api.database.getPath()
    const dbPath = lastDbPath || (await window.api.database.getDefaultPath())
    await appStore.initWithPath(dbPath)
    focusSearchInput()

    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener("resize", handleResize)
    onCleanup(() => window.removeEventListener("resize", handleResize))

    window.api.editorWindow.registerHandlers({
      getCard: (_dbPath, cardId) => appStore.getCard(cardId),
      updateCard: (_dbPath, cardId, content, source) => {
        appStore.updateCard(cardId, content, source)
      },
      searchCards: (_dbPath, query) => appStore.searchCards(query),
      createCard: async (_dbPath, title) => {
        const card = await appStore.createCardWithoutSelect(title)
        if (!card) return null
        return { id: card.id, title: appStore.getCardTitle(card.id)() }
      },
      getCardTitle: (_dbPath, cardId) => appStore.getCardTitle(cardId)()
    })

    window.api.editorWindow.onNavigateRequest((cardId) => {
      appStore.selectCard(cardId)
    })

    const unsubscribe = appStore.subscribeToUpdates((event) => {
      if (event.type === "committed") {
        for (const op of event.ops) {
          if (op.op === "create" || op.op === "update") {
            const card = appStore.getCard(op.id)
            if (card) window.api.editorWindow.broadcastCardUpdate(card, event.source)
          }
        }
      }
    })
    onCleanup(unsubscribe)
  })

  const effectiveLayout = createMemo(() => {
    const autoLayout = settingsStore.getAutoLayout()
    const preferredLayout = settingsStore.getPreferredLayout()
    if (autoLayout) return windowWidth() >= HORIZONTAL_BREAKPOINT ? "horizontal" : "vertical"
    return preferredLayout
  })

  createEffect(() => {
    search.query()
    nav.setFocusedIndex(0)
  })

  const handleCreateNote = async (title: string) => {
    const card = await appStore.createCard(title)
    if (card) {
      const idx = search.filteredCards().findIndex((c) => c.id === card.id)
      if (idx >= 0) nav.setFocusedIndex(idx)
    }
  }

  const handleOpenInNewWindow = async (card: { id: string }) => {
    const dbPath = appStore.getDbPath()
    if (dbPath) {
      await window.api.editorWindow.open({ cardId: card.id, dbPath })
    }
  }

  const handleDeleteCard = async (card: { id: string }) => {
    const title = appStore.getCardTitle(card.id)() || "Untitled"
    if (confirm(`Delete "${title}"?`)) {
      await appStore.deleteCard(card.id)
    }
  }

  const handleTogglePin = async (card: { id: string }) => {
    await appStore.togglePinCard(card.id)
  }

  useKeyboard({
    search,
    nav,
    searchInputRef: () => searchInputRef,
    editorRef: () => editorRef,
    onCreateNote: handleCreateNote,
    onOpenInNewWindow: handleOpenInNewWindow
  })

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <TitleBar />
      <SearchInput
        ref={searchInputRef}
        value={search.query()}
        onInput={search.updateQuery}
        onCompositionEnd={search.commitComposition}
        onFocus={nav.blurList}
      />
      {effectiveLayout() === "vertical" ? (
        <>
          <NoteList
            query={search.query()}
            highlightQuery={search.highlightQuery()}
            cards={search.filteredCards()}
            focusedIndex={nav.focusedIndex()}
            listHasFocus={nav.listHasFocus()}
            compact={true}
            onFocusIndex={nav.setFocusedIndex}
            onFocusList={nav.focusList}
            onCreateNote={handleCreateNote}
            onOpenInNewWindow={handleOpenInNewWindow}
            onDeleteCard={handleDeleteCard}
            onTogglePin={handleTogglePin}
          />
          <div class="h-1.5 border-b bg-background"></div>
          <ContentArea
            focusedCard={nav.focusedCard()}
            isNewNote={nav.isNewNoteIndex(nav.focusedIndex())}
            editorRef={(r) => { editorRef = r }}
            highlightQuery={search.highlightQuery}
            onFocus={search.pause}
            onBlur={search.resume}
            onDocChange={search.hideHighlight}
          />
        </>
      ) : (
        <div class="flex-1 flex min-h-0">
          <div class="w-[240px] shrink-0 flex flex-col border-r border-border/40">
            <NoteList
              query={search.query()}
              highlightQuery={search.highlightQuery()}
              cards={search.filteredCards()}
              focusedIndex={nav.focusedIndex()}
              listHasFocus={nav.listHasFocus()}
              compact={false}
              onFocusIndex={nav.setFocusedIndex}
              onFocusList={nav.focusList}
              onCreateNote={handleCreateNote}
              onOpenInNewWindow={handleOpenInNewWindow}
              onDeleteCard={handleDeleteCard}
              onTogglePin={handleTogglePin}
            />
          </div>
          <ContentArea
            focusedCard={nav.focusedCard()}
            isNewNote={nav.isNewNoteIndex(nav.focusedIndex())}
            editorRef={(r) => { editorRef = r }}
            highlightQuery={search.highlightQuery}
            onFocus={search.pause}
            onBlur={search.resume}
            onDocChange={search.hideHighlight}
          />
        </div>
      )}
    </div>
  )
}

export default MainWindow
