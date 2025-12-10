import { type Component, Show, createSignal, createMemo } from "solid-js"
import { Key } from "@solid-primitives/keyed"
import { ChevronDown, ChevronLeft, ChevronRight, Link } from "lucide-solid"
import { Button } from "../solidui/button"
import CardMainEditor from "./CardEditor"
import CardBacklinkEditor from "./CardBacklinkEditor"
import { appStore } from "@renderer/lib/state/AppStore"
import { useLayout } from "@renderer/lib/layout/LayoutContext"

const PAGE_SIZE = 10

const CardEditView: Component = () => {
  const layout = useLayout()
  const [backlinksExpanded, setBacklinksExpanded] = createSignal(true)
  const [potentialLinksExpanded, setPotentialLinksExpanded] = createSignal(true)
  const [backlinksPage, setBacklinksPage] = createSignal(0)
  const [potentialLinksPage, setPotentialLinksPage] = createSignal(0)

  const currentCardId = () => appStore.getCurrentCardId()

  const backlinks = () => {
    const id = currentCardId()
    return id ? appStore.getBacklinks(id)() : []
  }

  const potentialLinks = () => {
    const id = currentCardId()
    return id ? appStore.getPotentialLinks(id)() : []
  }

  const sortedBacklinks = createMemo(() => {
    const all = backlinks()
    return [...all].sort((a, b) => {
      const cardA = appStore.getCards().find(c => c.id === a.sourceCardId)
      const cardB = appStore.getCards().find(c => c.id === b.sourceCardId)
      const timeA = cardA?.createdAt ? new Date(cardA.createdAt).getTime() : 0
      const timeB = cardB?.createdAt ? new Date(cardB.createdAt).getTime() : 0
      return timeB - timeA
    })
  })

  const sortedPotentialLinks = createMemo(() => {
    const all = potentialLinks()
    return [...all].sort((a, b) => {
      const cardA = appStore.getCards().find(c => c.id === a.sourceCardId)
      const cardB = appStore.getCards().find(c => c.id === b.sourceCardId)
      const timeA = cardA?.createdAt ? new Date(cardA.createdAt).getTime() : 0
      const timeB = cardB?.createdAt ? new Date(cardB.createdAt).getTime() : 0
      return timeB - timeA
    })
  })

  const pagedBacklinks = createMemo(() => {
    const all = sortedBacklinks()
    const start = backlinksPage() * PAGE_SIZE
    return all.slice(start, start + PAGE_SIZE)
  })

  const pagedPotentialLinks = createMemo(() => {
    const all = sortedPotentialLinks()
    const start = potentialLinksPage() * PAGE_SIZE
    return all.slice(start, start + PAGE_SIZE)
  })

  const backlinksPageCount = () => Math.ceil(backlinks().length / PAGE_SIZE)
  const potentialLinksPageCount = () => Math.ceil(potentialLinks().length / PAGE_SIZE)

  const handleBacklinkClick = (cardId: string) => {
    appStore.selectCard(cardId)
  }

  return (
    <div
      class="w-full h-full flex flex-col p-4 items-center overflow-y-auto"
      style={{
        background: "linear-gradient(rgb(21, 22, 25) 0%, rgb(37, 38, 42) 100%)",
        zoom: layout.isCompact() ? 0.9 : 1
      }}
    >
      <CardMainEditor />

      <Show when={currentCardId()}>
        <div class="w-full flex flex-col">
          {/* Backlinks UI */}
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
                <Key each={pagedBacklinks()} by={backlink => backlink.sourceCardId}>
                  {(backlink) => (
                    <CardBacklinkEditor
                      cardId={backlink().sourceCardId}
                      blocks={backlink().blocks}
                      targetCardId={currentCardId()!}
                      onNavigate={() => handleBacklinkClick(backlink().sourceCardId)}
                    />
                  )}
                </Key>
                <Show when={backlinksPageCount() > 1}>
                  <div class="flex items-center justify-center gap-2 py-2">
                    <Button
                      variant="ghost"
                      size="xs-icon"
                      disabled={backlinksPage() === 0}
                      onClick={() => setBacklinksPage(p => p - 1)}>
                      <ChevronLeft class="size-4" />
                    </Button>
                    <span class="text-xs text-muted-foreground">
                      {backlinksPage() + 1} / {backlinksPageCount()}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs-icon"
                      disabled={backlinksPage() >= backlinksPageCount() - 1}
                      onClick={() => setBacklinksPage(p => p + 1)}>
                      <ChevronRight class="size-4" />
                    </Button>
                  </div>
                </Show>
              </div>
          </Show>

          {/* Potential Links UI */}
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
                <Key each={pagedPotentialLinks()} by={link => link.sourceCardId}>
                  {(link) => (
                    <CardBacklinkEditor
                      cardId={link().sourceCardId}
                      blocks={link().blocks}
                      targetCardId={currentCardId()!}
                      onNavigate={() => handleBacklinkClick(link().sourceCardId)}
                    />
                  )}
                </Key>
                <Show when={potentialLinksPageCount() > 1}>
                  <div class="flex items-center justify-center gap-2 py-2">
                    <Button
                      variant="ghost"
                      size="xs-icon"
                      disabled={potentialLinksPage() === 0}
                      onClick={() => setPotentialLinksPage(p => p - 1)}>
                      <ChevronLeft class="size-4" />
                    </Button>
                    <span class="text-xs text-muted-foreground">
                      {potentialLinksPage() + 1} / {potentialLinksPageCount()}
                    </span>
                    <Button
                      variant="ghost"
                      size="xs-icon"
                      disabled={potentialLinksPage() >= potentialLinksPageCount() - 1}
                      onClick={() => setPotentialLinksPage(p => p + 1)}>
                      <ChevronRight class="size-4" />
                    </Button>
                  </div>
                </Show>
              </div>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default CardEditView
