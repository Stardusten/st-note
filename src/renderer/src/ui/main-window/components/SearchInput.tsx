import type { Component } from "solid-js"
import { CalendarCheck } from "lucide-solid"

export type SearchInputProps = {
  ref?: HTMLInputElement
  value: string
  isAgendaMode?: boolean
  onInput: (value: string, isComposing: boolean) => void
  onCompositionEnd: (value: string) => void
  onFocus?: () => void
  onToggleAgenda?: () => void
}

const SearchInput: Component<SearchInputProps> = (props) => (
  <div class="shrink-0 px-2 pb-2 border-b bg-titlebar flex gap-2">
    <input
      ref={props.ref}
      type="text"
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value, e.isComposing)}
      onCompositionEnd={(e) => props.onCompositionEnd(e.currentTarget.value)}
      onFocus={props.onFocus}
      placeholder={props.isAgendaMode ? "Agenda" : "Search or create..."}
      class="flex-1 h-[26px] px-2 text-[13px] bg-input border border-border/50 rounded outline-none
        focus:border-ring/50 text-foreground placeholder:text-muted-foreground"
    />
    <button
      onClick={props.onToggleAgenda}
      class="h-[26px] w-[26px] flex items-center justify-center rounded border border-border/50 hover:bg-muted/30"
      classList={{ "bg-accent border-ring": props.isAgendaMode }}
      title="Toggle Agenda View (Cmd+Shift+A)">
      <CalendarCheck class="size-3.5" classList={{ "text-foreground": props.isAgendaMode, "text-muted-foreground": !props.isAgendaMode }} />
    </button>
  </div>
)

export default SearchInput
