import { Component, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import type { NoteEditorHandle } from "@renderer/lib/editor/NoteEditor"
import NoteList from "./NoteList"
import AgendaView from "./AgendaView"
import TitleBar from "./components/TitleBar"
import SearchInput from "./components/SearchInput"
import ContentArea from "./components/ContentArea"
import { useSearch } from "./hooks/useSearch"
import { useNavigation } from "./hooks/useNavigation"
import { useTheme } from "./hooks/useTheme"
import { useMenuHandlers } from "./hooks/useMenuHandlers"
import { useKeyboard } from "./hooks/useKeyboard"

type SidebarTab = "cards" | "agenda"

const HORIZONTAL_BREAKPOINT = 600

const MainWindow: Component = () => {
  let searchInputRef: HTMLInputElement | undefined
  let editorRef: NoteEditorHandle | undefined

  const [windowWidth, setWindowWidth] = createSignal(window.innerWidth)
  const [sidebarTab, setSidebarTab] = createSignal<SidebarTab>("cards")

  // Single source of truth for which card is displayed in the editor
  // Only explicit navigation actions should change this
  const [currentCardId, setCurrentCardId] = createSignal<string | null>(null)
  // Track if we're in "new note" mode (typing in search to create)
  const [isNewNoteMode, setIsNewNoteMode] = createSignal(false)

  const search = useSearch()
  const nav = useNavigation(search.filteredCards)

  // Navigate to a card - the only way to change what's shown in editor
  const navigateToCard = (cardId: string | null, scrollPos?: number) => {
    setCurrentCardId(cardId)
    setIsNewNoteMode(false)
    if (scrollPos !== undefined) {
      setTimeout(() => {
        editorRef?.scrollToPos(scrollPos)
      }, 100)
    }
  }

  // Sync navigation from NoteList focusedIndex changes (user clicks or keyboard nav)
  createEffect(() => {
    const card = nav.focusedCard()
    const isNew = nav.isNewNoteIndex(nav.focusedIndex())

    if (isNew) {
      setIsNewNoteMode(true)
      setCurrentCardId(null)
    } else if (card) {
      setCurrentCardId(card.id)
      setIsNewNoteMode(false)
    }
  })

  const focusSearchInput = () => {
    searchInputRef?.focus()
    searchInputRef?.select()
  }

  useTheme()
  useMenuHandlers(focusSearchInput)

  onMount(async () => {
    const lastDbPath = await window.api.database.getPath()
    const dbPath = lastDbPath || (await window.api.database.getDefaultPath())
    await appStore.initWithPath(dbPath)
    await settingsStore.init()
    focusSearchInput()

    // Focus search input when window gains focus
    window.api.window.onFocus(() => {
      focusSearchInput()
    })

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
      navigateToCard(cardId)
    })

    window.api.menu.onToggleAgenda(() => {
      setSidebarTab((prev) => prev === "cards" ? "agenda" : "cards")
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

  // Reset focusedIndex when search query changes, but don't auto-navigate
  createEffect(() => {
    search.query()
    nav.setFocusedIndex(0)
  })


  const handleCreateNote = async (title: string) => {
    const card = await appStore.createCard(title)
    if (card) {
      const idx = search.filteredCards().findIndex((c) => c.id === card.id)
      if (idx >= 0) nav.setFocusedIndex(idx)
      navigateToCard(card.id)
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
      // If we deleted the current card, clear the editor
      if (currentCardId() === card.id) {
        setCurrentCardId(null)
      }
    }
  }

  const handleTogglePin = async (card: { id: string }) => {
    await appStore.togglePinCard(card.id)
  }

  const handleTaskClick = (cardId: string, pos: number) => {
    navigateToCard(cardId, pos)
  }

  // Get the card object for ContentArea
  const activeCard = createMemo(() => {
    const id = currentCardId()
    if (!id) return null
    return appStore.getCard(id) ?? null
  })

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
          <div class="flex border-b border-border/40 text-xs">
            <button
              class={`flex-1 py-1.5 ${sidebarTab() === "cards" ? "text-foreground bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
              onClick={() => setSidebarTab("cards")}>
              Cards
            </button>
            <button
              class={`flex-1 py-1.5 ${sidebarTab() === "agenda" ? "text-foreground bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
              onClick={() => setSidebarTab("agenda")}>
              Agenda
            </button>
          </div>
          {sidebarTab() === "cards" ? (
            <NoteList
              query={search.query()}
              highlightQuery={search.highlightQuery()}
              items={search.filteredItems()}
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
          ) : (
            <div class="h-[200px] shrink-0 border-b overflow-hidden">
              <AgendaView onTaskClick={handleTaskClick} />
            </div>
          )}
          <div class="h-1.5 border-b bg-background"></div>
          <ContentArea
            focusedCard={activeCard()}
            isNewNote={isNewNoteMode()}
            editorRef={(r) => { editorRef = r }}
            highlightQuery={search.highlightQuery}
            onDocChange={search.hideHighlight}
            onNavigate={navigateToCard}
          />
        </>
      ) : (
        <div class="flex-1 flex min-h-0">
          <div class="w-[240px] shrink-0 flex flex-col border-r border-border/40">
            <div class="flex border-b border-border/40 text-xs">
              <button
                class={`flex-1 py-1.5 ${sidebarTab() === "cards" ? "text-foreground bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
                onClick={() => setSidebarTab("cards")}>
                Cards
              </button>
              <button
                class={`flex-1 py-1.5 ${sidebarTab() === "agenda" ? "text-foreground bg-muted/30" : "text-muted-foreground hover:bg-muted/20"}`}
                onClick={() => setSidebarTab("agenda")}>
                Agenda
              </button>
            </div>
            {sidebarTab() === "cards" ? (
              <NoteList
                query={search.query()}
                highlightQuery={search.highlightQuery()}
                items={search.filteredItems()}
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
            ) : (
              <AgendaView onTaskClick={handleTaskClick} />
            )}
          </div>
          <ContentArea
            focusedCard={activeCard()}
            isNewNote={isNewNoteMode()}
            editorRef={(r) => { editorRef = r }}
            highlightQuery={search.highlightQuery}
            onDocChange={search.hideHighlight}
            onNavigate={navigateToCard}
          />
        </div>
      )}
    </div>
  )
}

export default MainWindow
