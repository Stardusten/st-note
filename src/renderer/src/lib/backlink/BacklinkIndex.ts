import { createSignal, type Accessor, type Setter } from "solid-js"
import type { StObjectId } from "@renderer/lib/common/types"
import type { ObjCache, ObjCacheEvent } from "../objcache/objcache"
import type { BacklinkContext } from "./types"
import { extractCardRefs, extractBlocksWithCardRef, extractBlocksWithText } from "./utils"
import type { Card } from "../common/types/card"

export class BacklinkIndex {
  private objCache: ObjCache | null = null
  private unsubscribe: (() => void) | null = null

  private forwardIndex: Map<StObjectId, Set<StObjectId>> = new Map()
  private backlinkCache: Map<StObjectId, BacklinkContext[]> = new Map()
  private potentialLinkCache: Map<string, BacklinkContext[]> = new Map()

  private indexVersion: Accessor<number>
  private setIndexVersion: Setter<number>

  private pendingUpdates: Set<StObjectId> = new Set()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly debounceMs: number = 500

  constructor() {
    const [indexVersion, setIndexVersion] = createSignal(0)
    this.indexVersion = indexVersion
    this.setIndexVersion = setIndexVersion
  }

  async init(objCache: ObjCache): Promise<void> {
    this.objCache = objCache
    this.buildFullIndex()
    this.unsubscribe = objCache.subscribe(this.handleEvent)
  }

  private buildFullIndex() {
    if (!this.objCache) return

    this.forwardIndex.clear()
    this.backlinkCache.clear()
    this.potentialLinkCache.clear()

    for (const [id, signal] of this.objCache.cache) {
      const obj = signal[0]()
      if (!obj || obj.type !== 'card') continue
      this.indexCard(id, obj as Card)
    }
  }

  private indexCard(cardId: StObjectId, card: Card) {
    const refs = extractCardRefs(card.data?.content)
    for (const refId of refs) {
      let set = this.forwardIndex.get(refId)
      if (!set) {
        set = new Set()
        this.forwardIndex.set(refId, set)
      }
      set.add(cardId)
    }
  }

  private removeCardFromIndex(cardId: StObjectId) {
    for (const [, set] of this.forwardIndex) {
      set.delete(cardId)
    }
  }

  private handleEvent = (event: ObjCacheEvent) => {
    for (const op of event.ops) {
      const obj = op.object || op.oldObject
      if (obj?.type === 'card') {
        this.pendingUpdates.add(op.id)
      }
    }
    this.scheduleUpdate()
  }

  private scheduleUpdate() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.processPendingUpdates()
    }, this.debounceMs)
  }

  private processPendingUpdates() {
    if (!this.objCache) return

    for (const cardId of this.pendingUpdates) {
      this.removeCardFromIndex(cardId)
      const obj = this.objCache.get(cardId)()
      if (obj && obj.type === 'card') {
        this.indexCard(cardId, obj as Card)
      }
    }

    this.pendingUpdates.clear()
    this.backlinkCache.clear()
    this.potentialLinkCache.clear()
    this.setIndexVersion(v => v + 1)
  }

  private computeBacklinks(cardId: StObjectId): BacklinkContext[] {
    if (!this.objCache) return []

    const sourceCardIds = this.forwardIndex.get(cardId)
    if (!sourceCardIds) return []

    const results: BacklinkContext[] = []

    for (const sourceId of sourceCardIds) {
      const obj = this.objCache.get(sourceId)()
      if (!obj || obj.type !== 'card') continue

      const card = obj as Card
      const blocks = extractBlocksWithCardRef(card.data?.content, cardId)
      if (blocks.length > 0) {
        results.push({ sourceCardId: sourceId, blocks })
      }
    }

    results.sort((a, b) => a.sourceCardId.localeCompare(b.sourceCardId))
    return results
  }

  private computePotentialLinks(cardId: StObjectId, title: string): BacklinkContext[] {
    if (!this.objCache || !title.trim()) return []

    const existingBacklinks = this.forwardIndex.get(cardId) || new Set()
    const results: BacklinkContext[] = []

    for (const [id, signal] of this.objCache.cache) {
      if (id === cardId) continue
      if (existingBacklinks.has(id)) continue

      const obj = signal[0]()
      if (!obj || obj.type !== 'card') continue

      const card = obj as Card
      const blocks = extractBlocksWithText(card.data?.content, title)
      if (blocks.length > 0) {
        results.push({ sourceCardId: id, blocks })
      }
    }

    results.sort((a, b) => a.sourceCardId.localeCompare(b.sourceCardId))
    return results
  }

  getBacklinks(cardId: StObjectId): Accessor<BacklinkContext[]> {
    return () => {
      this.indexVersion()

      let cached = this.backlinkCache.get(cardId)
      if (!cached) {
        cached = this.computeBacklinks(cardId)
        this.backlinkCache.set(cardId, cached)
      }
      return cached
    }
  }

  getPotentialLinks(cardId: StObjectId, title: string): Accessor<BacklinkContext[]> {
    return () => {
      this.indexVersion()

      const cacheKey = `${cardId}:${title}`
      let cached = this.potentialLinkCache.get(cacheKey)
      if (!cached) {
        cached = this.computePotentialLinks(cardId, title)
        this.potentialLinkCache.set(cacheKey, cached)
      }
      return cached
    }
  }

  dispose() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    this.forwardIndex.clear()
    this.backlinkCache.clear()
    this.potentialLinkCache.clear()
    this.pendingUpdates.clear()
  }
}
