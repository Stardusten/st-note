import { createSignal, type Accessor, type Setter } from "solid-js"
import type { StObjectId } from "@renderer/lib/common/storage-types"
import type { ObjCache, ObjCacheEvent } from "../objcache/objcache"
import type { Card } from "../common/types/card"
import type { TaskEntry, TaskType } from "./types"
import { extractTasksFromContent, isTaskVisible, getEffectiveDate } from "./parser"

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
      return this.allTasks.filter((t) => isTaskVisible(t, start, end))
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

  getGroupedTasks(): Accessor<TaskGroup[]> {
    return () => {
      this.indexVersion()

      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const overdue: TaskEntry[] = []
      const todayTasks: TaskEntry[] = []
      const thisWeek: TaskEntry[] = []
      const later: TaskEntry[] = []

      for (const task of this.allTasks) {
        if (task.type === "done") continue

        const effective = getEffectiveDate(task)
        const ts = task.timestamp

        if (task.type === "reminder") {
          if (effective < today) {
            overdue.push(task)
          } else if (ts <= today && effective >= today) {
            todayTasks.push(task)
          } else if (ts <= weekEnd) {
            thisWeek.push(task)
          } else {
            later.push(task)
          }
        } else {
          if (ts < today) {
            overdue.push(task)
          } else if (ts < tomorrow) {
            todayTasks.push(task)
          } else if (ts < weekEnd) {
            thisWeek.push(task)
          } else {
            later.push(task)
          }
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
