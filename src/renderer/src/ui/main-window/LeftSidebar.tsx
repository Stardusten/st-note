import { cn } from "@renderer/lib/common/utils/tailwindcss"
import { appStore } from "@renderer/lib/state/AppStore"
import {
  Book,
  Bot,
  LibraryBig,
  Pencil,
  Pin
} from "lucide-solid"
import { Component, For, Show } from "solid-js"

export type ViewMode = "editor" | "all-cards"

type LeftSidebarProps = {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
}

const LeftSidebar: Component<LeftSidebarProps> = (props) => {
  const activeClass = "bg-[#131316]/40 border text-foreground"
  const inactiveClass =
    "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"

  return (
    <div
      class="w-[230px] h-full border-r flex flex-col"
      style={{
        background: "rgba(26, 27, 31, 0.95)"
      }}>
      <div class="border-b px-[12px] pb-[12px]">
        <div class="text-muted-foreground/60 font-medium text-[0.625rem] py-[8px] tracking-[0.8px]">
          VIEWS
        </div>
        <div class="flex flex-col gap-1">
          <div
            class={cn(
              "cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border text-sm transition-colors",
              props.activeView === "editor" ? activeClass : inactiveClass
            )}
            onClick={() => props.onViewChange("editor")}>
            <div class="flex flex-row gap-2 items-center pl-2">
              <Pencil class="size-4 stroke-[1.5]" />
              <div>Editor</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">
              {appStore.getCards().length}
            </span>
          </div>

          <div
            class={cn(
              "cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border text-sm transition-colors",
              props.activeView === "all-cards" ? activeClass : inactiveClass
            )}
            onClick={() => props.onViewChange("all-cards")}>
            <div class="flex flex-row gap-2 items-center pl-2">
              <LibraryBig class="size-4 stroke-[1.5]" />
              <div>All Cards</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">
              {appStore.getCards().length}
            </span>
          </div>

          <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <div class="flex flex-row gap-2 items-center pl-2">
              <Book class="size-4 stroke-[1.5]" />
              <div>Journal</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">0</span>
          </div>

          <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            <div class="flex flex-row gap-2 items-center pl-2">
              <Bot class="size-4 stroke-[1.5]" />
              <div>LM Assistant</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">0</span>
          </div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto px-[12px] py-[12px]">
        <div class="text-muted-foreground/60 font-medium text-[0.625rem] py-[8px] tracking-[0.8px] flex items-center justify-between group">
          <span>PINNED</span>
        </div>

        <Show
          when={appStore.getPinnedCards().length > 0}
          fallback={
            <div class="text-xs text-muted-foreground/50 py-2 px-2 italic">
              No pinned cards yet.
              <br />
              Pin important cards to access them quickly.
            </div>
          }>
          <div class="flex flex-col gap-1">
            <For each={appStore.getPinnedCards()}>
              {(card) => (
                <div
                  class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  onClick={() => {
                    appStore.selectCard(card.id)
                    props.onViewChange("editor")
                  }}>
                  <div class="flex flex-row gap-2 items-center truncate">
                    <Pin class="size-3.5 stroke-[1.5] shrink-0" />
                    <div class="truncate">
                      {appStore.getCardTitle(card.id)() || "Untitled"}
                    </div>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div>
      </div>
    </div>
  )
}

export default LeftSidebar
