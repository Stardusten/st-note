import { Component, For, Show, createSignal, createMemo } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import type { BacklinkContext } from "@renderer/lib/backlink/types"
import BacklinkCard from "./BacklinkCard"
import { ChevronDown, ChevronRight, Link, Sparkles } from "lucide-solid"

export type BacklinkPanelProps = {
  cardId: string
  onNavigate: (cardId: string, pos?: number) => void
}

type TabType = "backlinks" | "potential"

const BacklinkPanel: Component<BacklinkPanelProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(true)
  const [activeTab, setActiveTab] = createSignal<TabType>("backlinks")

  const backlinks = createMemo(() => {
    return appStore.getBacklinks(props.cardId)()
  })

  const potentialLinks = createMemo(() => {
    return appStore.getPotentialLinks(props.cardId)()
  })

  const backlinkCount = () => backlinks().length
  const potentialCount = () => potentialLinks().length

  const currentItems = createMemo<BacklinkContext[]>(() => {
    return activeTab() === "backlinks" ? backlinks() : potentialLinks()
  })

  const hasAnyLinks = () => backlinkCount() > 0 || potentialCount() > 0

  return (
    <div class="backlink-panel mt-8 pt-4 border-t border-border/40">
      {/* Header */}
      <div
        class="flex items-center gap-2 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded())}
      >
        <span class="text-muted-foreground w-4 h-4 flex items-center justify-center group-hover:text-foreground transition-colors">
          {isExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span class="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
          Links
        </span>
        <Show when={hasAnyLinks()}>
          <span class="text-xs text-muted-foreground">
            {backlinkCount() + potentialCount()}
          </span>
        </Show>
      </div>

      {/* Content */}
      <Show when={isExpanded()}>
        <div class="mt-3">
          {/* Tabs */}
          <div class="flex gap-4 mb-3 border-b border-border/40">
            <button
              class={`flex items-center gap-1.5 text-xs font-medium pb-2 transition-colors border-b-2 -mb-px ${
                activeTab() === "backlinks"
                  ? "text-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab("backlinks")
              }}
            >
              <Link size={12} />
              Backlinks
              <span class="text-muted-foreground">({backlinkCount()})</span>
            </button>
            <button
              class={`flex items-center gap-1.5 text-xs font-medium pb-2 transition-colors border-b-2 -mb-px ${
                activeTab() === "potential"
                  ? "text-foreground border-primary"
                  : "text-muted-foreground hover:text-foreground border-transparent"
              }`}
              onClick={(e) => {
                e.stopPropagation()
                setActiveTab("potential")
              }}
            >
              <Sparkles size={12} />
              Potential
              <span class="text-muted-foreground">({potentialCount()})</span>
            </button>
          </div>

          {/* List */}
          <div>
            <Show
              when={currentItems().length > 0}
              fallback={
                <div class="text-sm text-muted-foreground py-2">
                  {activeTab() === "backlinks"
                    ? "No backlinks"
                    : "No potential links"}
                </div>
              }
            >
              <For each={currentItems()}>
                {(item) => (
                  <BacklinkCard
                    cardId={item.sourceCardId}
                    blocks={item.blocks}
                    targetCardId={props.cardId}
                    onNavigate={props.onNavigate}
                  />
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

export default BacklinkPanel
