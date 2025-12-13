import { onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import type { NoteEditorHandle } from "@renderer/lib/editor/NoteEditor"
import type { SearchState } from "./useSearch"
import type { NavigationState } from "./useNavigation"

export type KeyboardHandlerDeps = {
  search: SearchState
  nav: NavigationState
  searchInputRef: () => HTMLInputElement | undefined
  editorRef: () => NoteEditorHandle | undefined
  onCreateNote: (title: string) => Promise<void>
  onOpenInNewWindow: (card: { id: string }) => void
}

export function useKeyboard(deps: KeyboardHandlerDeps) {
  const { search, nav, searchInputRef, editorRef, onCreateNote, onOpenInNewWindow } = deps

  const isEditorFocused = () => document.activeElement?.closest(".prosemirror-editor") !== null

  const focusEditor = () => {
    nav.blurList()
    editorRef()?.focusEndOfTitle()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.keyCode === 229) return

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

    // Cmd+Shift+Enter: cycle task status (works everywhere)
    if (e.key === "Enter" && e.metaKey && e.shiftKey) {
      e.preventDefault()
      const currentCard = appStore.getCurrentCard()
      if (currentCard) {
        appStore.cycleTaskStatusForward(currentCard.id)
      }
      return
    }

    if (isEditorFocused()) return

    if (e.key === "Backspace" && nav.listHasFocus() && nav.focusedCard()) {
      e.preventDefault()
      const card = nav.focusedCard()
      if (card && confirm(`Delete "${appStore.getCardTitle(card.id)()}"?`)) {
        appStore.deleteCard(card.id)
      }
      return
    }

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

    if (e.key === "Tab" && nav.listHasFocus() && !nav.isNewNoteIndex(nav.focusedIndex())) {
      e.preventDefault()
      const card = nav.focusedCard()
      if (card) {
        if (e.shiftKey) {
          appStore.cycleTaskStatusBackward(card.id)
        } else {
          appStore.cycleTaskStatusForward(card.id)
        }
      }
      return
    }

    if (e.key === "Enter" && nav.focusedIndex() >= 0) {
      e.preventDefault()

      const isSearchFocused = document.activeElement === searchInputRef()

      // Cmd-Enter in search input only: create new note with query as title
      if (e.metaKey && isSearchFocused) {
        onCreateNote(search.query() || "Untitled").then(() => {
          requestAnimationFrame(() => editorRef()?.selectTitle())
        })
        return
      }

      // Cmd-Enter elsewhere: do nothing (reserved for future use)
      if (e.metaKey) return

      if (nav.isNewNoteIndex(nav.focusedIndex())) {
        onCreateNote(search.query() || "Untitled").then(() => {
          requestAnimationFrame(() => editorRef()?.selectTitle())
        })
        return
      }

      const card = nav.focusedCard()
      if (!card) return

      if (e.shiftKey) {
        onOpenInNewWindow(card)
        return
      }

      // Enter: open note and focus end of title
      appStore.selectCard(card.id)
      focusEditor()
    }
  }

  onMount(() => window.addEventListener("keydown", handleKeyDown))
  onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
}
