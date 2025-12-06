import Heading, { type HeadingOptions } from "@tiptap/extension-heading"
import type { NodeViewRenderer, NodeViewRendererProps } from "@tiptap/core"
import type { NodeView, ViewMutationRecord } from "@tiptap/pm/view"
import { render } from "solid-js/web"
import { createMemo, type Accessor } from "solid-js"
import { Check } from "lucide-solid"

export type TitleOptions = Partial<HeadingOptions> & {
  getIsTask?: Accessor<boolean>
  getChecked?: Accessor<boolean>
  onCheckedChange?: (checked: boolean) => void
}

type TitleViewProps = {
  getOptions: () => TitleOptions
}

const TitleView = (props: TitleViewProps) => {
  const isTask = createMemo(() => props.getOptions().getIsTask?.() ?? false)
  const checked = createMemo(() => props.getOptions().getChecked?.() ?? false)

  const handleCheckboxClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    props.getOptions().onCheckedChange?.(!checked())
  }

  return (
    <>
      <span
        class="inline-flex items-center justify-center pr-[0.5em] text-transparent"
        contentEditable={false}
        style={{ display: isTask() ? "inline-flex" : "none" }}>
        <div
          class="title-checkbox border rounded-full shadow-[0_1px_0_0_rgba(26,27,31,1)] \
          cursor-pointer relative transition-all inline-flex items-center justify-center \
          size-[1.1em] border-[1px] border-[#d9d9d9] \
          bg-[radial-gradient(\
            39.58%_39.58%_at_16.79%_14.58%,\
            rgba(255,255,255,0.23)_0%,\
            rgba(255,255,255,0)_100%),\
            rgba(255,255,255,0.05)\
          ]"
          onClick={handleCheckboxClick}>
          <Check
            class="absolute z-1 text-[#fff] transition-opacity size-[0.7em] opacity-0 data-checked:opacity-100 hover:opacity-50"
            data-checked={checked() || undefined}
          />
          {/* 一个占位文字，保证这个 span 高度和右边的标题一直 */}a
        </div>
      </span>
      <span class="title-content" classList={{ "has-checkbox": isTask() }}></span>
    </>
  )
}

class TitleNodeViewAdapter implements NodeView {
  dom: HTMLHeadingElement
  contentDOM: HTMLElement
  dispose: () => void

  constructor(_props: NodeViewRendererProps, getOptions: () => TitleOptions) {
    const container = document.createElement("div")

    this.dispose = render(() => <TitleView getOptions={getOptions} />, container)

    this.dom = document.createElement("h1")
    this.dom.className = "editor-title"
    while (container.firstChild) {
      this.dom.appendChild(container.firstChild)
    }

    this.contentDOM = this.dom.querySelector(".title-content")!
  }

  destroy() {
    this.dispose()
    this.dom.remove()
  }

  stopEvent(e: Event) {
    if (e.target instanceof HTMLElement && e.target.closest(".title-checkbox-wrapper")) return true
    return false
  }

  ignoreMutation(event: ViewMutationRecord) {
    if (event.target instanceof HTMLElement && event.target.closest(".title-checkbox-wrapper"))
      return true
    return false
  }
}

export const createTitleNodeViewRenderer = (getOptions: () => TitleOptions): NodeViewRenderer => {
  return (props) => new TitleNodeViewAdapter(props, getOptions)
}

export const Title = Heading.extend<TitleOptions>({
  name: "title",
  group: "title",

  addOptions() {
    return {
      ...this.parent?.(),
      levels: [1] as const,
      getIsTask: undefined,
      getChecked: undefined,
      onCheckedChange: undefined
    }
  },

  parseHTML() {
    return [{ tag: "h1:first-child" }]
  },

  addNodeView() {
    return createTitleNodeViewRenderer(() => this.options)
  }
})
