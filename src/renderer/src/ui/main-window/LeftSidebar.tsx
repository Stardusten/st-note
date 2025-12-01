import {
  Book,
  Bot,
  CheckCheck,
  ChevronRight,
  Inbox,
  LibraryBig,
  SquareCheckBigIcon
} from "lucide-solid"
import { Component } from "solid-js"
import { Button } from "../solidui/button"

const LeftSidebar: Component = () => {
  return (
    <div
      class="w-[230px] h-full border-r"
      style={{
        background: "rgba(26, 27, 31, 0.95)"
      }}>
      <div class="border-b px-[12px] pb-[12px]">
        <div class="text-muted-foreground/60 font-medium text-[0.625rem] py-[8px] tracking-[0.8px]">
          INBOXES
        </div>
        <div class="flex flex-col gap-1">
          <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center bg-[#131316]/40 border rounded-sm text-sm text-foreground">
            <div class="flex flex-row gap-2 items-center">
              <Button variant="ghost" size="3xs-icon">
                <ChevronRight class="size-4 stroke-[1.5]" />
              </Button>
              <Inbox class="size-4 stroke-[1.5]" />
              <div class="text-foreground">Notes</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
          </div>
          <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-foreground hover:bg-muted">
            <div class="flex flex-row gap-2 items-center">
              <Button variant="ghost" size="3xs-icon">
                <ChevronRight class="size-4 stroke-[1.5]" />
              </Button>
              <CheckCheck class="size-4 stroke-[1.5]" />
              <div class="text-foreground">Tasks</div>
            </div>
            <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
          </div>
        </div>
      </div>
      <div class="border-b p-[12px]">
        <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-foreground hover:bg-muted">
          <div class="flex flex-row gap-2 items-center">
            <Button variant="ghost" size="3xs-icon">
              <ChevronRight class="size-4 stroke-[1.5]" />
            </Button>
            <LibraryBig class="size-4 stroke-[1.5]" />
            <div class="text-foreground">All Cards</div>
          </div>
          <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
        </div>
        <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-foreground hover:bg-muted">
          <div class="flex flex-row gap-2 items-center">
            <Button variant="ghost" size="3xs-icon">
              <ChevronRight class="size-4 stroke-[1.5]" />
            </Button>
            <Book class="size-4 stroke-[1.5]" />
            <div class="text-foreground">Journal</div>
          </div>
          <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
        </div>
      </div>
      <div class="p-[12px]">
        <div class="cursor-pointer py-[2px] px-[4px] h-[36px] flex flex-row justify-between items-center rounded-sm border border-transparent text-sm text-foreground hover:bg-muted">
          <div class="flex flex-row gap-2 items-center">
            <Button variant="ghost" size="3xs-icon">
              <ChevronRight class="size-4 stroke-[1.5]" />
            </Button>
            <Bot class="size-4 stroke-[1.5]" />
            <div class="text-foreground">Chat with AI</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LeftSidebar
