import { Component, createSignal } from "solid-js"
import { ArrowUpRightIcon } from "lucide-solid"
import type { StObjectId } from "@renderer/lib/common/types"
import type { BlockContext } from "@renderer/lib/backlink/types"
import { appStore } from "@renderer/lib/state/AppStore"
import BacklinkTiptapEditor from "@renderer/lib/editor/BacklinkTiptapEditor"
import "@renderer/lib/editor/note-editor.css"
import { Button } from "../solidui/button"
import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"
import { isTask } from "@renderer/lib/common/types/card"

type CardBacklinkEditorProps = {
  cardId: StObjectId
  blocks: BlockContext[]
  targetCardId: string
  onNavigate?: () => void
}

const CardBacklinkEditor: Component<CardBacklinkEditorProps> = (props) => {
  const editorId = `backlink-editor:${props.cardId}`
  const card = () => appStore.getCards().find((c) => c.id === props.cardId)
  const [expanded, setExpanded] = createSignal(false)

  const handleUpdate = (content: any, text: string) => {
    appStore.updateCard(props.cardId, content, text, editorId)
  }

  const handleCardClick = (cardId: string) => {
    appStore.selectCard(cardId)
  }

  const handleCheckedChange = (checked: boolean) => {
    appStore.updateCardChecked(props.cardId, checked)
  }

  const handleToggleTask = () => {
    appStore.toggleCardTask(props.cardId)
  }

  return (
    <div
      class="px-[16px] pt-[16px] pb-[12px] w-full min-h-[60px] rounded-md"
      style={{
        "box-shadow":
          "rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px",
        background:
          "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        border: "0.5px solid transparent"
      }}>
      <div class="text-[#d9d9d9]">
        <BacklinkTiptapEditor
          content={card()?.data?.content}
          blocks={props.blocks}
          targetCardId={props.targetCardId}
          editorId={editorId}
          expanded={expanded()}
          onUpdate={handleUpdate}
          onCardClick={handleCardClick}
          getCardTitle={appStore.getCardTitle}
          isTask={card() ? isTask(card()!) : false}
          checked={card()?.data.checked ?? false}
          onCheckedChange={handleCheckedChange}
          onToggleTask={handleToggleTask}
        />
      </div>
      <div class="flex items-center justify-between mt-2">
        <Button
          class="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          onClick={() => setExpanded(!expanded())}
          variant="text-only">
          {expanded() ? "Collapse all" : "Expand all"}
        </Button>
        <div class="flex items-center gap-2">
          <span class="text-xs text-muted-foreground">{formatRelativeTime(card()?.createdAt)}</span>
          <Button
            class="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={props.onNavigate}
            variant="text-only">
            <ArrowUpRightIcon size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CardBacklinkEditor
