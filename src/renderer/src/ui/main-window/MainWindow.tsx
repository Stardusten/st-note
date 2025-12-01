import { Component } from "solid-js"
import TitleBar from "./TitleBar"
import Content from "./Content"

const MainWindow: Component = () => {
  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <TitleBar />
      <Content />
    </div>
  )
}

export default MainWindow
