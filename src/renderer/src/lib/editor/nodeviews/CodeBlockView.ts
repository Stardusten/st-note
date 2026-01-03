import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"

const LANGUAGES = [
  { group: "Common", items: ["javascript", "typescript", "python", "json"] },
  { group: "Systems", items: ["c", "cpp", "rust", "go", "java", "kotlin", "swift"] },
  { group: "Web", items: ["html", "css", "scss"] },
  { group: "Scripts", items: ["shell", "bash", "powershell", "ruby", "php"] },
  { group: "Data", items: ["sql", "yaml", "xml", "markdown"] },
  { group: "Other", items: ["csharp", "scala", "plaintext"] }
]

export class CodeBlockView implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  private trigger: HTMLElement
  private dropdown: HTMLElement | null = null

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

    this.trigger = document.createElement("button")
    this.trigger.className = "code-lang-trigger"
    this.trigger.textContent = node.attrs.language || "plaintext"
    this.trigger.addEventListener("click", (e) => {
      e.stopPropagation()
      this.toggleDropdown()
    })
    toolbar.appendChild(this.trigger)

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

  private toggleDropdown() {
    if (this.dropdown) {
      this.closeDropdown()
    } else {
      this.openDropdown()
    }
  }

  private openDropdown() {
    this.dropdown = document.createElement("div")
    this.dropdown.className = "code-lang-dropdown"

    for (const group of LANGUAGES) {
      const groupEl = document.createElement("div")
      groupEl.className = "code-lang-group"
      const label = document.createElement("div")
      label.className = "code-lang-group-label"
      label.textContent = group.group
      groupEl.appendChild(label)

      for (const lang of group.items) {
        const item = document.createElement("button")
        item.className = "code-lang-item"
        if (lang === this.node.attrs.language) item.classList.add("active")
        item.textContent = lang
        item.addEventListener("click", (e) => {
          e.stopPropagation()
          this.selectLanguage(lang)
        })
        groupEl.appendChild(item)
      }
      this.dropdown.appendChild(groupEl)
    }

    this.trigger.parentElement?.appendChild(this.dropdown)
    this.trigger.classList.add("open")

    setTimeout(() => {
      document.addEventListener("click", this.handleOutsideClick)
    }, 0)
  }

  private closeDropdown() {
    if (this.dropdown) {
      this.dropdown.remove()
      this.dropdown = null
      this.trigger.classList.remove("open")
      document.removeEventListener("click", this.handleOutsideClick)
    }
  }

  private handleOutsideClick = () => {
    this.closeDropdown()
  }

  private selectLanguage(lang: string) {
    const pos = this.getPos()
    if (pos === undefined) return
    this.view.dispatch(
      this.view.state.tr.setNodeMarkup(pos, undefined, { language: lang })
    )
    this.closeDropdown()
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node
    const lang = node.attrs.language || "plaintext"
    this.trigger.textContent = lang
    this.contentDOM.className = `language-${lang}`
    this.contentDOM.parentElement?.setAttribute("data-language", lang)
    return true
  }

  stopEvent(event: Event): boolean {
    return event.target === this.trigger ||
           this.dropdown?.contains(event.target as Node) === true
  }

  ignoreMutation(mutation: { type: string; target: Node }): boolean {
    return !this.contentDOM.contains(mutation.target)
  }

  destroy() {
    this.closeDropdown()
  }
}
