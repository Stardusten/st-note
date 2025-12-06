import type { AppStoreInterface, CardSuggestion, CaptureNoteOptions } from "./AppStoreInterface"

class AppStoreIpc implements AppStoreInterface {
  async searchCards(query: string): Promise<CardSuggestion[]> {
    const results = await window.api.search.query(query)
    return results.map((r) => ({ id: r.id, title: r.title }))
  }

  async createCard(title?: string, _content?: any): Promise<CardSuggestion | null> {
    const cardId = await window.api.search.createCard(title || "")
    if (!cardId) return null
    return { id: cardId, title: title || "" }
  }

  async captureNote(options: CaptureNoteOptions): Promise<void> {
    await window.api.quick.capture(options)
  }
}

export const appStoreIpc = new AppStoreIpc()
