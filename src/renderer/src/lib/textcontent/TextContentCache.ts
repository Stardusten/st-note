import { createSignal, type Accessor, type Setter } from "solid-js"
import type { StObjectId } from "@renderer/lib/common/types"
import type { ObjCache, ObjCacheEvent } from "../objcache/objcache"
import type { Card } from "../common/types/card"
import { extractCardRefs } from "../backlink/utils"

export class TextContentCache {
  private objCache: ObjCache | null = null
  private unsubscribe: (() => void) | null = null

  private textCache: Map<StObjectId, string> = new Map()
  private forwardRefs: Map<StObjectId, Set<StObjectId>> = new Map()

  private cacheVersion: Accessor<number>
  private setCacheVersion: Setter<number>

  private dirty: Set<StObjectId> = new Set()
  private pendingUpdates: Set<StObjectId> = new Set()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly debounceMs: number = 100

  constructor() {
    const [cacheVersion, setCacheVersion] = createSignal(0)
    this.cacheVersion = cacheVersion
    this.setCacheVersion = setCacheVersion
  }

  async init(objCache: ObjCache): Promise<void> {
    this.objCache = objCache
    this.buildForwardRefs()
    this.unsubscribe = objCache.subscribe(this.handleEvent)
  }

  private buildForwardRefs() {
    if (!this.objCache) return

    this.forwardRefs.clear()

    for (const [id, signal] of this.objCache.cache) {
      const obj = signal[0]()
      if (!obj || obj.type !== 'card') continue
      this.indexCardRefs(id, obj as Card)
    }
  }

  private indexCardRefs(cardId: StObjectId, card: Card) {
    const refs = extractCardRefs(card.data?.content)
    this.forwardRefs.set(cardId, new Set(refs))
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
      const obj = this.objCache.get(cardId)()
      if (obj && obj.type === 'card') {
        this.indexCardRefs(cardId, obj as Card)
      } else {
        this.forwardRefs.delete(cardId)
      }
      this.invalidate(cardId)
    }

    this.pendingUpdates.clear()
    this.setCacheVersion(v => v + 1)
  }

  private invalidate(cardId: StObjectId, visited?: Set<StObjectId>) {
    visited ??= new Set()
    if (visited.has(cardId)) return
    visited.add(cardId)

    this.dirty.add(cardId)
    this.textCache.delete(cardId)

    for (const [sourceId, refs] of this.forwardRefs) {
      if (refs.has(cardId)) {
        this.invalidate(sourceId, visited)
      }
    }
  }

  private computeText(cardId: StObjectId, visited: Set<StObjectId>): string {
    if (!this.objCache) return ''

    const obj = this.objCache.get(cardId)()
    if (!obj || obj.type !== 'card') return ''

    const card = obj as Card
    const content = card.data?.content
    if (!content) return ''

    const parts: string[] = []
    this.extractTextFromNode(content, parts, visited)
    return parts.join('').trim()
  }

  private extractTextFromNode(node: any, parts: string[], visited: Set<StObjectId>) {
    if (!node) return

    if (node.type === 'text' && node.text) {
      parts.push(node.text)
    } else if (node.type === 'cardRef' && node.attrs?.cardId) {
      const refCardId = node.attrs.cardId as StObjectId
      const title = this.getTitleInternal(refCardId, visited)
      parts.push(`[[${title}]]`)
    }

    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        this.extractTextFromNode(child, parts, visited)
      }
    }

    if (node.type === 'title' || node.type === 'paragraph' || node.type === 'block' || node.type === 'code_block') {
      parts.push('\n')
    }
  }

  private getTitleInternal(cardId: StObjectId, visited: Set<StObjectId>): string {
    if (visited.has(cardId)) return 'Untitled'
    visited.add(cardId)

    if (!this.objCache) return 'Untitled'

    const obj = this.objCache.get(cardId)()
    if (!obj || obj.type !== 'card') return 'Untitled'

    const card = obj as Card
    const content = card.data?.content?.content
    if (!Array.isArray(content) || content.length === 0) return 'Untitled'

    const titleNode = content[0]
    if (titleNode?.type !== 'title' || !Array.isArray(titleNode.content)) return 'Untitled'

    const parts: string[] = []
    for (const child of titleNode.content) {
      if (child.type === 'text' && child.text) {
        parts.push(child.text)
      } else if (child.type === 'cardRef' && child.attrs?.cardId) {
        const refTitle = this.getTitleInternal(child.attrs.cardId, visited)
        parts.push(refTitle)
      }
    }

    const result = parts.join('').trim()
    return result || 'Untitled'
  }

  getText(cardId: StObjectId): Accessor<string> {
    return () => {
      this.cacheVersion()

      if (!this.dirty.has(cardId) && this.textCache.has(cardId)) {
        return this.textCache.get(cardId)!
      }

      const visited = new Set<StObjectId>()
      visited.add(cardId)
      const text = this.computeText(cardId, visited)
      this.textCache.set(cardId, text)
      this.dirty.delete(cardId)
      return text
    }
  }

  getTitle(cardId: StObjectId): Accessor<string> {
    return () => {
      this.cacheVersion()

      const visited = new Set<StObjectId>()
      return this.getTitleInternal(cardId, visited)
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
    this.textCache.clear()
    this.forwardRefs.clear()
    this.dirty.clear()
    this.pendingUpdates.clear()
  }
}
