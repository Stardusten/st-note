import type { Component } from "solid-js"

const TitleBar: Component = () => (
  <div
    class="shrink-0 h-[34px] select-none flex items-center justify-center bg-titlebar"
    style={{ "-webkit-app-region": "drag" }}>
    <span class="text-[13px] font-medium text-muted-foreground">nv25</span>
  </div>
)

export default TitleBar
