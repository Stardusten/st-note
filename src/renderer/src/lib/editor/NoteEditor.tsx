import { Component, Show } from "solid-js"
import type { Accessor } from "solid-js"
import { Image, Smile } from "lucide-solid"
import { Button } from "@renderer/ui/solidui/button"
import TiptapEditor from "./TiptapEditor"
import type { CardSuggestionItem } from "./extensions/CardRefSuggestion"
import "./note-editor.css"

type NoteEditorProps = {
  content?: any
  onUpdate?: (content: any, text: string) => void
  placeholder?: string
  titlePlaceholder?: string
  showTitleToolbar?: boolean
  class?: string
  searchCards?: (query: string) => CardSuggestionItem[] | Promise<CardSuggestionItem[]>
  onCardClick?: (cardId: string) => void
  onCreateCard?: (title: string) => Promise<CardSuggestionItem | null>
  getCardTitle?: (cardId: string) => Accessor<string>
  isTask?: boolean
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  onToggleTask?: () => void
}

const NoteEditor: Component<NoteEditorProps> = (props) => {
  return (
    <div class={`note-editor w-full text-[#d9d9d9] ${props.class || ""}`}>
      <Show when={props.showTitleToolbar}>
        <div class="h-[32px] -ml-[8px] flex items-start opacity-0 hover:opacity-100 transition-opacity">
          <div class="flex flex-row gap-2 text-sm">
            <Button variant="ghost" size="sm">
              <Smile class="size-4" />
              <span>Add emoji</span>
            </Button>
            <Button variant="ghost" size="sm">
              <Image class="size-4" />
              <span>Add cover</span>
            </Button>
          </div>
        </div>
      </Show>
      <div class="w-full">
        <TiptapEditor
          content={props.content}
          onUpdate={props.onUpdate}
          titlePlaceholder={props.titlePlaceholder}
          placeholder={props.placeholder}
          searchCards={props.searchCards}
          onCardClick={props.onCardClick}
          onCreateCard={props.onCreateCard}
          getCardTitle={props.getCardTitle}
          isTask={props.isTask}
          checked={props.checked}
          onCheckedChange={props.onCheckedChange}
          onToggleTask={props.onToggleTask}
          class="text-foreground"
        />
      </div>
    </div>
  )
}

export default NoteEditor
