import { type Component, Show, For, onMount, onCleanup, createSignal } from "solid-js"
import LeftSidebar from "./LeftSidebar"
import CardMainEditor from "./CardEditor"
import { ChevronDown, ChevronRight, Link } from "lucide-solid"
import { Button } from "../solidui/button"
import CardBacklinkEditor from "./CardBacklinkEditor"
import SearchPanel from "./SearchPanel"
import { appStore } from "@renderer/lib/state/AppStore"

const Content: Component = () => {
  const [backlinksExpanded, setBacklinksExpanded] = createSignal(true)
  const [potentialLinksExpanded, setPotentialLinksExpanded] = createSignal(true)

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault()
      appStore.openSearchPanel()
    }
    if (e.key === 'Escape' && appStore.isSearchPanelOpen()) {
      e.preventDefault()
      appStore.closeSearchPanel()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const currentCardId = () => appStore.getCurrentCardId()

  const backlinks = () => {
    const id = currentCardId()
    return id ? appStore.getBacklinks(id)() : []
  }

  const potentialLinks = () => {
    const id = currentCardId()
    return id ? appStore.getPotentialLinks(id)() : []
  }

  const handleBacklinkClick = (cardId: string) => {
    appStore.selectCard(cardId)
  }

  return (
    <div
      class="flex-1 w-full flex flex-row overflow-hidden"
      style={{
        background: "linear-gradient(rgb(21, 22, 25) 0%, rgb(37, 38, 42) 100%)"
      }}>
      <LeftSidebar />
      <div class="flex-1 w-full h-full flex flex-col p-4 items-center overflow-y-auto">
        <CardMainEditor />

        <Show when={currentCardId()}>
          <div class="w-full flex flex-col">
            <div class="w-full h-[80px] text-[#d9d9d9] text-[14px] flex flex-row items-end pb-[13px] mb-[13px] border-b">
              <div class="flex w-full flex-row justify-between items-center">
                <div class="flex flex-row gap-3 items-center">
                  <Link class="size-4 stroke-[1.5]" />
                  <span>Backlinks</span>
                  <span class="text-xs bg-muted rounded-[4px] px-2 py-1">{backlinks().length}</span>
                </div>
                <div>
                  <Button variant="ghost" size="xs-icon" onClick={() => setBacklinksExpanded(!backlinksExpanded())}>
                    <Show when={backlinksExpanded()} fallback={<ChevronRight class="size-4 stroke-[1.5]" />}>
                      <ChevronDown class="size-4 stroke-[1.5]" />
                    </Show>
                  </Button>
                </div>
              </div>
            </div>

            <Show when={backlinksExpanded()}>
              <div class="flex flex-col gap-4">
                <Show when={backlinks().length === 0}>
                  <div class="text-muted-foreground text-sm py-4 text-center">No backlinks yet</div>
                </Show>
                <For each={backlinks()}>
                  {(backlink) => (
                    <CardBacklinkEditor
                      cardId={backlink.sourceCardId}
                      blocks={backlink.blocks}
                      onClick={() => handleBacklinkClick(backlink.sourceCardId)}
                    />
                  )}
                </For>
              </div>
            </Show>

            <div class="w-full h-[80px] text-[#d9d9d9] text-[14px] flex flex-row items-end pb-[13px] mb-[13px] border-b">
              <div class="flex w-full flex-row justify-between items-center">
                <div class="flex flex-row gap-3 items-center">
                  <Link class="size-4 stroke-[1.5]" />
                  <span>Potential Links</span>
                  <span class="text-xs bg-muted rounded-[4px] px-2 py-1">{potentialLinks().length}</span>
                </div>
                <div>
                  <Button variant="ghost" size="xs-icon" onClick={() => setPotentialLinksExpanded(!potentialLinksExpanded())}>
                    <Show when={potentialLinksExpanded()} fallback={<ChevronRight class="size-4 stroke-[1.5]" />}>
                      <ChevronDown class="size-4 stroke-[1.5]" />
                    </Show>
                  </Button>
                </div>
              </div>
            </div>

            <Show when={potentialLinksExpanded()}>
              <div class="flex flex-col gap-4">
                <Show when={potentialLinks().length === 0}>
                  <div class="text-muted-foreground text-sm py-4 text-center">No potential links found</div>
                </Show>
                <For each={potentialLinks()}>
                  {(link) => (
                    <CardBacklinkEditor
                      cardId={link.sourceCardId}
                      blocks={link.blocks}
                      onClick={() => handleBacklinkClick(link.sourceCardId)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        </Show>
      </div>

      <Show when={appStore.isSearchPanelOpen()}>
        <SearchPanel onClose={() => appStore.closeSearchPanel()} />
      </Show>
    </div>
  )
}

export default Content
