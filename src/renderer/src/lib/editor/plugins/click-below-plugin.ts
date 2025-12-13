import { Plugin } from "prosemirror-state"
import { Selection } from "prosemirror-state"

export function createClickBelowPlugin(): Plugin {
  return new Plugin({
    props: {
      handleDOMEvents: {
        mousedown: (view, event) => {
          const coords = { left: event.clientX, top: event.clientY }
          const pos = view.posAtCoords(coords)
          if (!pos) {
            const end = view.state.doc.content.size
            const tr = view.state.tr.setSelection(
              Selection.near(view.state.doc.resolve(end), -1)
            )
            view.dispatch(tr)
            view.focus()
            return true
          }
          return false
        }
      }
    }
  })
}
