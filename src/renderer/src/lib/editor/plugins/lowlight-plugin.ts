import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { Node as ProseMirrorNode } from "prosemirror-model"

type HighlightNode = {
  type: string
  value?: string
  children?: HighlightNode[]
  properties?: { className?: string[] }
}

function parseNodes(nodes: HighlightNode[], className: string[] = []): { text: string; classes: string[] }[] {
  return nodes.flatMap(node => {
    const classes = [...className, ...(node.properties?.className || [])]
    if (node.children) return parseNodes(node.children, classes)
    return { text: node.value || "", classes }
  })
}

function findCodeBlocks(doc: ProseMirrorNode, name: string): { pos: number; node: ProseMirrorNode }[] {
  const result: { pos: number; node: ProseMirrorNode }[] = []
  doc.descendants((node, pos) => {
    if (node.type.name === name) {
      result.push({ pos, node })
      return false
    }
    return true
  })
  return result
}

function getDecorations(
  doc: ProseMirrorNode,
  name: string,
  lowlight: any,
  defaultLanguage: string
): DecorationSet {
  const decorations: Decoration[] = []

  findCodeBlocks(doc, name).forEach(block => {
    let from = block.pos + 1
    const language = block.node.attrs.language || defaultLanguage
    const text = block.node.textContent

    if (!text) return

    let nodes: HighlightNode[]
    try {
      const languages = lowlight.listLanguages()
      if (language && languages.includes(language)) {
        nodes = lowlight.highlight(language, text).children || []
      } else {
        nodes = lowlight.highlightAuto(text).children || []
      }
    } catch {
      return
    }

    parseNodes(nodes).forEach(node => {
      const to = from + node.text.length
      if (node.classes.length) {
        decorations.push(Decoration.inline(from, to, { class: node.classes.join(" ") }))
      }
      from = to
    })
  })

  return DecorationSet.create(doc, decorations)
}

export function createLowlightPlugin(
  name: string,
  lowlight: any,
  defaultLanguage: string = "plaintext"
): Plugin {
  const pluginKey = new PluginKey("lowlight")

  return new Plugin({
    key: pluginKey,
    state: {
      init: (_, { doc }) => getDecorations(doc, name, lowlight, defaultLanguage),
      apply: (tr, decorationSet, oldState, newState) => {
        const oldNodeName = oldState.selection.$head.parent.type.name
        const newNodeName = newState.selection.$head.parent.type.name
        const oldBlocks = findCodeBlocks(oldState.doc, name)
        const newBlocks = findCodeBlocks(newState.doc, name)

        if (
          tr.docChanged &&
          ([oldNodeName, newNodeName].includes(name) ||
            newBlocks.length !== oldBlocks.length ||
            tr.steps.some(step => {
              const s = step as any
              return s.from !== undefined && s.to !== undefined &&
                oldBlocks.some(block => block.pos >= s.from && block.pos + block.node.nodeSize <= s.to)
            }))
        ) {
          return getDecorations(tr.doc, name, lowlight, defaultLanguage)
        }

        return decorationSet.map(tr.mapping, tr.doc)
      }
    },
    props: {
      decorations(state) {
        return pluginKey.getState(state)
      }
    }
  })
}
