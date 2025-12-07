import { type Component, Show } from "solid-js"
import { Button } from "../solidui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../solidui/dropdown-menu"
import { ArrowLeft, ArrowRight, Database, MoreVertical, PanelRight, Search, StickyNoteIcon } from "lucide-solid"
import { appStore } from "@renderer/lib/state/AppStore"

type TitleBarProps = {
  onOpenSettings: () => void
}

const TitleBar: Component<TitleBarProps> = (props) => {
  const currentCardTitle = () => {
    const card = appStore.getCurrentCard()
    return card ? appStore.getCardTitle(card.id)() : null
  }

  return (
    <div class="relative flex items-center justify-center shrink-0 z-1000 h-[42px]">
      <div
        class="absolute top-0 left-0 right-0 bottom-0 select-none bg-gradient-to-r from-[#0d0d0f] to-[#151619] border-b"
        style={{
          "-webkit-app-region": "drag",
          "-webkit-user-select": "none",
          background: "rgb(21, 22, 25)"
        }}
      />
      <div
        class="w-full ml-[70px] px-[10px] z-999 flex flex-row items-center justify-between"
        style={{ "user-select": "none" }}>
        <div class="flex flex-row items-center gap-2" style={{ "-webkit-app-region": "no-drag" }}>
          <Button
            variant="ghost"
            size="xs-icon"
            class="!text-foreground"
            disabled={!appStore.canGoBack()}
            onClick={() => appStore.goBack()}>
            <ArrowLeft class="size-4 stroke-[1.5]" />
          </Button>
          <Button
            variant="ghost"
            size="xs-icon"
            disabled={!appStore.canGoForward()}
            onClick={() => appStore.goForward()}>
            <ArrowRight class="size-4 stroke-[1.5]" />
          </Button>
          <Show when={currentCardTitle()}>
            <span class="border-r w-[1px] h-[16px] mr-2"></span>
            <StickyNoteIcon class="size-4 stroke-[1.5px" />
            <span class="text-foreground text-sm max-w-[200px] truncate">{currentCardTitle()}</span>
          </Show>
        </div>
        <div class="flex flex-row items-center gap-2" style={{ "-webkit-app-region": "no-drag" }}>
          <button
            class="h-[28px] w-[200px] rounded-full bg-none cursor-pointer border border-border flex items-center px-3 gap-2 text-muted-foreground/50 text-sm hover:bg-input/70 transition-colors"
            onClick={() => appStore.openSearchPanel()}>
            <Search class="size-4 stroke-[1.5]bg-none" />
            <span>Find, create or ask AI</span>
          </button>
          <Button variant="ghost" size="xs-icon">
            <Database class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <PanelRight class="size-4 stroke-[1.5]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="xs-icon">
                <MoreVertical class="size-4 stroke-[1.5]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="min-w-[180px] mt-2">
              <DropdownMenuItem onSelect={() => props.onOpenSettings()}>Settings</DropdownMenuItem>
              <DropdownMenuItem>Open data folder</DropdownMenuItem>
              <DropdownMenuItem>Check for updates</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive">Quit</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default TitleBar
