import { createSignal, onMount, type Component } from "solid-js"
import { Pin } from "lucide-solid"

const TitleBar: Component = () => {
  const [isPinned, setIsPinned] = createSignal(false)

  onMount(() => {
    window.api.window.onPinChanged((pinned) => setIsPinned(pinned))
  })

  return (
    <div
      class="shrink-0 h-[34px] select-none flex items-center justify-center bg-titlebar relative"
      style={{ "-webkit-app-region": "drag" }}>
      <span class="text-[13px] font-medium text-muted-foreground">nv25</span>
      {isPinned() && (
        <Pin class="absolute right-2 w-3.5 h-3.5 text-muted-foreground" />
      )}
    </div>
  )
}

export default TitleBar
