import { type Component } from "solid-js"
import { Button } from "../solidui/button"
import { ArrowLeft, ArrowRight, Database, Inbox, PanelRight } from "lucide-solid"
import SearchInput from "./SearchInput"

const TitleBar: Component = () => {
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
        style={{
          "-webkit-app-region": "no-drag",
          "user-select": "none"
        }}>
        <div class="flex flex-row items-center gap-2">
          <Button variant="ghost" size="xs-icon" class="!text-foreground">
            <ArrowLeft class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <ArrowRight class="size-4 stroke-[1.5]" />
          </Button>
          {/* breadcrumb */}
          <span class="border-r w-[1px] h-[16px] mr-2"></span>
          <div class="flex flex-row gap-2 items-center text-foreground text-sm">
            <Inbox class="size-4 stroke-[1.5]" />
            <span>Notes</span>
          </div>
        </div>
        <div class="flex flex-row items-center gap-2">
          <SearchInput />
          <Button variant="ghost" size="xs-icon">
            <Database class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <PanelRight class="size-4 stroke-[1.5]" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default TitleBar
