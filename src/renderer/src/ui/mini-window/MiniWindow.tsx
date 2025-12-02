import { Match, onMount } from "solid-js"

import { Component, createSignal, Switch } from "solid-js"
import TitleBar from "./TitleBar"
import SearchView from "./SearchView"
import TasksView from "./TasksView"
import { appStore } from "@renderer/lib/state/AppStore"

const MiniWindow: Component = () => {
  onMount(async () => {
    await appStore.init()
  })
  const [activeTab, setActiveTab] = createSignal<"search" | "tasks" | "timeline">("search")

  return (
    <>
      <TitleBar activeTab={activeTab()} setActiveTab={setActiveTab} />
      <Switch fallback={<div>Not found</div>}>
        <Match when={activeTab() === "search"}>
          <SearchView />
        </Match>
        <Match when={activeTab() === "tasks"}>
          <TasksView />
        </Match>
      </Switch>
    </>
  )
}

export default MiniWindow
