import { Component, onMount } from "solid-js"
import TitleBar from "./TitleBar"
import Content from "./Content"
import { appStore } from "@renderer/lib/state/AppStore"

const MainWindow: Component = () => {
  onMount(() => appStore.init())

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <TitleBar />
      <Content />
    </div>
  )
}

export default MainWindow
