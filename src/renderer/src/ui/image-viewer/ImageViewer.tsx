import { Component, createSignal, onMount, Show, createEffect } from "solid-js"

const TITLE_BAR_HEIGHT = 34
const MIN_WIDTH = 400

const ImageViewer: Component = () => {
  const [imageUrl, setImageUrl] = createSignal("")
  const [scale, setScale] = createSignal(1)
  const [position, setPosition] = createSignal({ x: 0, y: 0 })
  const [rotation, setRotation] = createSignal(0)
  const [isDragging, setIsDragging] = createSignal(false)
  const [dragStart, setDragStart] = createSignal({ x: 0, y: 0 })
  const [currentIndex, setCurrentIndex] = createSignal(0)
  const [imageIds, setImageIds] = createSignal<string[]>([])
  const [dbPath, setDbPath] = createSignal("")
  const [currentFile, setCurrentFile] = createSignal<{ data: Uint8Array; mimeType: string; filename: string | null } | null>(null)
  const [naturalSize, setNaturalSize] = createSignal({ width: 0, height: 0 })
  const [isFirstLoad, setIsFirstLoad] = createSignal(true)

  onMount(() => {
    const params = new URLSearchParams(window.location.search)
    const ids = JSON.parse(params.get("imageIds") || "[]") as string[]
    const idx = parseInt(params.get("currentIndex") || "0", 10)
    const path = params.get("dbPath") || ""
    setImageIds(ids)
    setCurrentIndex(idx)
    setDbPath(path)
  })

  createEffect(() => {
    const ids = imageIds()
    const idx = currentIndex()
    const path = dbPath()
    if (ids.length > 0 && path) loadImage(ids[idx], path)
  })

  const loadImage = async (fileId: string, path: string) => {
    const file = await window.api.file.fetch(path, fileId)
    if (file) {
      setCurrentFile({ data: file.data, mimeType: file.mimeType, filename: file.filename })
      const blob = new Blob([new Uint8Array(file.data)], { type: file.mimeType })
      const url = URL.createObjectURL(blob)
      if (imageUrl()) URL.revokeObjectURL(imageUrl())
      setImageUrl(url)
      resetView()
    }
  }

  const onImageLoad = (e: Event) => {
    const img = e.target as HTMLImageElement
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight })

    if (isFirstLoad()) {
      setIsFirstLoad(false)
      const maxW = window.screen.availWidth * 0.8
      const maxH = window.screen.availHeight * 0.8 - TITLE_BAR_HEIGHT
      let w = img.naturalWidth
      let h = img.naturalHeight
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }
      window.api.image.resizeAndShow(Math.max(MIN_WIDTH, w), Math.max(200, h + TITLE_BAR_HEIGHT))
    }
  }

  const resetView = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }

  const handleWheel = (e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((s) => Math.min(Math.max(s * delta, 0.1), 10))
  }

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - position().x, y: e.clientY - position().y })
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging()) return
    setPosition({ x: e.clientX - dragStart().x, y: e.clientY - dragStart().y })
  }

  const handleMouseUp = () => setIsDragging(false)

  const goPrev = () => {
    if (currentIndex() > 0) setCurrentIndex((i) => i - 1)
  }

  const goNext = () => {
    if (currentIndex() < imageIds().length - 1) setCurrentIndex((i) => i + 1)
  }

  const zoomIn = () => setScale((s) => Math.min(s * 1.25, 10))
  const zoomOut = () => setScale((s) => Math.max(s / 1.25, 0.1))
  const resetScale = () => setScale(1)
  const rotateClockwise = () => setRotation((r) => (r + 90) % 360)

  const download = async () => {
    const file = currentFile()
    if (file) await window.api.image.saveFile(file.data, file.mimeType)
  }

  const title = () => currentFile()?.filename || "Image"

  return (
    <div class="h-screen w-full flex flex-col bg-black/95 select-none overflow-hidden">
      <div
        class="shrink-0 h-[34px] flex items-center justify-center bg-black/80"
        style={{ "-webkit-app-region": "drag" }}
      >
        <span class="text-[13px] font-medium text-white/70 truncate px-16 max-w-full">{title()}</span>
      </div>

      <div
        class="flex-1 relative"
        style={{ cursor: isDragging() ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDblClick={resetView}
      >
        <div
          class="w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${position().x}px, ${position().y}px) scale(${scale()}) rotate(${rotation()}deg)`,
            "transform-origin": "center center"
          }}
        >
          <Show when={imageUrl()}>
            <img
              src={imageUrl()}
              class="max-w-none"
              draggable={false}
              style={{ "pointer-events": "none" }}
              onLoad={onImageLoad}
            />
          </Show>
        </div>

        <div class="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-2 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm opacity-60 hover:opacity-100 transition-opacity">
          <button
            class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={goPrev}
            disabled={currentIndex() === 0}
            title="上一张"
          >
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span class="text-white/70 text-xs tabular-nums w-12 text-center">
            {currentIndex() + 1}/{imageIds().length}
          </span>

          <button
            class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            onClick={goNext}
            disabled={currentIndex() === imageIds().length - 1}
            title="下一张"
          >
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div class="w-px h-4 bg-white/20 mx-1" />

          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10" onClick={zoomOut} title="缩小">
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
            </svg>
          </button>

          <button
            class="text-white/70 text-xs tabular-nums w-10 text-center hover:text-white/90"
            onClick={resetScale}
            title="重置缩放"
          >
            {Math.round(scale() * 100)}%
          </button>

          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10" onClick={zoomIn} title="放大">
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
            </svg>
          </button>

          <div class="w-px h-4 bg-white/20 mx-1" />

          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10" onClick={rotateClockwise} title="顺时针旋转">
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <button class="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10" onClick={download} title="下载">
            <svg class="w-4 h-4 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          <div class="w-px h-4 bg-white/20 mx-1" />

          <span class="text-white/50 text-xs tabular-nums px-1">
            {naturalSize().width}×{naturalSize().height}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ImageViewer
