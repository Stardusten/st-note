import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { settingsStore } from "../../settings/SettingsStore"

export const timestampHighlightPluginKey = new PluginKey("timestampHighlight")

function formatToRegex(fmt: string): RegExp {
  const tokens: [string, string][] = [
    ["yyyy", "\\d{4}"],
    ["yy", "\\d{2}"],
    ["MMMM", "[A-Za-z]+"],
    ["MMM", "[A-Za-z]{3}"],
    ["MM", "\\d{2}"],
    ["M", "\\d{1,2}"],
    ["dddd", "[A-Za-z]+"],
    ["ddd", "[A-Za-z]{3}"],
    ["dd", "\\d{2}"],
    ["d", "\\d{1,2}"],
    ["HH", "\\d{2}"],
    ["H", "\\d{1,2}"],
    ["hh", "\\d{2}"],
    ["h", "\\d{1,2}"],
    ["mm", "\\d{2}"],
    ["m", "\\d{1,2}"],
    ["ss", "\\d{2}"],
    ["s", "\\d{1,2}"],
    ["SSS", "\\d{3}"],
    ["SS", "\\d{2}"],
    ["S", "\\d{1}"],
    ["a", "[AaPp][Mm]"],
    ["EEEE", "[A-Za-z]+"],
    ["EEE", "[A-Za-z]{3}"],
    ["EE", "[A-Za-z]{2}"]
  ]

  const placeholders: Map<string, string> = new Map()
  let pattern = fmt

  for (let i = 0; i < tokens.length; i++) {
    const [token, replacement] = tokens[i]
    const placeholder = `\x00${i}\x00`
    placeholders.set(placeholder, replacement)
    pattern = pattern.split(token).join(placeholder)
  }

  pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

  for (const [placeholder, replacement] of placeholders) {
    pattern = pattern.split(placeholder).join(replacement)
  }

  return new RegExp(pattern, "g")
}

export function createTimestampHighlightPlugin(): Plugin {
  let cachedFormat = ""
  let cachedRegex: RegExp | null = null

  return new Plugin({
    key: timestampHighlightPluginKey,
    props: {
      decorations(state) {
        const fmt = settingsStore.getTimestampFormat()
        if (!fmt.trim()) return DecorationSet.empty

        if (fmt !== cachedFormat) {
          cachedFormat = fmt
          try {
            cachedRegex = formatToRegex(fmt)
          } catch {
            cachedRegex = null
          }
        }

        if (!cachedRegex) return DecorationSet.empty

        const decorations: Decoration[] = []
        const regex = new RegExp(cachedRegex.source, "g")

        state.doc.descendants((node, pos) => {
          if (node.isText && node.text) {
            let match: RegExpExecArray | null
            while ((match = regex.exec(node.text)) !== null) {
              decorations.push(
                Decoration.inline(pos + match.index, pos + match.index + match[0].length, {
                  class: "timestamp-highlight"
                })
              )
            }
          }
        })

        return DecorationSet.create(state.doc, decorations)
      }
    }
  })
}
