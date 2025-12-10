import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { findHighlightRanges } from "@renderer/lib/common/utils/highlight"

export const searchHighlightPluginKey = new PluginKey<{ query: string }>("searchHighlight")

export function createSearchHighlightPlugin(): Plugin {
  return new Plugin({
    key: searchHighlightPluginKey,
    state: {
      init: () => ({ query: "" }),
      apply: (tr, prev) => {
        const meta = tr.getMeta(searchHighlightPluginKey)
        if (meta?.query !== undefined) return { query: meta.query }
        return prev
      }
    },
    props: {
      decorations(state) {
        const pluginState = searchHighlightPluginKey.getState(state)
        const query = pluginState?.query || ""
        if (!query.trim()) return DecorationSet.empty

        const decorations: Decoration[] = []

        state.doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            const ranges = findHighlightRanges(node.text, query)
            for (const [start, end] of ranges) {
              decorations.push(
                Decoration.inline(pos + start, pos + end, { class: "search-highlight" })
              )
            }
          }
        })

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
