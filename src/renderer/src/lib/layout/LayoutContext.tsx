import { createContext, useContext, createSignal, onMount, onCleanup, ParentComponent, Accessor } from "solid-js"

export type LayoutMode = "normal" | "compact"

type LayoutContextValue = {
  mode: Accessor<LayoutMode>
  isCompact: Accessor<boolean>
  sidebarHovered: Accessor<boolean>
  setSidebarHovered: (hovered: boolean) => void
}

const COMPACT_THRESHOLD = 900

const LayoutContext = createContext<LayoutContextValue>()

export const LayoutProvider: ParentComponent = (props) => {
  const [mode, setMode] = createSignal<LayoutMode>("normal")
  const [sidebarHovered, setSidebarHovered] = createSignal(false)

  const updateMode = () => {
    const width = window.innerWidth
    setMode(width < COMPACT_THRESHOLD ? "compact" : "normal")
  }

  onMount(() => {
    updateMode()
    window.addEventListener("resize", updateMode)
  })

  onCleanup(() => {
    window.removeEventListener("resize", updateMode)
  })

  const value: LayoutContextValue = {
    mode,
    isCompact: () => mode() === "compact",
    sidebarHovered,
    setSidebarHovered
  }

  return (
    <LayoutContext.Provider value={value}>
      {props.children}
    </LayoutContext.Provider>
  )
}

export const useLayout = () => {
  const context = useContext(LayoutContext)
  if (!context) throw new Error("useLayout must be used within LayoutProvider")
  return context
}
