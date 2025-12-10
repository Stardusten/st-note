import { Component, createEffect, createMemo, onMount } from "solid-js"
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

const MainWindow: Component = () => {
  let searchInputRef: HTMLInputElement | undefined
  let editorRef: { focus: () => void; focusFirstMatch: () => void; selectTitle: () => void } | undefined

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
      <NoteList
        query={search.query()}
        highlightQuery={search.highlightQuery()}
        cards={search.filteredCards()}
        focusedIndex={nav.focusedIndex()}
        listHasFocus={nav.listHasFocus()}
        onFocusIndex={nav.setFocusedIndex}
        onCreateNote={handleCreateNote}
      />
      <ContentArea
        focusedCard={nav.focusedCard()}
        isNewNote={nav.isNewNoteIndex(nav.focusedIndex())}
        editorRef={(r) => { editorRef = r }}
        editorId={editorId()}
        highlightQuery={search.highlightQuery()}
        onUpdate={handleEditorUpdate}
        getLastUpdateSource={getLastUpdateSource}
      />
    </div>
  )
}

export default MainWindow
