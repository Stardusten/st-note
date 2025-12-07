import { Component, createSignal } from "solid-js"
import { ArrowUpRightIcon } from "lucide-solid"
import type { StObjectId } from "@renderer/lib/common/types"
import type { BlockContext } from "@renderer/lib/backlink/types"
import { appStore } from "@renderer/lib/state/AppStore"
import { ProseMirrorEditor } from "@renderer/lib/editor/ProseMirrorEditor"
import "@renderer/lib/editor/note-editor.css"
import { Button } from "../solidui/button"
import { formatRelativeTime } from "@renderer/lib/common/utils/relative-time"

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

  const handleUpdate = (content: any) => {
    const extractText = (node: any): string => {
      if (!node) return ""
      if (node.type === "text") return node.text || ""
      if (node.content) return node.content.map(extractText).join("")
      return ""
    }
    appStore.updateCard(props.cardId, content, extractText(content), editorId)
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
        <ProseMirrorEditor
          content={card()?.data?.content}
          onUpdate={handleUpdate}
          editorId={editorId}
          getLastUpdateSource={() => appStore.getLastUpdateSource(props.cardId)}
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
