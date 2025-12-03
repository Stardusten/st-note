import { Component, For } from "solid-js"
import type { StObjectId } from "@renderer/lib/common/types"
import type { BlockContext } from "@renderer/lib/backlink/types"
import { appStore } from "@renderer/lib/state/AppStore"
import { getCardTitle } from "@renderer/lib/common/types/card"

type CardBacklinkEditorProps = {
  cardId: StObjectId
  blocks: BlockContext[]
  onClick?: () => void
}

function getBlockText(node: any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text || ''
  if (node.type === 'cardRef') return `[[${node.attrs?.title || 'Untitled'}]]`
  if (Array.isArray(node.content)) {
    return node.content.map(getBlockText).join('')
  }
  return ''
}

const CardBacklinkEditor: Component<CardBacklinkEditorProps> = (props) => {
  const card = () => appStore.getCards().find(c => c.id === props.cardId)

  return (
    <div
      class="p-[16px] w-full min-h-[60px] rounded-md cursor-pointer hover:opacity-90 transition-opacity"
      style={{
        "box-shadow":
          "rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px",
        background:
          "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        border: "0.5px solid transparent"
      }}
      onClick={props.onClick}>
      <div class="text-xs text-muted-foreground mb-2 font-medium">
        {card() ? getCardTitle(card()!) : 'Untitled'}
      </div>
      <div class="text-sm flex flex-col gap-1">
        <For each={props.blocks}>
          {(block) => (
            <div
              class={block.isMatch ? 'bg-yellow-500/20 rounded px-1 -mx-1' : ''}
              style={{ 'padding-left': `${(block.node.attrs?.indent || 0) * 16}px` }}>
              {getBlockText(block.node) || '\u00A0'}
            </div>
          )}
        </For>
      </div>
    </div>
  )
}

export default CardBacklinkEditor
