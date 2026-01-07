import { createSignal, type Accessor, type Setter } from "solid-js"
import type { StObjectId } from "@renderer/lib/common/storage-types"
import type { ObjCache, ObjCacheEvent } from "../objcache/objcache"
import type { Card } from "../common/types/card"
import type { TaskEntry, TaskType } from "./types"
import { extractTasksFromContent, isTaskVisible, getTaskPriority, getDaysDiff } from "./parser"

export type TaskGroup = {
  id: string
  label: string
  tasks: TaskEntry[]
}

export class TaskIndex {
  private objCache: ObjCache | null = null
  private unsubscribe: (() => void) | null = null

  private tasksByCard: Map<StObjectId, TaskEntry[]> = new Map()
  private allTasks: TaskEntry[] = []

  private indexVersion: Accessor<number>
  private setIndexVersion: Setter<number>

  private pendingUpdates: Set<StObjectId> = new Set()
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly debounceMs: number = 300

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

    this.tasksByCard.clear()
    this.allTasks = []

    for (const [id, signal] of this.objCache.cache) {
      const obj = signal[0]()
      if (!obj || obj.type !== "card") continue
      this.indexCard(id, obj as Card)
    }

    this.rebuildAllTasks()
  }

  private indexCard(cardId: StObjectId, card: Card) {
    const tasks = extractTasksFromContent(card.data?.content, cardId)
    if (tasks.length > 0) {
      this.tasksByCard.set(cardId, tasks)
    } else {
      this.tasksByCard.delete(cardId)
    }
  }

  private rebuildAllTasks() {
    this.allTasks = []
    for (const tasks of this.tasksByCard.values()) {
      this.allTasks.push(...tasks)
    }
    // Sort by timestamp as base order
    this.allTasks.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }

  private handleEvent = (event: ObjCacheEvent) => {
    for (const op of event.ops) {
      const obj = op.object || op.oldObject
      if (obj?.type === "card") {
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
      this.tasksByCard.delete(cardId)
      const obj = this.objCache.get(cardId)()
      if (obj && obj.type === "card") {
        this.indexCard(cardId, obj as Card)
      }
    }

    this.pendingUpdates.clear()
    this.rebuildAllTasks()
    this.setIndexVersion((v) => v + 1)
  }

  getTasksForCard(cardId: StObjectId): Accessor<TaskEntry[]> {
    return () => {
      this.indexVersion()
      return this.tasksByCard.get(cardId) || []
    }
  }

  getTasksInRange(start: Date, end: Date): Accessor<TaskEntry[]> {
    return () => {
      this.indexVersion()
      const today = new Date()
      return this.allTasks.filter((t) => isTaskVisible(t, today))
    }
  }

  getAllTasks(): Accessor<TaskEntry[]> {
    return () => {
      this.indexVersion()
      return [...this.allTasks]
    }
  }

  getTasksByType(type: TaskType): Accessor<TaskEntry[]> {
    return () => {
      this.indexVersion()
      return this.allTasks.filter((t) => t.type === type)
    }
  }

  /**
   * Get visible tasks sorted by priority (howm floating mechanism).
   * Higher priority tasks "float" to the top.
   */
  getVisibleTasksSorted(): Accessor<TaskEntry[]> {
    return () => {
      this.indexVersion()
      const today = new Date()

      return this.allTasks
        .filter((t) => isTaskVisible(t, today))
        .sort((a, b) => {
          const pa = getTaskPriority(a, today)
          const pb = getTaskPriority(b, today)
          if (pa !== pb) return pb - pa // Higher priority first
          return a.timestamp.getTime() - b.timestamp.getTime() // Same priority: by date
        })
    }
  }

  /**
   * Get tasks grouped by urgency level.
   * Groups: Overdue, Today, This Week, Later
   */
  getGroupedTasks(): Accessor<TaskGroup[]> {
    return () => {
      this.indexVersion()

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      const overdue: TaskEntry[] = []
      const todayTasks: TaskEntry[] = []
      const thisWeek: TaskEntry[] = []
      const later: TaskEntry[] = []

      // Get visible tasks sorted by priority
      const visibleTasks = this.allTasks
        .filter((t) => isTaskVisible(t, today))
        .sort((a, b) => {
          const pa = getTaskPriority(a, today)
          const pb = getTaskPriority(b, today)
          if (pa !== pb) return pb - pa
          return a.timestamp.getTime() - b.timestamp.getTime()
        })

      for (const task of visibleTasks) {
        const daysDiff = getDaysDiff(task, today)

        switch (task.type) {
          case "schedule":
            // Schedule is always today (since it's only visible today)
            todayTasks.push(task)
            break

          case "deadline":
            if (daysDiff < 0) {
              overdue.push(task)
            } else if (daysDiff === 0) {
              todayTasks.push(task)
            } else if (daysDiff <= 7) {
              thisWeek.push(task)
            } else {
              later.push(task)
            }
            break

          case "todo":
            // Todo: group by how long it's been floating
            if (daysDiff <= -7) {
              // Floating for more than a week = urgent
              overdue.push(task)
            } else if (daysDiff <= -1) {
              // Floating for a few days
              thisWeek.push(task)
            } else {
              // Just started floating
              todayTasks.push(task)
            }
            break

          case "reminder":
            // Reminder: sinking, less urgent as time passes
            if (daysDiff === 0) {
              todayTasks.push(task)
            } else if (daysDiff >= -7) {
              thisWeek.push(task)
            } else {
              later.push(task)
            }
            break

          case "defer":
            // Defer: periodic tasks go to today when in active window
            todayTasks.push(task)
            break

          default:
            break
        }
      }

      const groups: TaskGroup[] = []
      if (overdue.length) groups.push({ id: "overdue", label: "Overdue", tasks: overdue })
      if (todayTasks.length) groups.push({ id: "today", label: "Today", tasks: todayTasks })
      if (thisWeek.length) groups.push({ id: "week", label: "This Week", tasks: thisWeek })
      if (later.length) groups.push({ id: "later", label: "Later", tasks: later })

      return groups
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
    this.tasksByCard.clear()
    this.allTasks = []
    this.pendingUpdates.clear()
  }
}
