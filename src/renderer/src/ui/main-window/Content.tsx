import { type Component, Show, onMount, onCleanup, createSignal, Match, Switch } from "solid-js"
import LeftSidebar, { type ViewMode } from "./LeftSidebar"
import AllCardsView from "./AllCardsView"
import SearchPanel from "./SearchPanel"
import SettingsPanel from "./SettingsPanel"
import { appStore } from "@renderer/lib/state/AppStore"
import CardEditView from "./CardEditView"

type ContentProps = {
  settingsOpen: boolean
  onSettingsOpenChange: (open: boolean) => void
}

const Content: Component<ContentProps> = (props) => {
  const [activeView, setActiveView] = createSignal<ViewMode>("editor")

  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
      e.preventDefault()
      appStore.openSearchPanel()
    }
    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault()
      props.onSettingsOpenChange(true)
    }
    if (e.key === 'Escape' && appStore.isSearchPanelOpen()) {
      e.preventDefault()
      appStore.closeSearchPanel()
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onCleanup(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  const handleSelectCard = (cardId: string) => {
    appStore.selectCard(cardId)
    setActiveView("editor")
  }

  return (
    <div
      class="flex-1 w-full flex flex-row overflow-hidden"
      >
      <LeftSidebar activeView={activeView()} onViewChange={setActiveView} />
      <div class="flex-1 w-full h-full flex flex-col items-center overflow-hidden">
        <Switch>
          <Match when={activeView() === "editor"}>
            <CardEditView />
          </Match>
          <Match when={activeView() === "all-cards"}>
            <AllCardsView onSelectCard={handleSelectCard} />
          </Match>
        </Switch>
      </div>

      <Show when={appStore.isSearchPanelOpen()}>
        <SearchPanel onClose={() => appStore.closeSearchPanel()} />
      </Show>

      <SettingsPanel open={props.settingsOpen} onOpenChange={props.onSettingsOpenChange} />
    </div>
  )
}

export default Content
