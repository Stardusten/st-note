import { createSignal, type Accessor, type Setter } from "solid-js"
import { ObjCache, type ObjCacheEvent } from "../objcache/objcache"
import { SQLiteStorage } from "../storage/sqlite"
import type { Card } from "../common/types/card"
import type { StObjectId } from "../common/types"
import { prepareSearch } from "../common/utils/search"
import { BacklinkIndex } from "../backlink/BacklinkIndex"
import { TextContentCache } from "../textcontent/TextContentCache"

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
    checked?: boolean
  ): Promise<Card> {
    return this.createCardInternal(initialText, initialContent, false, checked)
  }

  private async createCardInternal(
    initialText?: string,
    initialContent?: any,
    selectAfterCreate = true,
    checked?: boolean
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
    const text = initialContent ? this.extractTextFromContent(initialContent) : initialText || ""
    const card = {
      id: newId,
      type: "card" as const,
      data: {
        content,
        checked
      },
      text,
      tags: []
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

  private extractTextFromContent(content: any): string {
    if (!content) return ""
    const texts: string[] = []
    const extract = (node: any) => {
      if (node.text) texts.push(node.text)
      if (node.content) node.content.forEach(extract)
    }
    extract(content)
    return texts.join(" ")
  }

  async updateCard(id: StObjectId, content: any, text: string, source?: string) {
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
        },
        text,
        tags: card.tags
      })
    })

    await this.loadCards()
  }

  getLastUpdateSource(id: StObjectId): string | undefined {
    return this.lastUpdateSources.get(id)
  }

  async updateCardChecked(id: StObjectId, checked: boolean) {
    await this.objCache.withTx((tx) => {
      const card = this.cards().find((c) => c.id === id)
      if (!card) return

      tx.update(id, {
        id,
        type: "card",
        data: {
          ...card.data,
          checked
        },
        text: card.text,
        tags: card.tags
      })
    })

    await this.loadCards()
  }

  async toggleCardTask(cardId: StObjectId) {
    const card = this.cards().find((c) => c.id === cardId)
    if (!card) {
      console.log("[toggleCardTask] Card not found:", cardId)
      return
    }

    // 循环: undefined (不是任务) -> false (未完成) -> true (已完成) -> undefined
    let newChecked: boolean | undefined
    if (card.data.checked === undefined) newChecked = false
    else if (card.data.checked === false) newChecked = true
    else newChecked = undefined

    console.log("[toggleCardTask] checked:", card.data.checked, "->", newChecked)

    await this.objCache.withTx((tx) => {
      tx.update(card.id, {
        id: card.id,
        type: "card",
        data: {
          ...card.data,
          checked: newChecked
        },
        text: card.text,
        tags: card.tags
      })
    })

    await this.loadCards()
    console.log("[toggleCardTask] Done")
  }

  async toggleCardTaskBulk(cardIds: StObjectId[]) {
    const allCards = this.cards()
    const targets = cardIds
      .map((id) => allCards.find((c) => c.id === id))
      .filter((c): c is Card => !!c)

    if (targets.length === 0) return

    // Determine target state to sync all cards
    const states = targets.map((c) => c.data.checked)
    const hasUndefined = states.some((s) => s === undefined)
    const hasFalse = states.some((s) => s === false)
    // const hasTrue = states.some(s => s === true)

    let nextState: boolean | undefined

    if (hasUndefined) {
      // If any is not a task, make them all incomplete tasks
      nextState = false
    } else if (hasFalse) {
      // If any is incomplete (and none are undefined), make them all completed
      nextState = true
    } else {
      // If all are completed (or empty), make them all not tasks
      nextState = undefined
    }

    await this.objCache.withTx((tx) => {
      for (const card of targets) {
        tx.update(card.id, {
          id: card.id,
          type: "card",
          data: {
            ...card.data,
            checked: nextState
          },
          text: card.text,
          tags: card.tags
        })
      }
    })

    await this.loadCards()
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
        const score = search(card.text || "")
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
    const text = this.extractTextFromContent(content)
    await this.updateCard(cardId, content, text)
  }

  searchCards = async (query: string): Promise<CardSuggestion[]> => {
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
}

// Global singleton instance
export const appStore = new AppStore()
