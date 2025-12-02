import { Component, Show, createSignal, onMount, onCleanup } from "solid-js"
import "./card-editor.css"
import {
  Command,
  Image,
  Inbox,
  Link,
  Pin,
  Plus,
  Smile,
  SquareArrowRight,
  WandSparkles
} from "lucide-solid"
import { Button } from "../solidui/button"
import { appStore } from "@renderer/lib/state/AppStore"
import TiptapEditor from "@renderer/lib/editor/TiptapEditor"

const CardMainEditor: Component = () => {
  let saveTimeout: NodeJS.Timeout
  let editorContainer: HTMLDivElement | undefined
  const [showTitleToolbar, setShowTitleToolbar] = createSignal(false)

  const handleContentChange = (content: any, text: string) => {
    const currentCard = appStore.getCurrentCard()
    if (!currentCard) return

    clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      appStore.updateCard(currentCard.id, content, text)
    }, 500)
  }

  const handleCreateCard = async () => {
    await appStore.createCard()
  }

  const currentCard = () => appStore.getCurrentCard()

  onMount(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.classList.contains('editor-title') || target.closest('.editor-title')) {
        setShowTitleToolbar(true)
      }
    }

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const relatedTarget = e.relatedTarget as HTMLElement

      if (target.classList.contains('editor-title') || target.closest('.editor-title')) {
        if (!relatedTarget?.closest('.title-toolbar')) {
          setShowTitleToolbar(false)
        }
      }
    }

    if (editorContainer) {
      editorContainer.addEventListener('mouseover', handleMouseOver)
      editorContainer.addEventListener('mouseout', handleMouseOut)
    }

    onCleanup(() => {
      if (editorContainer) {
        editorContainer.removeEventListener('mouseover', handleMouseOver)
        editorContainer.removeEventListener('mouseout', handleMouseOut)
      }
    })
  })

  return (
    <div
      class="h-[500px] w-full card-editor pt-[68px]"
      style={{
        color: "rgb(217, 217, 217)",
        transition: "box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
        "border-radius": "8px",
        position: "relative",
        border: "0.5px solid transparent",
        "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
        "min-height": "401px",
        background:
          "radial-gradient(100% 210px at center top, rgb(49, 49, 53) 30px, rgb(49, 49, 53) -300%, rgb(31, 32, 36) 780px) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        overflow: "visible"
      }}>
      <Show
        when={currentCard()}
        fallback={
          <div class="flex flex-col items-center justify-center h-full">
            <p class="text-muted-foreground mb-4">No card selected</p>
            <Button onClick={handleCreateCard}>
              <Plus class="size-4 mr-2" />
              Create New Card
            </Button>
          </div>
        }>
        <div ref={editorContainer!} class="px-[64px] pb-[68px] relative">
          <div
            class="title-toolbar absolute left-[56px] top-0 h-[28px] text-sm flex flex-row gap-2 transition-opacity duration-200"
            style={{ opacity: showTitleToolbar() ? 1 : 0 }}
            onMouseLeave={() => setShowTitleToolbar(false)}>
            <Button variant="ghost" size="sm">
              <Smile class="size-4" />
              <span>Add emoji</span>
            </Button>
            <Button variant="ghost" size="sm">
              <Image class="size-4" />
              <span>Add cover</span>
            </Button>
          </div>
          <Show when={currentCard()}>
            <TiptapEditor
              content={currentCard()?.data.content}
              onUpdate={handleContentChange}
              titlePlaceholder="Untitled"
              placeholder="Start writing..."
              class="min-h-[300px] text-foreground"
            />
          </Show>
          <div class="absolute top-0 right-0 p-6 flex flex-row gap-2">
            <Button variant="ghost" size="xs-icon">
              <Link class="size-4 stroke-[1.5]" />
            </Button>
            <Button variant="ghost" size="xs-icon">
              <WandSparkles class="size-4 stroke-[1.5]" />
            </Button>
            <Button variant="ghost" size="xs-icon">
              <Inbox class="size-4 stroke-[1.5]" />
            </Button>
            <Button variant="ghost" size="xs-icon">
              <Pin class="size-4 stroke-[1.5]" />
            </Button>
            <Button variant="ghost" size="xs-icon">
              <SquareArrowRight class="size-4 stroke-[1.5]" />
            </Button>
            <Button variant="ghost" size="xs-icon">
              <Command class="size-4 stroke-[1.5]" />
            </Button>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default CardMainEditor
