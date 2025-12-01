import { type Component, onMount } from "solid-js"
import MainWindow from "./ui/main-window/MainWindow"
import { appStore } from "./lib/state/AppStore"

const App: Component = () => {
  onMount(async () => {
    await appStore.init()
  })

  return <MainWindow />
}

export default App
