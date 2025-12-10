import type { Component } from "solid-js"

export type SearchInputProps = {
  ref?: HTMLInputElement
  value: string
  onInput: (value: string, isComposing: boolean) => void
  onCompositionEnd: (value: string) => void
  onFocus?: () => void
}

const SearchInput: Component<SearchInputProps> = (props) => (
  <div class="shrink-0 px-2 pb-2 border-b bg-titlebar">
    <input
      ref={props.ref}
      type="text"
      value={props.value}
      onInput={(e) => props.onInput(e.currentTarget.value, e.isComposing)}
      onCompositionEnd={(e) => props.onCompositionEnd(e.currentTarget.value)}
      onFocus={props.onFocus}
      placeholder="Search or create..."
      class="w-full h-[26px] px-2 text-[13px] bg-input border border-border/50 rounded outline-none
        focus:border-ring/50 text-foreground placeholder:text-muted-foreground"
    />
  </div>
)

export default SearchInput
