import { onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import type { SearchState } from "./useSearch"
import type { NavigationState } from "./useNavigation"

export type KeyboardHandlerDeps = {
  search: SearchState
  nav: NavigationState
  searchInputRef: () => HTMLInputElement | undefined
  editorRef: () => { focus: () => void; focusFirstMatch: () => void; selectTitle: () => void } | undefined
  onCreateNote: (title: string) => Promise<void>
}

export function useKeyboard(deps: KeyboardHandlerDeps) {
  const { search, nav, searchInputRef, editorRef, onCreateNote } = deps

  const isEditorFocused = () => document.activeElement?.closest(".prosemirror-editor") !== null

  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape: focus search or clear query
    if (e.key === "Escape") {
      e.preventDefault()
      if (document.activeElement === searchInputRef()) {
        search.clearQuery()
      } else {
        searchInputRef()?.focus()
        searchInputRef()?.select()
        nav.blurList()
      }
      return
    }

    // Cmd+Enter: create note
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault()
      onCreateNote(search.query() || "Untitled").then(() => {
        requestAnimationFrame(() => editorRef()?.selectTitle())
      })
      return
    }

    if (isEditorFocused()) return

    // Backspace: delete focused card (only when list has focus)
    if (e.key === "Backspace" && nav.listHasFocus() && nav.focusedCard()) {
      e.preventDefault()
      const card = nav.focusedCard()
      if (card && confirm(`Delete "${appStore.getCardTitle(card.id)()}"?`)) {
        appStore.deleteCard(card.id)
      }
      return
    }

    // Arrow navigation - also focuses list
    if (e.key === "ArrowDown") {
      e.preventDefault()
      nav.moveDown()
      nav.focusList()
      searchInputRef()?.blur()
      return
    }
    if (e.key === "ArrowUp") {
      e.preventDefault()
      nav.moveUp()
      nav.focusList()
      searchInputRef()?.blur()
      return
    }

    // Tab: focus editor
    if (e.key === "Tab" && !e.shiftKey && nav.focusedIndex() >= 0 && !nav.isNewNoteIndex(nav.focusedIndex())) {
      e.preventDefault()
      nav.blurList()
      if (search.query().trim()) editorRef()?.focusFirstMatch()
      else editorRef()?.focus()
      return
    }

    // Enter: select card or create note
    if (e.key === "Enter" && nav.focusedIndex() >= 0) {
      e.preventDefault()
      if (nav.isNewNoteIndex(nav.focusedIndex())) {
        onCreateNote(search.query() || "Untitled").then(() => {
          requestAnimationFrame(() => editorRef()?.selectTitle())
        })
      } else {
        const card = nav.focusedCard()
        if (card) appStore.selectCard(card.id)
      }
    }
  }

  onMount(() => window.addEventListener("keydown", handleKeyDown))
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
}
