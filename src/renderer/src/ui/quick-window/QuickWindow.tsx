import { Component, createSignal, Show, onMount, onCleanup } from "solid-js"
import type { Accessor } from "solid-js"
import { Button } from "../solidui/button"
import Kbd from "../solidui/kbd"
import { Inbox } from "lucide-solid"
import NoteEditor from "@renderer/lib/editor/NoteEditor"
import { appStoreIpc } from "@renderer/lib/state/AppStoreIpc"
import type { CardSuggestionItem } from "@renderer/lib/editor/extensions/CardRefSuggestion"
import "./quick-window.css"

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

const emptyContent = {
  type: "doc",
  content: [{ type: "title", attrs: { level: 1 }, content: [] }]
}

const QuickWindow: Component = () => {
  const [content, setContent] = createSignal<any>(emptyContent)
  const [isEmpty, setIsEmpty] = createSignal(true)
  const [resetKey, setResetKey] = createSignal(1)
  const [titleCache, setTitleCache] = createSignal<Map<string, string>>(new Map())
  const [checked, setChecked] = createSignal<boolean | undefined>(undefined)

  const resetEditor = () => {
    setContent(emptyContent)
    setIsEmpty(true)
    setResetKey((k) => k + 1)
    setChecked(undefined)
  }

  onMount(() => {
    // const handleFocus = () => resetEditor()
    const handleWindowKeyDown = (event: KeyboardEvent) => handleKeyDown(event)

    // window.addEventListener("focus", handleFocus)
    // 在捕获阶段，防止和编辑器打架
    window.addEventListener("keydown", handleWindowKeyDown, true)

    onCleanup(() => {
      // window.removeEventListener("focus", handleFocus)
      window.removeEventListener("keydown", handleWindowKeyDown, true)
    })
  })

  const handleUpdate = (newContent: any, text: string) => {
    setContent(newContent)
    setIsEmpty(text.trim().length === 0)
  }

  const handleCapture = async () => {
    if (isEmpty()) {
      window.api.hideQuickWindow()
      return
    }
    await appStoreIpc.captureNote({ content: content(), checked: checked() })
    resetEditor()
    // Do not hide here, let main process handle it to prevent main window flickering
    // window.api.hideQuickWindow()
  }

  const handleToggleTask = () => {
    // 循环: undefined (不是任务) -> false (未完成) -> true (已完成) -> undefined
    const current = checked()
    if (current === undefined) setChecked(false)
    else if (current === false) setChecked(true)
    else setChecked(undefined)
  }

  const handleCheckedChange = (newChecked: boolean) => {
    setChecked(newChecked)
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      e.stopPropagation()
      handleCapture()
      return
    }
    if (e.key === "Escape") {
      if (isEmpty()) {
        window.api.hideQuickWindow()
      } else {
        const discard = window.confirm("Discard this note?")
        if (discard) {
          resetEditor()
          window.api.hideQuickWindow()
        }
      }
    }
  }

  const searchCards = async (query: string): Promise<CardSuggestionItem[]> => {
    const results = await appStoreIpc.searchCards(query)
    const newCache = new Map(titleCache())
    for (const r of results) {
      newCache.set(r.id, r.title)
    }
    setTitleCache(newCache)
    return results.map((r) => ({ id: r.id, title: r.title }))
  }

  const getCardTitle = (cardId: string): Accessor<string> => {
    return () => titleCache().get(cardId) || "Untitled"
  }

  const handleCardClick = (cardId: string) => {
    window.api.search.selectCard(cardId)
    window.api.hideQuickWindow()
  }

  const handleCreateCard = async (title: string): Promise<CardSuggestionItem | null> => {
    return appStoreIpc.createCard(title)
  }

  return (
    <div class="quick-capture-window px-4 pt-4 h-full flex flex-col" style={{ "-webkit-app-region": "drag" }}>
      <div class="absolute left-0 top-0 h-full w-full flex flex-col">
        <div
          class="flex-1 w-full"
          style={{
            background:
              "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box"
          }}></div>
        <hr
          style={{
            margin: "0px",
            "flex-shrink": 0,
            "border-image": "unset",
            height: "1px",
            "background-color": "rgba(0, 0, 0, 0.4)",
            "border-style": "solid",
            "border-width": "0px 0px 0.5px",
            "border-color": "rgba(255, 255, 255, 0.2)"
          }}
        />
        <div class="h-[76px] bg-[#1c1c20]"></div>
      </div>
      <div class="z-1 flex flex-col flex-1 max-h-[284px]">
        <div
          class="flex-1 overflow-y-auto rounded-sm p-6"
          style={{
            background:
              "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
            border: "0.5px solid transparent",
            "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
            transition: "all 300ms ease 0s",
            "-webkit-app-region": "no-drag"
          }}>
          <Show when={resetKey()} keyed>
            {(_key) => (
              <NoteEditor
                content={content()}
                onUpdate={handleUpdate}
                titlePlaceholder="Untitled"
                placeholder="Start writing..."
                showTitleToolbar={false}
                searchCards={searchCards}
                onCardClick={handleCardClick}
                onCreateCard={handleCreateCard}
                getCardTitle={getCardTitle}
                isTask={checked() !== undefined}
                checked={checked() ?? false}
                onCheckedChange={handleCheckedChange}
                onToggleTask={handleToggleTask}
                autoFocus
              />
            )}
          </Show>
        </div>
        <div class="py-3 flex flex-row justify-between items-center" style={{ "-webkit-app-region": "no-drag" }}>
          <div class="text-sm text-foreground flex flex-row items-center gap-2 pl-2">
            <Inbox class="size-4 stroke-[1.5px]" />
            Notes Inbox
          </div>
          <div class="flex flex-row items-center gap-2">
            <Button variant="outline" onClick={handleCapture}>
              Capture
              <div class="flex flex-row gap-1">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>↵</Kbd>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuickWindow
