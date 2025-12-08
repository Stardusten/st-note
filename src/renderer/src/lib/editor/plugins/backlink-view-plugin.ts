import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { schema } from "../schema"

export type BacklinkViewState = {
  targetCardId: string | null
}

export type BacklinkViewOptions = {
  targetCardId?: string | null
}

export const backlinkViewPluginKey = new PluginKey<BacklinkViewState>("backlinkView")

export function createBacklinkViewPlugin(options: BacklinkViewOptions = {}): Plugin {
  return new Plugin<BacklinkViewState>({
    key: backlinkViewPluginKey,
    state: {
      init() {
        return {
          targetCardId: options.targetCardId ?? null
        }
      },
      apply(tr, value) {
        const meta = tr.getMeta(backlinkViewPluginKey)
        if (meta) return { ...value, ...meta }
        return value
      }
    },
    props: {
      decorations(state) {
        const pluginState = backlinkViewPluginKey.getState(state)
        if (!pluginState || !pluginState.targetCardId) return DecorationSet.empty

        const { targetCardId } = pluginState
        const decorations: Decoration[] = []

        state.doc.descendants((node, pos) => {
          if (node.type === schema.nodes.cardRef && node.attrs.cardId === targetCardId) {
            decorations.push(
              Decoration.node(pos, pos + node.nodeSize, {
                class: "backlink-highlight"
              })
            )
          }
        })

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
