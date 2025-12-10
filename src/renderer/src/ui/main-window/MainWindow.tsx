import { Component, createEffect, createSignal, onMount } from "solid-js"
import TitleBar from "./TitleBar"
import Content from "./Content"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import type { SearchResultItem, CardContent } from "src/preload"

const MainWindow: Component = () => {
  const [settingsOpen, setSettingsOpen] = createSignal(false)

  onMount(async () => {
    await settingsStore.init()
    appStore.init()

    window.api.search.onQuery(({ query, responseChannel }) => {
      let results: SearchResultItem[]
      if (query.trim()) {
        appStore.performSearch(query)
        results = appStore.getSearchResults().map(card => ({
          id: card.id,
          title: appStore.getCardTitle(card.id)(),
          text: appStore.getCardText(card.id)()
        }))
      } else {
        const recent = appStore.getRecentCards()
        const cards = recent.length > 0 ? recent : appStore.getCards().slice(0, 10)
        results = cards.map(card => ({
          id: card.id,
          title: appStore.getCardTitle(card.id)(),
          text: appStore.getCardText(card.id)()
        }))
      }
      window.api.search.sendResult(responseChannel, results)
    })

    window.api.search.onGetAll(({ responseChannel }) => {
      console.log("[MainWindow] onGetAll received, channel:", responseChannel)
      const allCards = appStore.getCards()
        .slice()
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      console.log("[MainWindow] onGetAll cards count:", allCards.length)
      const results: SearchResultItem[] = allCards.map(card => ({
        id: card.id,
        title: appStore.getCardTitle(card.id)(),
        text: appStore.getCardText(card.id)()
      }))
      window.api.search.sendResult(responseChannel, results)
    })

    window.api.search.onSelectCard((cardId) => {
      appStore.selectCard(cardId)
    })

    window.api.search.onCreateCard(async ({ title, responseChannel }) => {
      const card = await appStore.createCard(title)
      window.api.search.sendCardCreated(responseChannel, card?.id || null)
    })

    window.api.search.onGetCardContent(({ cardId, responseChannel }) => {
      const card = appStore.getCard(cardId)
      let result: CardContent | null = null
      if (card) {
        result = { id: card.id, title: appStore.getCardTitle(cardId)(), content: card.data?.content }
      }
      window.api.search.sendCardContent(responseChannel, result)
    })

    window.api.search.onUpdateCardContent(({ cardId, content }) => {
      appStore.updateCardContent(cardId, content)
    })

    window.api.quick.onCapture(async ({ content, checked, responseChannel }) => {
      const card = await appStore.createCardWithoutSelect(undefined, content, checked)
      window.api.quick.sendCaptured(responseChannel, card?.id)
    })
  })

  createEffect(() => {
    const theme = settingsStore.getTheme()
    const resolvedTheme = theme === "system"
      ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : theme
    document.documentElement.setAttribute("data-kb-theme", resolvedTheme)
  })

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <TitleBar onOpenSettings={() => setSettingsOpen(true)} />
      <Content settingsOpen={settingsOpen()} onSettingsOpenChange={setSettingsOpen} />
    </div>
  )
}

export default MainWindow
