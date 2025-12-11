import { Component, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
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
  let editorRef:
    | { focus: () => void; focusFirstMatch: () => void; selectTitle: () => void }
    | undefined

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

  useKeyboard({
    search,
    nav,
    searchInputRef: () => searchInputRef,
    editorRef: () => editorRef,
    onCreateNote: handleCreateNote
  })

  const editorId = createMemo(() => {
    const card = nav.focusedCard()
    return card ? `editor-${card.id}` : undefined
  })

  const handleEditorUpdate = (content: object) => {
    const card = nav.focusedCard()
    if (card) {
      appStore.updateCard(card.id, content, editorId())
      search.hideHighlight()
    }
  }

  const getLastUpdateSource = () => {
    const card = nav.focusedCard()
    return card ? appStore.getLastUpdateSource(card.id) : undefined
  }

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
          />
          <div class="h-1.5 border-b bg-background"></div>
          <ContentArea
            focusedCard={nav.focusedCard()}
            isNewNote={nav.isNewNoteIndex(nav.focusedIndex())}
            editorRef={(r) => {
              editorRef = r
            }}
            editorId={editorId()}
            highlightQuery={search.highlightQuery()}
            onUpdate={handleEditorUpdate}
            onFocus={search.pause}
            onBlur={search.resume}
            getLastUpdateSource={getLastUpdateSource}
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
            />
          </div>
          <ContentArea
            focusedCard={nav.focusedCard()}
            isNewNote={nav.isNewNoteIndex(nav.focusedIndex())}
            editorRef={(r) => {
              editorRef = r
            }}
            editorId={editorId()}
            highlightQuery={search.highlightQuery()}
            onUpdate={handleEditorUpdate}
            onFocus={search.pause}
            onBlur={search.resume}
            getLastUpdateSource={getLastUpdateSource}
          />
        </div>
      )}
    </div>
  )
}

export default MainWindow
