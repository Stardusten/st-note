import { Component, onMount, onCleanup, createEffect } from "solid-js"
import { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { CustomDocument } from "./extensions/CustomDocument"
import { Title } from "./extensions/Title"
import { BetterIndent } from "./extensions/BetterIndent"
import { BulletListItemBlock } from "./extensions/BulletListItemBlock"
import { NumberedListItemBlock } from "./extensions/NumberedListItemBlock"
import { CardRef } from "./extensions/CardRef"
import { BacklinkViewExtension, backlinkViewPluginKey } from "./extensions/BacklinkViewExtension"
import type { BlockContext } from "../backlink/types"
import { appStore } from "../state/AppStore"

type BacklinkTiptapEditorProps = {
  content: any
  blocks: BlockContext[]
  targetCardId: string
  editorId: string
  expanded: boolean
  onUpdate?: (content: any, text: string) => void
  onCardClick?: (cardId: string) => void
}

const BacklinkTiptapEditor: Component<BacklinkTiptapEditorProps> = (props) => {
  let editorElement: HTMLDivElement | undefined
  let editor: Editor | null = null
  let initialContent: any = null

  const visibleNodeIndices = () => {
    if (props.expanded) {
      const content = props.content?.content || []
      const indices = new Set<number>()
      for (let i = 0; i < content.length; i++) indices.add(i)
      return indices
    }
    return new Set(props.blocks.map(b => b.nodeIndex))
  }

  const matchNodeIndices = () => new Set(props.blocks.filter(b => b.isMatch).map(b => b.nodeIndex))

  onMount(() => {
    if (!editorElement) return

    initialContent = props.content

    editor = new Editor({
      element: editorElement,
      extensions: [
        CustomDocument,
        Title,
        StarterKit.configure({
          document: false,
          heading: { levels: [2, 3] },
          dropcursor: false,
          bulletList: false,
          orderedList: false,
          listItem: false
        }),
        BulletListItemBlock,
        NumberedListItemBlock,
        BetterIndent,
        CardRef.configure({
          onCardClick: props.onCardClick
        }),
        BacklinkViewExtension.configure({
          targetCardId: props.targetCardId,
          expanded: props.expanded,
          visibleNodeIndices: visibleNodeIndices(),
          matchNodeIndices: matchNodeIndices()
        }),
        Placeholder.configure({
          placeholder: ""
        })
      ],
      content: initialContent,
      onUpdate: ({ editor }) => {
        const json = editor.getJSON()
        const text = editor.getText()
        props.onUpdate?.(json, text)
      },
      editorProps: {
        attributes: {
          class: "prose prose-sm max-w-none focus:outline-none backlink-editor"
        }
      }
    })

    const unsubscribe = appStore.subscribeToUpdates((event) => {
      if (!editor || editor.isDestroyed) return
      if (event.source === props.editorId) return

      for (const op of event.ops) {
        if (op.op === 'update' && op.id === props.editorId.replace('backlink-editor:', '')) {
          if (op.object && 'data' in op.object) {
            const newContent = (op.object as any).data?.content
            if (newContent) {
              editor.commands.setContent(newContent)
            }
          }
        }
      }
    })

    onCleanup(() => {
      unsubscribe()
    })
  })

  createEffect(() => {
    if (!editor || editor.isDestroyed) return

    const exp = props.expanded
    const visible = visibleNodeIndices()
    const match = matchNodeIndices()

    const tr = editor.state.tr.setMeta(backlinkViewPluginKey, {
      targetCardId: props.targetCardId,
      expanded: exp,
      visibleNodeIndices: visible,
      matchNodeIndices: match
    })
    editor.view.dispatch(tr)
  })

  onCleanup(() => {
    if (editor && !editor.isDestroyed) {
      editor.destroy()
    }
  })

  return (
    <div class="backlink-tiptap-wrapper">
      <div ref={editorElement!} class="w-full text-sm" />
    </div>
  )
}

export default BacklinkTiptapEditor
