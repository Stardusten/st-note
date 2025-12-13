import { createSignal, type Accessor, type Setter } from "solid-js"
import { ObjCache, type ObjCacheEvent } from "../objcache/objcache"
import { SQLiteStorage } from "../storage/sqlite"
import { type Card, nextCycleStatus, prevCycleStatus } from "../common/types/card"
import type { StObjectId } from "../common/types"
import { prepareSearch } from "../common/utils/search"
import { BacklinkIndex } from "../backlink/BacklinkIndex"
import { TextContentCache } from "../textcontent/TextContentCache"
import type { EditorContext } from "../editor/EditorContext"
import { settingsStore } from "../settings/SettingsStore"

type CardSuggestion = {
  id: string
  title: string
}

class AppStore {
  private objCache: ObjCache
  private storage: SQLiteStorage
  private backlinkIndex: BacklinkIndex
  private textContentCache: TextContentCache

  // Signals for reactive state
  private currentCardId: Accessor<StObjectId | null>
  private setCurrentCardId: Setter<StObjectId | null>

  private cards: Accessor<Card[]>
  private setCards: Setter<Card[]>

  private searchQuery: Accessor<string>
  private setSearchQuery: Setter<string>

  private searchResults: Accessor<Array<Card & { searchScore?: number }>>
  private setSearchResults: Setter<Array<Card & { searchScore?: number }>>

  private recentCardIds: Accessor<string[]>
  private setRecentCardIds: Setter<string[]>

  // Navigation history
  private navHistory: Accessor<(StObjectId | null)[]>
  private setNavHistory: Setter<(StObjectId | null)[]>
  private navIndex: Accessor<number>
  private setNavIndex: Setter<number>
  private isNavigating: boolean = false

  private pinnedCardIds: Accessor<string[]>
  private setPinnedCardIds: Setter<string[]>

  // Track last update source for each card (non-reactive, only for checking)
  private lastUpdateSources: Map<StObjectId, string | undefined> = new Map()

  constructor() {
    // Initialize signals
    const [currentCardId, setCurrentCardId] = createSignal<StObjectId | null>(null)
    this.currentCardId = currentCardId
    this.setCurrentCardId = setCurrentCardId

    const [cards, setCards] = createSignal<Card[]>([])
    this.cards = cards
    this.setCards = setCards

    const [searchQuery, setSearchQuery] = createSignal("")
    this.searchQuery = searchQuery
    this.setSearchQuery = setSearchQuery

    const [searchResults, setSearchResults] = createSignal<Array<Card & { searchScore?: number }>>(
      []
    )
    this.searchResults = searchResults
    this.setSearchResults = setSearchResults

    const [recentCardIds, setRecentCardIds] = createSignal<string[]>([])
    this.recentCardIds = recentCardIds
    this.setRecentCardIds = setRecentCardIds

    const [pinnedCardIds, setPinnedCardIds] = createSignal<string[]>([])
    this.pinnedCardIds = pinnedCardIds
    this.setPinnedCardIds = setPinnedCardIds

    // Initialize navigation history
    const [navHistory, setNavHistory] = createSignal<(StObjectId | null)[]>([null])
    this.navHistory = navHistory
    this.setNavHistory = setNavHistory

    const [navIndex, setNavIndex] = createSignal(0)
    this.navIndex = navIndex
    this.setNavIndex = setNavIndex

    // Initialize storage and cache
    this.storage = new SQLiteStorage()
    this.objCache = new ObjCache()
    this.backlinkIndex = new BacklinkIndex()
    this.textContentCache = new TextContentCache()
  }

  async init(dbPath: string = "notes.db") {
    await this.storage.init(dbPath)
    await this.objCache.init(this.storage)
    await this.backlinkIndex.init(this.objCache)
    await this.textContentCache.init(this.objCache)
    await this.loadCards()
    await this.loadPinnedCards()
    await this.loadLastOpenedCard()
  }

  async initWithPath(dbPath: string) {
    await this.init(dbPath)
  }

  getDbPath(): string | null {
    return this.storage.getPath()
  }

  async close() {
    this.backlinkIndex.dispose()
    this.textContentCache.dispose()
    this.objCache.dispose()
    await this.storage.close()
    this.setCards([])
    this.setCurrentCardId(null)
    this.setNavHistory([null])
    this.setNavIndex(0)
  }

  private async loadCards() {
    const objects = await this.storage.query({ type: "card", includeDeleted: false })
    this.setCards(objects as Card[])
  }

  private async loadPinnedCards() {
    try {
      const pinnedStr = await this.storage.getSetting("pinned_cards")
      if (pinnedStr) {
        const pinned = JSON.parse(pinnedStr)
        if (Array.isArray(pinned)) {
          this.setPinnedCardIds(pinned)
        }
      }
    } catch (error) {
      console.error("Failed to load pinned cards", error)
    }
  }

  private async loadLastOpenedCard() {
    try {
      const lastCardId = await this.storage.getSetting("last_opened_card")
      if (lastCardId && this.cards().some((c) => c.id === lastCardId)) {
        this.setCurrentCardId(lastCardId)
        this.setNavHistory([lastCardId])
        this.setNavIndex(0)
      }
    } catch (error) {
      console.error("Failed to load last opened card", error)
    }
  }

  // Getters for components
  getCurrentCardId = () => this.currentCardId()
  getCurrentCard = (): Card | null => {
    const id = this.currentCardId()
    if (!id) return null
    return this.cards().find((c) => c.id === id) || null
  }
  getCards = () => this.cards()
  getCard = (id: StObjectId): Card | null => this.cards().find((c) => c.id === id) || null
  getSearchQuery = () => this.searchQuery()
  getSearchResults = () => this.searchResults()
  getRecentCards = (): Card[] => {
    const recentIds = this.recentCardIds()
    const allCards = this.cards()
    return recentIds
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined)
  }

  getPinnedCards = (): Card[] => {
    const pinnedIds = this.pinnedCardIds()
    const allCards = this.cards()
    return pinnedIds
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c): c is Card => c !== undefined)
  }

  togglePinCard = async (id: string) => {
    const current = this.pinnedCardIds()
    let next: string[]
    if (current.includes(id)) {
      next = current.filter((c) => c !== id)
    } else {
      next = [...current, id]
    }
    this.setPinnedCardIds(next)
    await this.storage.setSetting("pinned_cards", JSON.stringify(next))
  }

  isPinned = (id: string) => this.pinnedCardIds().includes(id)

  // Card operations
  async createCard(initialText?: string): Promise<Card> {
    return this.createCardInternal(initialText, undefined, true)
  }

  async createCardWithoutSelect(
    initialText?: string,
    initialContent?: any,
    status?: string
  ): Promise<Card> {
    return this.createCardInternal(initialText, initialContent, false, status)
  }

  private async createCardInternal(
    initialText?: string,
    initialContent?: any,
    selectAfterCreate = true,
    status?: string
  ): Promise<Card> {
    const newId = crypto.randomUUID()
    const content = initialContent || {
      type: "doc",
      content: [
        {
          type: "title",
          attrs: { level: 1 },
          content: initialText ? [{ type: "text", text: initialText }] : []
        },
        { type: "paragraph" }
      ]
    }
    const card = {
      id: newId,
      type: "card" as const,
      data: {
        content,
        status
      }
    }

    await this.objCache.withTx((tx) => {
      tx.create(card)
    })

    await this.loadCards()
    if (selectAfterCreate) {
      this.setCurrentCardId(newId)
    }

    const createdCard = this.cards().find((c) => c.id === newId)
    if (createdCard) {
      return createdCard
    }
    throw new Error("Failed to create card")
  }

  async updateCard(id: StObjectId, content: any, source?: string) {
    this.lastUpdateSources.set(id, source)
    await this.objCache.withTx((tx) => {
      if (source) tx.setSource(source)
      const card = this.cards().find((c) => c.id === id)
      if (!card) return

      tx.update(id, {
        id,
        type: "card",
        data: {
          ...card.data,
          content
        }
      })
    })

    await this.loadCards()
  }

  getLastUpdateSource(id: StObjectId): string | undefined {
    return this.lastUpdateSources.get(id)
  }

  async updateCardStatus(id: StObjectId, status: string | undefined) {
    await this.objCache.withTx((tx) => {
      const card = this.cards().find((c) => c.id === id)
      if (!card) return

      tx.update(id, {
        id,
        type: "card",
        data: {
          ...card.data,
          status
        }
      })
    })

    await this.loadCards()
  }

  async cycleTaskStatusForward(cardId: StObjectId) {
    const card = this.cards().find((c) => c.id === cardId)
    if (!card) return

    const statuses = settingsStore.getTaskStatuses()
    const newStatus = nextCycleStatus(card.data.status, statuses)

    await this.objCache.withTx((tx) => {
      tx.update(card.id, {
        id: card.id,
        type: "card",
        data: {
          ...card.data,
          status: newStatus
        }
      })
    })

    await this.loadCards()
  }

  async cycleTaskStatusBackward(cardId: StObjectId) {
    const card = this.cards().find((c) => c.id === cardId)
    if (!card) return

    const statuses = settingsStore.getTaskStatuses()
    const newStatus = prevCycleStatus(card.data.status, statuses)

    await this.objCache.withTx((tx) => {
      tx.update(card.id, {
        id: card.id,
        type: "card",
        data: {
          ...card.data,
          status: newStatus
        }
      })
    })

    await this.loadCards()
  }

  getCardStatus(cardId: StObjectId): string | undefined {
    const card = this.cards().find((c) => c.id === cardId)
    return card?.data.status
  }

  async deleteCard(id: StObjectId) {
    await this.objCache.withTx((tx) => {
      tx.delete(id)
    })

    if (this.currentCardId() === id) {
      this.setCurrentCardId(null)
    }

    await this.loadCards()
  }

  // Navigation
  selectCard(id: StObjectId | null) {
    const currentId = this.currentCardId()
    if (id === currentId) return

    this.setCurrentCardId(id)

    if (!this.isNavigating) {
      const history = this.navHistory()
      const index = this.navIndex()
      const newHistory = [...history.slice(0, index + 1), id]
      this.setNavHistory(newHistory)
      this.setNavIndex(newHistory.length - 1)
    }

    if (id) {
      const recent = this.recentCardIds()
      const filtered = recent.filter((cid) => cid !== id)
      const updated = [id, ...filtered].slice(0, 10)
      this.setRecentCardIds(updated)
      this.storage.setSetting("last_opened_card", id)
    }
  }

  canGoBack = () => this.navIndex() > 0
  canGoForward = () => this.navIndex() < this.navHistory().length - 1

  goBack() {
    if (!this.canGoBack()) return
    this.isNavigating = true
    const newIndex = this.navIndex() - 1
    this.setNavIndex(newIndex)
    this.setCurrentCardId(this.navHistory()[newIndex])
    this.isNavigating = false
  }

  goForward() {
    if (!this.canGoForward()) return
    this.isNavigating = true
    const newIndex = this.navIndex() + 1
    this.setNavIndex(newIndex)
    this.setCurrentCardId(this.navHistory()[newIndex])
    this.isNavigating = false
  }

  // Search
  performSearch(query: string) {
    this.setSearchQuery(query)

    if (!query.trim()) {
      this.setSearchResults([])
      return
    }

    const search = prepareSearch(query)
    const results = this.cards()
      .map((card) => {
        const text = this.textContentCache.getText(card.id)()
        const score = search(text)
        return { ...card, searchScore: score }
      })
      .filter((card) => card.searchScore > 0)
      .sort((a, b) => b.searchScore - a.searchScore)

    this.setSearchResults(results)
  }

  clearSearch() {
    this.setSearchQuery("")
    this.setSearchResults([])
  }

  // Text content
  getCardTitle = (cardId: StObjectId) => this.textContentCache.getTitle(cardId)
  getCardText = (cardId: StObjectId) => this.textContentCache.getText(cardId)

  updateCardContent = async (cardId: StObjectId, content: any) => {
    const card = this.cards().find((c) => c.id === cardId)
    if (!card) return
    await this.updateCard(cardId, content)
  }

  searchCards = async (query: string): Promise<CardSuggestion[]> => {
    if (!query.trim()) {
      return this.cards()
        .slice()
        .sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
          return timeB - timeA
        })
        .map((c) => ({
          id: c.id,
          title: this.textContentCache.getTitle(c.id)()
        }))
    }
    this.performSearch(query)
    return this.searchResults().map((c) => ({
      id: c.id,
      title: this.textContentCache.getTitle(c.id)()
    }))
  }

  // Backlinks
  getBacklinks(cardId: StObjectId) {
    return this.backlinkIndex.getBacklinks(cardId)
  }

  getPotentialLinks(cardId: StObjectId) {
    const title = this.textContentCache.getTitle(cardId)()
    return this.backlinkIndex.getPotentialLinks(cardId, title)
  }

  subscribeToUpdates(listener: (event: ObjCacheEvent) => void): () => void {
    return this.objCache.subscribe(listener)
  }

  getEditorContext(cardId: StObjectId): EditorContext {
    const editorId = `editor-${cardId}-${Date.now()}`
    const dbPath = this.getDbPath()
    if (!dbPath) throw new Error("Database not initialized")

    return {
      cardId,
      editorId,
      dbPath,
      getCard: () => this.getCard(cardId),
      getCardTitle: (id) => this.textContentCache.getTitle(id)(),
      getLastUpdateSource: () => this.getLastUpdateSource(cardId),
      updateCard: (content) => this.updateCard(cardId, content, editorId),
      searchCards: (query) => this.searchCards(query),
      createCard: async (title) => {
        const card = await this.createCard(title)
        return card ? { id: card.id, title: this.textContentCache.getTitle(card.id)() } : null
      },
      onCardClick: (id) => this.selectCard(id)
    }
  }
}

// Global singleton instance
export const appStore = new AppStore()
