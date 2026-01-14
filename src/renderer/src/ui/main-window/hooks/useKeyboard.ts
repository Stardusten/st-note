import { onCleanup, onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import { keymapManager, bindings } from "@renderer/lib/keymap"
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

  onMount(() => {
    // Initialize keymap manager
    keymapManager.init()

    // Push the app layer (contextual - active when editor is not focused)
    const appLayer = keymapManager.pushLayer({
      id: "app",
      type: "contextual",
      isActive: () => !isEditorFocused(),
      bindings: bindings({
        Escape: () => {
          if (document.activeElement === searchInputRef()) {
            search.clearQuery()
          } else {
            searchInputRef()?.focus()
            searchInputRef()?.select()
            nav.blurList()
          }
          return true
        },

        ArrowDown: () => {
          nav.moveDown()
          nav.focusList()
          searchInputRef()?.blur()
          return true
        },

        ArrowUp: () => {
          nav.moveUp()
          nav.focusList()
          searchInputRef()?.blur()
          return true
        },

        Backspace: () => {
          if (nav.listHasFocus() && nav.focusedCard()) {
            const card = nav.focusedCard()
            if (card && confirm(`Delete "${appStore.getCardTitle(card.id)()}"?`)) {
              appStore.deleteCard(card.id)
            }
            return true
          }
          return false
        },

        Enter: (e) => {
          if (nav.focusedIndex() < 0) return false

          const isSearchFocused = document.activeElement === searchInputRef()

          if (e.metaKey && isSearchFocused) {
            onCreateNote(search.query() || "Untitled").then(() => {
              requestAnimationFrame(() => editorRef()?.selectTitle())
            })
            return true
          }

          if (e.metaKey) return false

          if (nav.isNewNoteIndex(nav.focusedIndex())) {
            onCreateNote(search.query() || "Untitled").then(() => {
              requestAnimationFrame(() => editorRef()?.selectTitle())
            })
            return true
          }

          const card = nav.focusedCard()
          if (!card) return false

          if (e.shiftKey) {
            onOpenInNewWindow(card)
            return true
          }

          appStore.selectCard(card.id)
          focusEditor()
          return true
        },

        "Cmd-Enter": () => {
          const isSearchFocused = document.activeElement === searchInputRef()
          if (isSearchFocused) {
            onCreateNote(search.query() || "Untitled").then(() => {
              requestAnimationFrame(() => editorRef()?.selectTitle())
            })
            return true
          }
          return false
        },

        "Shift-Enter": () => {
          const card = nav.focusedCard()
          if (card) {
            onOpenInNewWindow(card)
            return true
          }
          return false
        }
      })
    })

    onCleanup(() => {
      keymapManager.popLayer(appLayer.id)
    })
  })
}
