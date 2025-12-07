import { Editor, NodeViewRendererProps } from "@tiptap/core"
import { Node } from "@tiptap/pm/model"
import type { NodeView, ViewMutationRecord } from "@tiptap/pm/view"
import { createSignal, createEffect, For } from "solid-js"
import { render } from "solid-js/web"
import { supportedLanguages, languageAliases } from "./CodeBlockLowlight"

type CodeBlockViewProps = {
  editor: Editor
  node: Node
  getPos: () => number | undefined
}

const CodeBlockViewUI = (props: CodeBlockViewProps) => {
  const normalizeLanguage = (lang: string) => {
    if (!lang) return "plaintext"
    const alias = languageAliases[lang]
    if (alias) return alias
    if (supportedLanguages.some((l) => l.value === lang)) return lang
    return "plaintext"
  }

  const [lang, setLang] = createSignal<string>(normalizeLanguage(props.node.attrs.language))

  createEffect(() => {
    setLang(normalizeLanguage(props.node.attrs.language))
  })

  const handleLangChange = (e: Event) => {
    const target = e.target as HTMLSelectElement
    const newLang = target.value
    const pos = props.getPos()
    if (pos === undefined) return

    const { tr } = props.editor.state
    tr.setNodeMarkup(pos, undefined, { ...props.node.attrs, language: newLang })
    props.editor.view.dispatch(tr)
    setLang(newLang)
  }

  return (
    <div class="code-block-wrapper relative" data-indent={props.node.attrs.indent || undefined}>
      <select
        class="code-block-language-select"
        value={lang()}
        onChange={handleLangChange}
        contentEditable={false}
      >
        <For each={supportedLanguages}>
          {(language) => <option value={language.value}>{language.label}</option>}
        </For>
      </select>
      <pre class="overflow-x-auto" spellcheck={false}>
        <code class="codeblock-content hljs"></code>
      </pre>
    </div>
  )
}

class CodeBlockNodeViewAdapter implements NodeView {
  dom: HTMLElement
  contentDOM: HTMLElement
  dispose: () => void

  constructor(props: NodeViewRendererProps) {
    const container = document.createElement("div")
    // Use a wrapper div for the NodeView container
    container.classList.add("node-view-container") 
    
    this.dispose = render(
      () => (
        <CodeBlockViewUI
          editor={props.editor}
          node={props.node}
          getPos={props.getPos}
        />
      ),
      container
    )

    this.dom = container.firstElementChild as HTMLElement
    this.contentDOM = container.querySelector(".codeblock-content")!
  }

  destroy() {
    this.dispose()
  }

  stopEvent(e: Event) {
    if (e.target instanceof HTMLSelectElement) return true
    return false
  }

  ignoreMutation(mutation: ViewMutationRecord) {
    if (mutation.type === "selection") return true
    if (mutation.target instanceof HTMLElement && !mutation.target.classList.contains("codeblock-content"))
      return true
    return false
  }
}

export const codeBlockNodeViewRenderer = (props: NodeViewRendererProps) =>
  new CodeBlockNodeViewAdapter(props)
