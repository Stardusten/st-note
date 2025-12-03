import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export type BacklinkViewOptions = {
  targetCardId: string | null
  expanded: boolean
  visibleNodeIndices: Set<number>
  matchNodeIndices: Set<number>
}

const backlinkViewPluginKey = new PluginKey<BacklinkViewOptions>("backlinkView")

export const BacklinkViewExtension = Extension.create<BacklinkViewOptions>({
  name: "backlinkView",

  addOptions() {
    return {
      targetCardId: null,
      expanded: false,
      visibleNodeIndices: new Set<number>(),
      matchNodeIndices: new Set<number>()
    }
  },

  addProseMirrorPlugins() {
    const extension = this

    return [
      new Plugin<BacklinkViewOptions>({
        key: backlinkViewPluginKey,
        state: {
          init() {
            return {
              targetCardId: extension.options.targetCardId,
              expanded: extension.options.expanded,
              visibleNodeIndices: extension.options.visibleNodeIndices,
              matchNodeIndices: extension.options.matchNodeIndices
            }
          },
          apply(tr, value) {
            const meta = tr.getMeta(backlinkViewPluginKey)
            if (meta) return meta
            return value
          }
        },
        props: {
          decorations(state) {
            const pluginState = backlinkViewPluginKey.getState(state)
            if (!pluginState) return DecorationSet.empty

            const { expanded, visibleNodeIndices, matchNodeIndices, targetCardId } = pluginState
            const decorations: Decoration[] = []

            if (expanded) return DecorationSet.empty

            let nodeIndex = 0
            let hiddenCount = 0
            let lastVisiblePos = 0

            state.doc.forEach((node, pos) => {
              const isVisible = visibleNodeIndices.has(nodeIndex)
              const isMatch = matchNodeIndices.has(nodeIndex)

              if (isVisible) {
                if (isMatch && targetCardId) {
                  node.descendants((child, childPos) => {
                    if (child.type.name === 'cardRef' && child.attrs.cardId === targetCardId) {
                      decorations.push(
                        Decoration.node(pos + 1 + childPos, pos + 1 + childPos + child.nodeSize, {
                          class: "backlink-highlight"
                        })
                      )
                    }
                  })
                }
                if (hiddenCount > 0) {
                  const count = hiddenCount
                  decorations.push(
                    Decoration.widget(lastVisiblePos, () => {
                      const el = document.createElement("div")
                      el.className = "backlink-collapsed-indicator"
                      el.textContent = `... ${count} hidden block${count > 1 ? 's' : ''}`
                      return el
                    }, { side: 1 })
                  )
                  hiddenCount = 0
                }
                lastVisiblePos = pos + node.nodeSize
              } else {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    class: "backlink-hidden"
                  })
                )
                hiddenCount++
              }

              nodeIndex++
            })

            if (hiddenCount > 0 && lastVisiblePos > 0) {
              const count = hiddenCount
              decorations.push(
                Decoration.widget(lastVisiblePos, () => {
                  const el = document.createElement("div")
                  el.className = "backlink-collapsed-indicator"
                  el.textContent = `... ${count} hidden block${count > 1 ? 's' : ''}`
                  return el
                }, { side: 1 })
              )
            }

            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})

export { backlinkViewPluginKey }
