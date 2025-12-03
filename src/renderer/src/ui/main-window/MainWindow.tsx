import { Component, onMount } from "solid-js"
import TitleBar from "./TitleBar"
import Content from "./Content"
import { appStore } from "@renderer/lib/state/AppStore"
import { getCardTitle } from "@renderer/lib/common/types/card"
import type { SearchResultItem } from "src/preload"

const MainWindow: Component = () => {
  onMount(() => {
    appStore.init()

    window.api.search.onQuery(({ query, responseChannel }) => {
      appStore.performSearch(query)
      const results: SearchResultItem[] = appStore.getSearchResults().map(card => ({
        id: card.id,
        title: getCardTitle(card),
        text: card.text || ""
      }))
      window.api.search.sendResult(responseChannel, results)
    })

    window.api.search.onGetRecent(({ responseChannel }) => {
      const recent = appStore.getRecentCards()
      let results: SearchResultItem[]
      if (recent.length > 0) {
        results = recent.map(card => ({
          id: card.id,
          title: getCardTitle(card),
          text: card.text || ""
        }))
      } else {
        results = appStore.getCards().slice(0, 10).map(card => ({
          id: card.id,
          title: getCardTitle(card),
          text: card.text || ""
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
  })

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden">
      <TitleBar />
      <Content />
    </div>
  )
}

export default MainWindow
