import { createSignal, type Accessor, type Setter } from "solid-js"
import { ObjCache } from "../objcache/objcache"
import { SQLiteStorage } from "../storage/sqlite"
import type { Card } from "../common/types/card"
import type { StObjectId } from "../common/types"
import { prepareFuzzySearch } from "../common/utils/fuzzySearch"

class AppStore {
  private objCache: ObjCache
  private storage: SQLiteStorage

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

    const [searchResults, setSearchResults] = createSignal<Array<Card & { searchScore?: number }>>([])
    this.searchResults = searchResults
    this.setSearchResults = setSearchResults

    const [recentCardIds, setRecentCardIds] = createSignal<string[]>([])
    this.recentCardIds = recentCardIds
    this.setRecentCardIds = setRecentCardIds

    // Initialize storage and cache
    this.storage = new SQLiteStorage()
    this.objCache = new ObjCache()
  }

  async init(dbPath: string = "notes.db") {
    await this.storage.init(dbPath)
    await this.objCache.init(this.storage)
    await this.loadCards()
  }

  private async loadCards() {
    const objects = await this.storage.query({ type: 'card', includeDeleted: false })
    this.setCards(objects as Card[])
  }

  // Getters for components
  getCurrentCardId = () => this.currentCardId()
  getCurrentCard = (): Card | null => {
    const id = this.currentCardId()
    if (!id) return null
    return this.cards().find(c => c.id === id) || null
  }
  getCards = () => this.cards()
  getSearchQuery = () => this.searchQuery()
  getSearchResults = () => this.searchResults()
  getRecentCards = (): Card[] => {
    const recentIds = this.recentCardIds()
    const allCards = this.cards()
    return recentIds
      .map(id => allCards.find(c => c.id === id))
      .filter((c): c is Card => c !== undefined)
  }

  // Card operations
  async createCard(initialText?: string): Promise<Card> {
    const newId = crypto.randomUUID()
    const card = {
      id: newId,
      type: 'card' as const,
      data: {
        content: {
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
      },
      text: initialText || '',
      tags: []
    }

    await this.objCache.withTx(tx => {
      tx.create(card)
    })

    await this.loadCards()
    this.setCurrentCardId(newId)

    const createdCard = this.cards().find(c => c.id === newId)
    if (createdCard) {
      return createdCard
    }
    throw new Error("Failed to create card")
  }

  async updateCard(id: StObjectId, content: any, text: string) {
    await this.objCache.withTx(tx => {
      const card = this.cards().find(c => c.id === id)
      if (!card) return

      tx.update(id, {
        id,
        type: 'card',
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

  async deleteCard(id: StObjectId) {
    await this.objCache.withTx(tx => {
      tx.delete(id)
    })

    if (this.currentCardId() === id) {
      this.setCurrentCardId(null)
    }

    await this.loadCards()
  }

  // Navigation
  selectCard(id: StObjectId | null) {
    this.setCurrentCardId(id)

    if (id) {
      // Track recent cards
      const recent = this.recentCardIds()
      const filtered = recent.filter(cid => cid !== id)
      const updated = [id, ...filtered].slice(0, 10) // Keep last 10
      this.setRecentCardIds(updated)
    }
  }

  // Search
  performSearch(query: string) {
    this.setSearchQuery(query)

    if (!query.trim()) {
      this.setSearchResults([])
      return
    }

    const fuzzySearch = prepareFuzzySearch(query)
    const results = this.cards()
      .map(card => {
        const result = fuzzySearch(card.text || '')
        return {
          ...card,
          searchScore: result.score
        }
      })
      .filter(card => card.searchScore && card.searchScore > -Infinity)
      .sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0))

    this.setSearchResults(results)
  }

  clearSearch() {
    this.setSearchQuery("")
    this.setSearchResults([])
  }
}

// Global singleton instance
export const appStore = new AppStore()