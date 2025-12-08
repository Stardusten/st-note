import { Plugin, PluginKey } from "prosemirror-state"
import { schema } from "../schema"

const URL_REGEX = /^(https?:\/\/[^\s]+)$/i

export function createAutoLinkPlugin(): Plugin {
  return new Plugin({
    key: new PluginKey("autoLink"),
    props: {
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain")?.trim()
        if (!text || !URL_REGEX.test(text)) return false

        const linkMark = schema.marks.link
        if (!linkMark) return false

        const { state, dispatch } = view
        const { from, to } = state.selection

        const mark = linkMark.create({ href: text })
        const textNode = schema.text(text, [mark])
        const tr = state.tr.replaceWith(from, to, textNode)
        dispatch(tr)

        const insertedFrom = from
        const insertedTo = from + text.length

        window.api.fetchPageTitle(text).then((title) => {
          if (!title) return
          const { state: currentState, dispatch: currentDispatch } = view
          const currentLinkMark = currentState.schema.marks.link
          if (!currentLinkMark) return

          const newMark = currentLinkMark.create({ href: text })
          const newTextNode = currentState.schema.text(title, [newMark])
          const updateTr = currentState.tr.replaceWith(insertedFrom, insertedTo, newTextNode)
          currentDispatch(updateTr)
        })

        return true
      }
    }
  })
}
