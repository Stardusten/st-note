import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"

export type ImageViewOptions = {
  getDbPath: () => string
}

export class ImageView implements NodeView {
  dom: HTMLElement
  private img: HTMLImageElement
  private resizeHandle: HTMLElement
  private currentFileId: string | null = null
  private isResizing = false

  constructor(
    private node: PMNode,
    private view: EditorView,
    private getPos: () => number | undefined,
    private options: ImageViewOptions
  ) {
    this.dom = document.createElement("div")
    this.dom.className = "editor-image-wrapper"

    this.img = document.createElement("img")
    this.img.className = "editor-image"
    this.img.draggable = false
    if (node.attrs.alt) this.img.alt = node.attrs.alt
    if (node.attrs.width) this.img.style.width = `${node.attrs.width}px`

    this.resizeHandle = document.createElement("div")
    this.resizeHandle.className = "editor-image-resize-handle"
    this.resizeHandle.contentEditable = "false"

    this.dom.appendChild(this.img)
    this.dom.appendChild(this.resizeHandle)
    this.loadImage(node.attrs.fileId)

    this.resizeHandle.addEventListener("mousedown", this.onResizeStart)
    this.img.addEventListener("dblclick", this.onDoubleClick)
  }

  private onDoubleClick = () => {
    const fileId = this.node.attrs.fileId
    if (!fileId) return
    const dbPath = this.options.getDbPath()
    const imageIds = this.collectImageIds()
    const currentIndex = imageIds.indexOf(fileId)
    window.api.image.openViewer({ dbPath, imageIds, currentIndex })
  }

  private collectImageIds(): string[] {
    const ids: string[] = []
    this.view.state.doc.descendants((node) => {
      if (node.type.name === "image" && node.attrs.fileId) ids.push(node.attrs.fileId)
    })
    return ids
  }

  private onResizeStart = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    this.isResizing = true
    const startX = e.clientX
    const startWidth = this.img.offsetWidth

    const onMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      const newWidth = Math.max(50, startWidth + delta)
      this.img.style.width = `${newWidth}px`
    }

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove)
      document.removeEventListener("mouseup", onMouseUp)
      this.isResizing = false

      const pos = this.getPos()
      if (pos === undefined) return

      const newWidth = this.img.offsetWidth
      const tr = this.view.state.tr.setNodeMarkup(pos, undefined, {
        ...this.node.attrs,
        width: newWidth
      })
      this.view.dispatch(tr)
    }

    document.addEventListener("mousemove", onMouseMove)
    document.addEventListener("mouseup", onMouseUp)
  }

  private async loadImage(fileId: string | null) {
    if (!fileId) return
    if (this.currentFileId === fileId && this.img.src) return

    this.currentFileId = fileId
    const dbPath = this.options.getDbPath()
    const file = await window.api.file.fetch(dbPath, fileId)
    if (file && this.currentFileId === fileId) {
      const blob = new Blob([new Uint8Array(file.data)], { type: file.mimeType })
      if (this.img.src.startsWith("blob:")) URL.revokeObjectURL(this.img.src)
      this.img.src = URL.createObjectURL(blob)
    }
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node

    if (node.attrs.alt) this.img.alt = node.attrs.alt
    else this.img.removeAttribute("alt")

    if (node.attrs.width) this.img.style.width = `${node.attrs.width}px`
    else this.img.style.width = ""

    if (node.attrs.fileId !== this.currentFileId) this.loadImage(node.attrs.fileId)

    return true
  }

  ignoreMutation(): boolean {
    return true
  }

  stopEvent(e: Event): boolean {
    if (this.isResizing) return true
    if (e.target === this.resizeHandle) return true
    return false
  }

  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode")
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode")
  }

  destroy() {
    this.resizeHandle.removeEventListener("mousedown", this.onResizeStart)
    this.img.removeEventListener("dblclick", this.onDoubleClick)
    if (this.img.src.startsWith("blob:")) URL.revokeObjectURL(this.img.src)
  }
}
