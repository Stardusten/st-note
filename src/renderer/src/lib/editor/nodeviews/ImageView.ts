import { Node as PMNode } from "prosemirror-model"
import { EditorView, NodeView } from "prosemirror-view"

export type ImageViewOptions = {
  getDbPath: () => string
}

/** Cached image data including blob URL and natural dimensions */
interface ImageCacheEntry {
  blobUrl: string
  naturalWidth: number
  naturalHeight: number
}

/** Global image cache to avoid reloading images on NodeView rebuild */
const imageCache = new Map<string, ImageCacheEntry>()

/** Clear all cached images and revoke blob URLs */
export function clearImageCache(): void {
  for (const entry of imageCache.values()) {
    URL.revokeObjectURL(entry.blobUrl)
  }
  imageCache.clear()
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

    this.resizeHandle = document.createElement("div")
    this.resizeHandle.className = "editor-image-resize-handle"
    this.resizeHandle.contentEditable = "false"

    this.dom.appendChild(this.img)
    this.dom.appendChild(this.resizeHandle)

    // Try to load from cache first for instant display
    const fileId = node.attrs.fileId
    const cached = fileId ? imageCache.get(fileId) : null

    if (cached) {
      // Use cached blob URL and set dimensions immediately
      this.currentFileId = fileId
      this.img.src = cached.blobUrl
      this.applyDimensions(node.attrs.width, cached)
    } else {
      // Set placeholder dimensions if we have width info
      if (node.attrs.width) {
        this.img.style.width = `${node.attrs.width}px`
      }
      this.loadImage(fileId)
    }

    this.resizeHandle.addEventListener("mousedown", this.onResizeStart)
    this.img.addEventListener("dblclick", this.onDoubleClick)
  }

  /** Apply width and calculate height based on aspect ratio */
  private applyDimensions(userWidth: number | null, cached: ImageCacheEntry): void {
    if (userWidth) {
      this.img.style.width = `${userWidth}px`
      // Calculate height based on aspect ratio to prevent layout shift
      const ratio = cached.naturalHeight / cached.naturalWidth
      this.dom.style.minHeight = `${userWidth * ratio}px`
    } else {
      this.img.style.width = ""
      this.dom.style.minHeight = ""
    }
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

    // Check cache first
    const cached = imageCache.get(fileId)
    if (cached) {
      this.currentFileId = fileId
      this.img.src = cached.blobUrl
      this.applyDimensions(this.node.attrs.width, cached)
      return
    }

    this.currentFileId = fileId
    const dbPath = this.options.getDbPath()
    const file = await window.api.file.fetch(dbPath, fileId)
    if (file && this.currentFileId === fileId) {
      const blob = new Blob([new Uint8Array(file.data)], { type: file.mimeType })
      const blobUrl = URL.createObjectURL(blob)
      this.img.src = blobUrl

      // Cache the image with dimensions once loaded
      this.img.onload = () => {
        const entry: ImageCacheEntry = {
          blobUrl,
          naturalWidth: this.img.naturalWidth,
          naturalHeight: this.img.naturalHeight
        }
        imageCache.set(fileId, entry)
        // Clear placeholder min-height after image loads
        this.dom.style.minHeight = ""
      }
    }
  }

  update(node: PMNode): boolean {
    if (node.type !== this.node.type) return false
    this.node = node

    if (node.attrs.alt) this.img.alt = node.attrs.alt
    else this.img.removeAttribute("alt")

    // Apply dimensions using cache if available
    const cached = node.attrs.fileId ? imageCache.get(node.attrs.fileId) : null
    if (cached) {
      this.applyDimensions(node.attrs.width, cached)
    } else if (node.attrs.width) {
      this.img.style.width = `${node.attrs.width}px`
    } else {
      this.img.style.width = ""
    }

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
    this.img.onload = null
    // Don't revoke blob URL here - it's managed by the cache
  }
}
