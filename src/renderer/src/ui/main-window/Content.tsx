import { type Component, createSignal, Show, onMount, onCleanup } from "solid-js"
import LeftSidebar from "./LeftSidebar"
import CardMainEditor from "./CardEditor"
import { ChevronDown, Link } from "lucide-solid"
import { Button } from "../solidui/button"
import CardBacklinkEditor from "./CardBacklinkEditor"
import SearchPanel from "./SearchPanel"

const Content: Component = () => {
  const [showSearch, setShowSearch] = createSignal(false)

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    // Cmd+P or Ctrl+P to open search
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault()
      setShowSearch(true)
    }
    // Escape to close search
    if (e.key === 'Escape' && showSearch()) {
      e.preventDefault()
      setShowSearch(false)
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return (
    <div
      class="flex-1 w-full flex flex-row overflow-hidden"
      style={{
        background: "linear-gradient(rgb(21, 22, 25) 0%, rgb(37, 38, 42) 100%)"
      }}>
      <LeftSidebar />
      <div class="flex-1 w-full h-full flex flex-col p-4 items-center overflow-y-auto">
        <CardMainEditor />
        <div class="w-full flex flex-col">
          <div class="w-full h-[80px] text-[#d9d9d9] text-[14px] flex flex-row items-end pb-[13px] mb-[13px] border-b">
            <div class="flex w-full flex-row justify-between items-center">
              <div class="flex flex-row gap-3 items-center">
                <Link class="size-4 stroke-[1.5]" />
                <span>Backlinks</span>
                <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
              </div>
              <div>
                <Button variant="ghost" size="xs-icon">
                  <ChevronDown class="size-4 stroke-[1.5]" />
                </Button>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <CardBacklinkEditor />
            <CardBacklinkEditor />
            <CardBacklinkEditor />
          </div>

          <div class="w-full h-[80px] text-[#d9d9d9] text-[14px] flex flex-row items-end pb-[13px] mb-[13px] border-b">
            <div class="flex w-full flex-row justify-between items-center">
              <div class="flex flex-row gap-3 items-center">
                <Link class="size-4 stroke-[1.5]" />
                <span>Potential Links</span>
                <span class="text-xs bg-muted rounded-[4px] px-2 py-1">16</span>
              </div>
              <div>
                <Button variant="ghost" size="xs-icon">
                  <ChevronDown class="size-4 stroke-[1.5]" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Show when={showSearch()}>
        <SearchPanel onClose={() => setShowSearch(false)} />
      </Show>
    </div>
  )
}

export default Content
