import { Component, onMount, createEffect } from "solid-js"
import TitleBar from "./TitleBar"
import Content from "./Content"
import { appStore } from "@renderer/lib/state/AppStore"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import type { SearchResultItem } from "src/preload"

const MainWindow: Component = () => {
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

    window.api.search.onGetRecent(({ responseChannel }) => {
      const recent = appStore.getRecentCards()
      let results: SearchResultItem[]
      if (recent.length > 0) {
        results = recent.map(card => ({
          id: card.id,
          title: appStore.getCardTitle(card.id)(),
          text: appStore.getCardText(card.id)()
        }))
      } else {
        results = appStore.getCards().slice(0, 10).map(card => ({
          id: card.id,
          title: appStore.getCardTitle(card.id)(),
          text: appStore.getCardText(card.id)()
        }))
      }
      window.api.search.sendResult(responseChannel, results)
    })

    window.api.search.onSelectCard((cardId) => {
      appStore.selectCard(cardId)
    })

    window.api.search.onCreateCard(async ({ title, responseChannel }) => {
      const card = await appStore.createCard(title)
      window.api.search.sendCardCreated(responseChannel, card?.id || null)
    })

    window.api.quick.onCapture(async ({ content, checked, responseChannel }) => {
      await appStore.createCardWithoutSelect(undefined, content, checked)
      window.api.quick.sendCaptured(responseChannel)
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
      <TitleBar />
      <Content />
    </div>
  )
}

export default MainWindow
