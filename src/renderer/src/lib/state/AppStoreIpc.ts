import type { CardContent, SearchResultItem } from "src/preload"

export type CardSuggestion = {
  id: string
  title: string
}

export const appStoreIpc = {
  // 搜索
  query: (q: string): Promise<SearchResultItem[]> => window.api.search.query(q),
  getAll: (): Promise<SearchResultItem[]> => window.api.search.getAll(),

  // 卡片操作
  getCardContent: (cardId: string): Promise<CardContent | null> => window.api.search.getCardContent(cardId),
  updateCardContent: (cardId: string, content: any): Promise<void> => window.api.search.updateCardContent(cardId, content),
  createCard: async (title: string): Promise<CardSuggestion | null> => {
    const cardId = await window.api.search.createCard(title)
    return cardId ? { id: cardId, title } : null
  },
  selectCard: (cardId: string): Promise<void> => window.api.search.selectCard(cardId),

  // 快速捕获
  capture: (opts: { content: any; checked?: boolean }): Promise<void> => window.api.quick.capture(opts),

  // 窗口操作
  hideSearchWindow: () => window.api.hideSearchWindow(),
  hideQuickWindow: () => window.api.hideQuickWindow(),

  // Capture Success
  captureSuccess: {
    close: () => window.api.captureSuccess.close(),
    openLastCaptured: () => window.api.captureSuccess.openLastCaptured(),
    onShow: (callback: () => void) => window.api.captureSuccess.onShow(callback),
    onHide: (callback: () => void) => window.api.captureSuccess.onHide(callback)
  }
}
