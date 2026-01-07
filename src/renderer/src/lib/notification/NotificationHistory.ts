import type { NotificationHistoryEntry } from "./types"

type StorageProvider = {
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

/**
 * Tracks sent notifications to avoid duplicates.
 * Persisted to database via storage provider.
 */
class NotificationHistory {
  private static STORAGE_KEY = "notification_history"
  private static MAX_ENTRIES = 1000
  private static RETENTION_DAYS = 7

  private entries: Map<string, NotificationHistoryEntry> = new Map()
  private storage: StorageProvider | null = null
  private initialized = false
  private pendingSave: Promise<void> | null = null

  /**
   * Initialize with storage provider
   */
  async init(storage: StorageProvider): Promise<void> {
    this.storage = storage
    await this.load()
    this.initialized = true
  }

  /**
   * Reset state (called when switching databases)
   */
  reset(): void {
    this.entries.clear()
    this.storage = null
    this.initialized = false
  }

  /**
   * Load history from database
   */
  private async load(): Promise<void> {
    if (!this.storage) return

    try {
      const raw = await this.storage.getSetting(NotificationHistory.STORAGE_KEY)
      if (raw) {
        const parsed: Array<{ id: string; sentAt: string }> = JSON.parse(raw)
        const cutoff = Date.now() - NotificationHistory.RETENTION_DAYS * 24 * 60 * 60 * 1000

        for (const entry of parsed) {
          const sentAt = new Date(entry.sentAt)
          if (sentAt.getTime() > cutoff) {
            this.entries.set(entry.id, { id: entry.id, sentAt })
          }
        }
      }
    } catch (e) {
      console.error("Failed to load notification history:", e)
    }
  }

  /**
   * Save history to database
   */
  private async save(): Promise<void> {
    if (!this.storage) return

    // Debounce saves
    if (this.pendingSave) return

    this.pendingSave = (async () => {
      try {
        let arr = Array.from(this.entries.values())

        // Keep only recent entries
        if (arr.length > NotificationHistory.MAX_ENTRIES) {
          arr.sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
          arr = arr.slice(0, NotificationHistory.MAX_ENTRIES)
          this.entries = new Map(arr.map((e) => [e.id, e]))
        }

        await this.storage!.setSetting(
          NotificationHistory.STORAGE_KEY,
          JSON.stringify(arr.map((e) => ({ id: e.id, sentAt: e.sentAt.toISOString() })))
        )
      } catch (e) {
        console.error("Failed to save notification history:", e)
      } finally {
        this.pendingSave = null
      }
    })()

    await this.pendingSave
  }

  /**
   * Check if a notification was already sent
   */
  wasSent(id: string): boolean {
    return this.entries.has(id)
  }

  /**
   * Mark a notification as sent
   */
  markSent(id: string): void {
    this.entries.set(id, { id, sentAt: new Date() })
    this.save() // Fire and forget
  }

  /**
   * Clear all history
   */
  async clear(): Promise<void> {
    this.entries.clear()
    if (this.storage) {
      await this.storage.setSetting(NotificationHistory.STORAGE_KEY, "[]")
    }
  }

  /**
   * Get all entries (for debugging)
   */
  getAll(): NotificationHistoryEntry[] {
    return Array.from(this.entries.values())
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }
}

export const notificationHistory = new NotificationHistory()
