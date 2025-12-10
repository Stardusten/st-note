import { cn } from "@renderer/lib/common/utils/tailwindcss"
import { useLayout } from "@renderer/lib/layout/LayoutContext"
import { appStore } from "@renderer/lib/state/AppStore"
import { Book, Bot, LibraryBig, Menu, Pencil, Pin } from "lucide-solid"
import { Component, For, Show } from "solid-js"

export type ViewMode = "editor" | "all-cards"

type LeftSidebarProps = {
  activeView: ViewMode
  onViewChange: (view: ViewMode) => void
}

type SidebarContentProps = LeftSidebarProps & {
  compact?: boolean
}

const SidebarContent: Component<SidebarContentProps> = (props) => {
  const activeClass = "bg-[#131316]/40 border text-foreground"
  const inactiveClass =
    "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"

  const viewItems = [
    {
      id: "editor" as const,
      icon: Pencil,
      label: "Editor",
      count: () => appStore.getCards().length
    },
    {
      id: "all-cards" as const,
      icon: LibraryBig,
      label: "All Cards",
      count: () => appStore.getCards().length
    },
    { id: "journal" as const, icon: Book, label: "Journal", count: () => 0, disabled: true },
    { id: "assistant" as const, icon: Bot, label: "LM Assistant", count: () => 0, disabled: true }
  ]

  const itemHeight = () => (props.compact ? "h-[28px]" : "h-[36px]")
  const textSize = () => (props.compact ? "text-xs" : "text-sm")
  const sectionPadding = () => (props.compact ? "py-[6px]" : "py-[12px]")
  const listPadding = () => (props.compact ? "px-[4px]" : "px-[8px]")
  const itemPadding = () => (props.compact ? "px-[6px]" : "px-[8px]")
  const labelPadding = () => (props.compact ? "px-[8px] pb-[4px]" : "px-[12px] pb-[8px]")

  return (
    <>
      <div class={cn("border-b", sectionPadding())}>
        <div
          class={cn(
            "text-muted-foreground/60 font-medium text-[9px] tracking-[0.8px]",
            labelPadding()
          )}>
          VIEWS
        </div>
        <div class={cn("flex flex-col gap-0.5", listPadding())}>
          <For each={viewItems}>
            {(item) => (
              <div
                class={cn(
                  "cursor-pointer flex flex-row items-center rounded-sm border transition-colors justify-between",
                  itemHeight(),
                  textSize(),
                  itemPadding(),
                  !item.disabled && props.activeView === item.id ? activeClass : inactiveClass,
                  item.disabled && "opacity-50 cursor-default"
                )}
                onClick={() =>
                  !item.disabled &&
                  item.id !== "journal" &&
                  item.id !== "assistant" &&
                  props.onViewChange(item.id)
                }>
                <div class="flex flex-row gap-2 items-center">
                  <item.icon
                    class={cn("stroke-[1.5] shrink-0", props.compact ? "size-3.5" : "size-4")}
                  />
                  <span class="whitespace-nowrap">{item.label}</span>
                </div>
                <span
                  class={cn(
                    "bg-muted rounded-[4px]",
                    props.compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
                  )}>
                  {item.count()}
                </span>
              </div>
            )}
          </For>
        </div>
      </div>

      <div class={cn("flex-1 overflow-y-auto", sectionPadding())}>
        <div
          class={cn(
            "text-muted-foreground/60 font-medium text-[9px] tracking-[0.8px]",
            labelPadding()
          )}>
          PINNED
        </div>

        <Show
          when={appStore.getPinnedCards().length > 0}
          fallback={
            <div
              class={cn(
                "text-muted-foreground/50 italic",
                props.compact ? "text-[10px] py-1 px-[8px]" : "text-xs py-2 px-[12px]"
              )}>
              No pinned cards yet.
              <br />
              Pin important cards to access them quickly.
            </div>
          }>
          <div class={cn("flex flex-col gap-0.5", listPadding())}>
            <For each={appStore.getPinnedCards()}>
              {(card) => (
                <div
                  class={cn(
                    "cursor-pointer flex flex-row items-center rounded-sm border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-colors",
                    itemHeight(),
                    textSize(),
                    itemPadding()
                  )}
                  onClick={() => {
                    appStore.selectCard(card.id)
                    props.onViewChange("editor")
                  }}>
                  <div class="flex flex-row gap-2 items-center min-w-0">
                    <Pin
                      class={cn("stroke-[1.5] shrink-0", props.compact ? "size-3" : "size-3.5")}
                    />
                    <span class="truncate">{appStore.getCardTitle(card.id)() || "Untitled"}</span>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
    </>
  )
}

const LeftSidebar: Component<LeftSidebarProps> = (props) => {
  const layout = useLayout()

  return (
    <Show
      when={!layout.isCompact()}
      fallback={
        <div
          class="absolute left-0 top-0 h-full z-[100]"
          onMouseEnter={() => layout.setSidebarHovered(true)}
          onMouseLeave={() => layout.setSidebarHovered(false)}>
          <div
            class={cn(
              "absolute left-0 top-[60px] w-[20px] h-[28px] bg-[#1a1b1f] border border-l-0 rounded-r-md shadow-md flex items-center justify-center text-muted-foreground/60 transition-opacity",
              layout.sidebarHovered() && "opacity-0 pointer-events-none"
            )}>
            <Menu class="size-3.5 stroke-[1.5]" />
          </div>
          <div
            class={cn(
              "absolute left-0 top-0 h-full w-[180px] border-r bg-[#1a1b1f] flex flex-col transition-all duration-200",
              layout.sidebarHovered()
                ? "opacity-100 translate-x-0 shadow-[4px_0_12px_rgba(0,0,0,0.3)]"
                : "opacity-0 -translate-x-4 pointer-events-none"
            )}>
            <SidebarContent {...props} compact />
          </div>
        </div>
      }>
      <div class="h-full w-[230px] border-r bg-[#1a1b1f] flex flex-col shrink-0">
        <SidebarContent {...props} />
      </div>
    </Show>
  )
}

export default LeftSidebar
