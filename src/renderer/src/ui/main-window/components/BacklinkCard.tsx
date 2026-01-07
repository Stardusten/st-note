import { Component, For, Show, createSignal } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"
import type { BlockContext } from "@renderer/lib/backlink/types"
import { ChevronDown, ChevronRight, FileText } from "lucide-solid"

export type BacklinkCardProps = {
  cardId: string
  blocks: BlockContext[]
  targetCardId: string
  onNavigate: (cardId: string, pos?: number) => void
}

const renderNodeContent = (node: any, targetCardId?: string): string => {
  if (!node) return ""

  if (node.type === "text") {
    return node.text || ""
  }

  if (node.type === "cardRef") {
    const cardId = node.attrs?.cardId
    const title = cardId ? appStore.getCardTitle(cardId)() : "Untitled"
    const isTarget = cardId === targetCardId
    if (isTarget) {
      return `[[${title}]]`
    }
    return `[[${title}]]`
  }

  if (Array.isArray(node.content)) {
    return node.content.map((child: any) => renderNodeContent(child, targetCardId)).join("")
  }

  return ""
}

const getBlockText = (block: any, targetCardId?: string): string => {
  if (block.type === "title") {
    return renderNodeContent(block, targetCardId)
  }
  if (block.type === "block" && Array.isArray(block.content)) {
    return block.content.map((child: any) => renderNodeContent(child, targetCardId)).join("")
  }
  return renderNodeContent(block, targetCardId)
}

const getBlockIndent = (block: any): number => {
  if (block.type === "block") {
    return block.attrs?.indent || 0
  }
  return 0
}

const BacklinkCard: Component<BacklinkCardProps> = (props) => {
  const [isExpanded, setIsExpanded] = createSignal(true)

  const title = () => appStore.getCardTitle(props.cardId)() || "Untitled"

  const handleTitleClick = (e: MouseEvent) => {
    e.stopPropagation()
    props.onNavigate(props.cardId)
  }

  const handleBlockClick = (block: BlockContext) => {
    // Navigate to the card - position calculation would require more context
    props.onNavigate(props.cardId)
  }

  return (
    <div class="backlink-card border border-border/50 rounded-md mb-2 overflow-hidden bg-card">
      <div
        class="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-muted/30 border-b border-border/30"
        onClick={() => setIsExpanded(!isExpanded())}
      >
        <span class="text-muted-foreground w-4 h-4 flex items-center justify-center">
          {isExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <FileText size={14} class="text-muted-foreground shrink-0" />
        <span
          class="text-sm font-medium text-foreground hover:text-primary cursor-pointer truncate flex-1"
          onClick={handleTitleClick}
        >
          {title()}
        </span>
        <span class="text-xs text-muted-foreground">{props.blocks.length}</span>
      </div>

      <Show when={isExpanded()}>
        <div class="px-2 py-1.5 space-y-0.5 bg-muted/10">
          <For each={props.blocks}>
            {(block) => {
              const text = getBlockText(block.node, props.targetCardId)
              const indent = getBlockIndent(block.node)

              return (
                <div
                  class="text-sm py-0.5 cursor-pointer hover:bg-muted/30 rounded px-1"
                  style={{ "padding-left": `${indent * 16 + 4}px` }}
                  onClick={() => handleBlockClick(block)}
                >
                  <span
                    class="text-muted-foreground"
                    innerHTML={text.replace(
                      /\[\[([^\]]+)\]\]/g,
                      '<span class="text-primary font-medium">$&</span>'
                    )}
                  />
                </div>
              )
            }}
          </For>
        </div>
      </Show>
    </div>
  )
}

export default BacklinkCard
