import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"

const LANGUAGES = [
  "javascript", "typescript", "python", "java", "c", "cpp", "csharp",
  "go", "rust", "ruby", "php", "swift", "kotlin", "scala",
  "html", "css", "scss", "json", "yaml", "xml", "markdown",
  "sql", "shell", "bash", "powershell",
  "plaintext"
]

export class CodeBlockView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private selectEl: HTMLSelectElement

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: () => number | undefined
  ) {
    this.dom = document.createElement("div")
    this.dom.className = "code-block-wrapper"

    const toolbar = document.createElement("div")
    toolbar.className = "code-block-toolbar"
    toolbar.contentEditable = "false"

    this.selectEl = document.createElement("select")
    this.selectEl.className = "code-block-language-select"
    for (const lang of LANGUAGES) {
      const option = document.createElement("option")
      option.value = lang
      option.textContent = lang
      if (lang === node.attrs.language) option.selected = true
      this.selectEl.appendChild(option)
    }
    this.selectEl.addEventListener("change", () => this.updateLanguage())
    toolbar.appendChild(this.selectEl)

    const pre = document.createElement("pre")
    pre.className = "code-block"
    pre.setAttribute("data-language", node.attrs.language)

    const code = document.createElement("code")
    code.className = `language-${node.attrs.language}`
    pre.appendChild(code)

    this.contentDOM = code

    this.dom.appendChild(toolbar)
    this.dom.appendChild(pre)
  }

  private updateLanguage() {
    const pos = this.getPos()
    if (pos === undefined) return
    const lang = this.selectEl.value
    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(pos, undefined, { language: lang })
    )
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    if (node.attrs.language !== this.selectEl.value) {
      this.selectEl.value = node.attrs.language
      this.contentDOM.className = `language-${node.attrs.language}`
      this.contentDOM.parentElement?.setAttribute("data-language", node.attrs.language)
    }
    return true
  }

  stopEvent(event: Event): boolean {
    return event.target === this.selectEl
  }

  ignoreMutation(mutation: { type: string; target: Node }): boolean {
    return !this.contentDOM.contains(mutation.target)
  }
}
