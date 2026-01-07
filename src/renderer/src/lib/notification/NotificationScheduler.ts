import {
  differenceInDays,
  startOfDay,
  addMinutes
} from "date-fns"
import type { TaskEntry } from "../task/types"
import { getTaskTitle } from "../task/utils"
import type {
  NotificationRule,
  NotificationSettings,
  ScheduledNotification,
  MessageContext,
  RuleCondition
} from "./types"
import { DEFAULT_NOTIFICATION_SETTINGS } from "./types"
import { defaultRules } from "./rules"
import { notificationHistory } from "./NotificationHistory"

type StorageProvider = {
  getSetting: (key: string) => Promise<string | null>
  setSetting: (key: string, value: string) => Promise<void>
}

type TaskProvider = () => TaskEntry[]
type CardTitleProvider = (cardId: string) => string

/**
 * Notification Scheduler - evaluates rules and schedules system notifications
 */
class NotificationScheduler {
  private settings: NotificationSettings = DEFAULT_NOTIFICATION_SETTINGS
  private rules: NotificationRule[] = defaultRules
  private scheduledTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private checkInterval: ReturnType<typeof setInterval> | null = null
  private taskProvider: TaskProvider | null = null
  private cardTitleProvider: CardTitleProvider | null = null

  /**
   * Initialize the scheduler with storage, task provider, and card title provider
   */
  async init(
    storage: StorageProvider,
    taskProvider: TaskProvider,
    cardTitleProvider: CardTitleProvider
  ): Promise<void> {
    this.taskProvider = taskProvider
    this.cardTitleProvider = cardTitleProvider

    // Initialize notification history with storage
    await notificationHistory.init(storage)

    // Load settings from storage
    await this.loadSettings(storage)

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission()
    }

    // Start periodic check (every minute)
    this.checkInterval = setInterval(() => this.checkAndSchedule(), 60_000)

    // Initial check
    this.checkAndSchedule()
  }

  /**
   * Load settings from storage
   */
  private async loadSettings(storage: StorageProvider): Promise<void> {
    try {
      const raw = await storage.getSetting("notification_settings")
      if (raw) {
        const saved = JSON.parse(raw)
        this.settings = { ...DEFAULT_NOTIFICATION_SETTINGS, ...saved }
      }
    } catch (e) {
      console.error("Failed to load notification settings:", e)
    }
  }

  /**
   * Save settings to storage
   */
  async saveSettings(storage: StorageProvider): Promise<void> {
    try {
      await storage.setSetting("notification_settings", JSON.stringify(this.settings))
    } catch (e) {
      console.error("Failed to save notification settings:", e)
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
    for (const timer of this.scheduledTimers.values()) {
      clearTimeout(timer)
    }
    this.scheduledTimers.clear()
    this.taskProvider = null
    this.cardTitleProvider = null
    notificationHistory.reset()
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings }
  }

  /**
   * Get current settings
   */
  getSettings(): NotificationSettings {
    return this.settings
  }

  /**
   * Check if a rule is enabled
   */
  private isRuleEnabled(rule: NotificationRule): boolean {
    if (!this.settings.enabled) return false
    const override = this.settings.ruleOverrides[rule.id]
    return override !== undefined ? override : rule.enabledByDefault
  }

  /**
   * Check if current time is in DND period
   */
  private isInDndPeriod(): boolean {
    const now = new Date()
    const [dndStartH, dndStartM] = this.settings.dndStart.split(":").map(Number)
    const [dndEndH, dndEndM] = this.settings.dndEnd.split(":").map(Number)

    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const dndStartMinutes = dndStartH * 60 + dndStartM
    const dndEndMinutes = dndEndH * 60 + dndEndM

    if (dndStartMinutes <= dndEndMinutes) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentMinutes >= dndStartMinutes && currentMinutes < dndEndMinutes
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentMinutes >= dndStartMinutes || currentMinutes < dndEndMinutes
    }
  }

  /**
   * Main check: evaluate all tasks against all rules
   */
  checkAndSchedule(): void {
    if (!this.settings.enabled) return
    if (!this.taskProvider) return

    const tasks = this.taskProvider()
    const now = new Date()

    for (const task of tasks) {
      if (task.type === "done") continue

      for (const rule of this.rules) {
        if (!this.isRuleEnabled(rule)) continue
        if (!rule.taskTypes.includes(task.type)) continue

        this.evaluateRule(rule, task, now)
      }
    }
  }

  /**
   * Evaluate a single rule against a task
   */
  private evaluateRule(rule: NotificationRule, task: TaskEntry, now: Date): void {
    const notifications = this.generateNotifications(rule, task, now)

    for (const notif of notifications) {
      // Skip if already sent
      if (notificationHistory.wasSent(notif.id)) continue

      // Skip if already scheduled
      if (this.scheduledTimers.has(notif.id)) continue

      const delay = notif.fireAt.getTime() - now.getTime()

      if (delay <= 0) {
        // Fire immediately
        this.fireNotification(notif)
      } else if (delay < 60 * 60 * 1000) {
        // Schedule within the next hour
        const timer = setTimeout(() => {
          this.scheduledTimers.delete(notif.id)
          this.fireNotification(notif)
        }, delay)
        this.scheduledTimers.set(notif.id, timer)
      }
      // Notifications more than 1 hour away will be picked up in future checks
    }
  }

  /**
   * Generate notification instances for a rule + task
   */
  private generateNotifications(
    rule: NotificationRule,
    task: TaskEntry,
    now: Date
  ): ScheduledNotification[] {
    const results: ScheduledNotification[] = []
    const condition = this.resolveCondition(rule.condition)

    switch (condition.type) {
      case "before_start": {
        if (!task.timestamp) break
        const hasTime = this.hasTimePrecision(task)
        if (!hasTime) break // Only for time-precise tasks

        for (const mins of condition.minutes) {
          const fireAt = addMinutes(task.timestamp, -mins)
          const diffMs = fireAt.getTime() - now.getTime()

          // Skip if more than 2 minutes ago
          if (diffMs < -2 * 60 * 1000) continue

          // Calculate actual minutes until start
          const actualMinutesUntilStart = Math.max(0, Math.round((task.timestamp.getTime() - now.getTime()) / 60000))

          // Fire now if just passed, otherwise schedule for fireAt
          const actualFireAt = diffMs > 0 ? fireAt : now
          const ctx: MessageContext = { type: "before_start", minutes: diffMs > 0 ? mins : actualMinutesUntilStart }
          results.push(this.createNotification(rule, task, actualFireAt, ctx, `before-${mins}`))
        }
        break
      }

      case "before_end": {
        const endTime = task.endTimestamp ?? task.timestamp
        if (!endTime) break
        const hasTime = this.hasTimePrecision(task) || this.endHasTimePrecision(task)
        if (!hasTime) break

        for (const mins of condition.minutes) {
          const fireAt = addMinutes(endTime, -mins)
          const diffMs = fireAt.getTime() - now.getTime()

          // Skip if more than 2 minutes ago
          if (diffMs < -2 * 60 * 1000) continue

          // Calculate actual minutes until end
          const actualMinutesUntilEnd = Math.max(0, Math.round((endTime.getTime() - now.getTime()) / 60000))

          // Fire now if just passed, otherwise schedule for fireAt
          const actualFireAt = diffMs > 0 ? fireAt : now
          const ctx: MessageContext = { type: "before_end", minutes: diffMs > 0 ? mins : actualMinutesUntilEnd }
          results.push(this.createNotification(rule, task, actualFireAt, ctx, `before-end-${mins}`))
        }
        break
      }

      case "at_start": {
        if (!task.timestamp) break
        const hasTime = this.hasTimePrecision(task)
        if (!hasTime) break

        // Fire if start time is in the future, or just passed (within 2 minutes)
        const diffMs = task.timestamp.getTime() - now.getTime()
        if (diffMs < -2 * 60 * 1000) break // More than 2 minutes ago, skip

        const fireAt = diffMs > 0 ? task.timestamp : now // Fire now if already passed
        const ctx: MessageContext = { type: "at_start" }
        results.push(this.createNotification(rule, task, fireAt, ctx, "at-start"))
        break
      }

      case "morning_of_day": {
        const targetDate = task.type === "deadline" ? (task.endTimestamp ?? task.timestamp) : task.timestamp
        if (!targetDate) break

        // Check if the target date is today or tomorrow (for advance notice)
        const targetDay = startOfDay(targetDate)
        const today = startOfDay(now)

        if (targetDay.getTime() !== today.getTime()) break

        // Fire at morning summary time
        const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
        const fireAt = new Date(today)
        fireAt.setHours(h, m, 0, 0)

        if (fireAt <= now) break

        const ctx: MessageContext = { type: "morning_of_day" }
        const dateKey = targetDay.toISOString().split("T")[0]
        results.push(this.createNotification(rule, task, fireAt, ctx, `morning-${dateKey}`))
        break
      }

      case "days_waiting": {
        if (!task.timestamp) break
        const daysDiff = differenceInDays(startOfDay(now), startOfDay(task.timestamp))
        if (daysDiff < 0) break // Not started yet

        // Check initial days
        for (const days of condition.initialDays) {
          if (daysDiff === days) {
            const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
            const fireAt = new Date(startOfDay(now))
            fireAt.setHours(h, m, 0, 0)

            if (fireAt <= now) break

            const ctx: MessageContext = { type: "days_waiting", days }
            results.push(this.createNotification(rule, task, fireAt, ctx, `waiting-${days}`))
          }
        }

        // Check repeat interval after initial days
        const maxInitial = Math.max(...condition.initialDays)
        if (daysDiff > maxInitial && condition.repeatEvery > 0) {
          const daysSinceMax = daysDiff - maxInitial
          if (daysSinceMax % condition.repeatEvery === 0) {
            const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
            const fireAt = new Date(startOfDay(now))
            fireAt.setHours(h, m, 0, 0)

            if (fireAt <= now) break

            const ctx: MessageContext = { type: "days_waiting", days: daysDiff }
            results.push(this.createNotification(rule, task, fireAt, ctx, `waiting-${daysDiff}`))
          }
        }
        break
      }

      case "cycle_start": {
        if (!task.timestamp || !task.cycleDays) break
        const daysDiff = differenceInDays(startOfDay(now), startOfDay(task.timestamp))
        if (daysDiff < 0) break

        // Check if today is the start of a new cycle
        if (daysDiff % task.cycleDays === 0) {
          const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
          const fireAt = new Date(startOfDay(now))
          fireAt.setHours(h, m, 0, 0)

          if (fireAt <= now) break

          const cycle = Math.floor(daysDiff / task.cycleDays) + 1
          const ctx: MessageContext = {
            type: "cycle_start",
            cycle,
            target: task.cycleTarget ?? 1
          }
          results.push(this.createNotification(rule, task, fireAt, ctx, `cycle-start-${cycle}`))
        }
        break
      }

      case "cycle_ending": {
        if (!task.timestamp || !task.cycleDays) break
        const daysDiff = differenceInDays(startOfDay(now), startOfDay(task.timestamp))
        if (daysDiff < 0) break

        const positionInCycle = daysDiff % task.cycleDays
        const daysUntilCycleEnd = task.cycleDays - positionInCycle - 1

        if (daysUntilCycleEnd === condition.daysBeforeEnd) {
          const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
          const fireAt = new Date(startOfDay(now))
          fireAt.setHours(h, m, 0, 0)

          if (fireAt <= now) break

          const cycle = Math.floor(daysDiff / task.cycleDays) + 1
          const completed = this.getCurrentCycleCompletions(task, now)
          const ctx: MessageContext = {
            type: "cycle_ending",
            cycle,
            completed,
            target: task.cycleTarget ?? 1
          }
          results.push(this.createNotification(rule, task, fireAt, ctx, `cycle-ending-${cycle}`))
        }
        break
      }

      case "overdue": {
        const endTime = task.endTimestamp ?? task.timestamp
        if (!endTime) break

        const endDay = startOfDay(endTime)
        const today = startOfDay(now)
        const daysOverdue = differenceInDays(today, endDay)

        if (daysOverdue < 0) break // Not overdue yet

        // Only notify once per day of being overdue
        const [h, m] = this.settings.morningSummaryTime.split(":").map(Number)
        const fireAt = new Date(today)
        fireAt.setHours(h, m, 0, 0)

        if (fireAt <= now) break

        const ctx: MessageContext = { type: "overdue", days: daysOverdue }
        results.push(this.createNotification(rule, task, fireAt, ctx, `overdue-${daysOverdue}`))
        break
      }
    }

    return results
  }

  /**
   * Resolve condition with user settings
   */
  private resolveCondition(condition: RuleCondition): RuleCondition {
    switch (condition.type) {
      case "before_start":
        return { ...condition, minutes: this.settings.beforeStartMinutes }
      case "before_end":
        return { ...condition, minutes: this.settings.beforeEndMinutes }
      case "days_waiting":
        return {
          ...condition,
          initialDays: this.settings.todoInitialDays,
          repeatEvery: this.settings.todoRepeatEvery
        }
      default:
        return condition
    }
  }

  /**
   * Create a notification instance
   */
  private createNotification(
    rule: NotificationRule,
    task: TaskEntry,
    fireAt: Date,
    context: MessageContext,
    triggerKey: string
  ): ScheduledNotification {
    const id = `${rule.id}:${task.cardId}:${task.pos}:${triggerKey}`
    
    // Get task title with card title as fallback
    const cardTitle = this.cardTitleProvider?.(task.cardId) || "Task"
    const taskTitle = getTaskTitle(task, cardTitle)
    
    // Title = task title, Body = status message
    const body = rule.message(task, context)

    return {
      id,
      ruleId: rule.id,
      taskId: `${task.cardId}:${task.pos}`,
      cardId: task.cardId,
      fireAt,
      title: taskTitle,
      body,
      priority: rule.priority
    }
  }

  /**
   * Fire a notification
   */
  private fireNotification(notif: ScheduledNotification): void {
    if (this.isInDndPeriod()) {
      // Still mark as sent to avoid re-firing
      notificationHistory.markSent(notif.id)
      return
    }

    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification(notif.title, {
        body: notif.body,
        tag: notif.id,
        requireInteraction: notif.priority === "urgent" || notif.priority === "high"
      })

      notification.onclick = () => {
        window.focus()
        // TODO: Navigate to the card
        notification.close()
      }
    }

    notificationHistory.markSent(notif.id)
  }

  /**
   * Check if task has time precision in start
   */
  private hasTimePrecision(task: TaskEntry): boolean {
    return /\d{2}:\d{2}/.test(task.rawText.split(" to ")[0] || task.rawText)
  }

  /**
   * Check if task has time precision in end
   */
  private endHasTimePrecision(task: TaskEntry): boolean {
    const parts = task.rawText.split(" to ")
    if (parts.length < 2) return false
    return /\d{2}:\d{2}/.test(parts[1])
  }

  /**
   * Get completions in current cycle for defer tasks
   */
  private getCurrentCycleCompletions(task: TaskEntry, now: Date): number {
    if (!task.completions || !task.cycleDays) return 0

    const daysSinceStart = differenceInDays(startOfDay(now), startOfDay(task.timestamp))
    if (daysSinceStart < 0) return 0

    const cycleStartOffset = Math.floor(daysSinceStart / task.cycleDays) * task.cycleDays
    const cycleStart = new Date(task.timestamp)
    cycleStart.setDate(cycleStart.getDate() + cycleStartOffset)
    const cycleStartDay = startOfDay(cycleStart)

    return task.completions.filter((c) => {
      const completionDay = startOfDay(c.date)
      return completionDay >= cycleStartDay
    }).length
  }

  // ============ Debug & Test Methods ============

  /**
   * Test notification - fires immediately
   * Usage in console: notificationScheduler.testNotification()
   */
  testNotification(message = "This is a test notification"): void {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("🧪 Test", { body: message })
        console.log("[Notification] Test notification sent")
      } else if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification("🧪 Test", { body: message })
            console.log("[Notification] Test notification sent after permission granted")
          } else {
            console.warn("[Notification] Permission denied")
          }
        })
      } else {
        console.warn("[Notification] Permission denied. Check browser settings.")
      }
    } else {
      console.error("[Notification] Not supported in this environment")
    }
  }

  /**
   * Debug: show current state
   */
  debug(): void {
    console.group("[NotificationScheduler Debug]")
    console.log("Settings:", this.settings)
    console.log("Scheduled timers:", this.scheduledTimers.size)
    console.log("Task provider:", this.taskProvider ? "set" : "not set")
    console.log("Notification permission:", "Notification" in window ? Notification.permission : "N/A")
    console.log("History initialized:", notificationHistory.isInitialized())
    console.log("History entries:", notificationHistory.getAll().length)

    if (this.taskProvider) {
      const tasks = this.taskProvider()
      console.log("Total tasks:", tasks.length)
      console.log("Tasks with time:", tasks.filter((t) => this.hasTimePrecision(t)).length)
    }
    console.groupEnd()
  }

  /**
   * Debug: manually trigger check and show what would be scheduled
   */
  debugCheck(): void {
    if (!this.taskProvider) {
      console.error("[Notification] Task provider not set")
      return
    }

    const tasks = this.taskProvider()
    const now = new Date()

    console.group(`[NotificationScheduler] Check at ${now.toLocaleTimeString()}`)
    console.log(`Checking ${tasks.length} tasks...`)

    for (const task of tasks) {
      if (task.type === "done") continue

      for (const rule of this.rules) {
        if (!this.isRuleEnabled(rule)) continue
        if (!rule.taskTypes.includes(task.type)) continue

        const notifications = this.generateNotifications(rule, task, now)
        for (const notif of notifications) {
          const wasSent = notificationHistory.wasSent(notif.id)
          const isScheduled = this.scheduledTimers.has(notif.id)
          const delay = notif.fireAt.getTime() - now.getTime()

          console.log(`  [${rule.id}] "${notif.body}"`)
          console.log(`    Fire at: ${notif.fireAt.toLocaleTimeString()} (in ${Math.round(delay / 1000)}s)`)
          console.log(`    Status: ${wasSent ? "SENT" : isScheduled ? "SCHEDULED" : delay <= 0 ? "FIRE NOW" : "PENDING"}`)
        }
      }
    }
    console.groupEnd()
  }
}

export const notificationScheduler = new NotificationScheduler()

// Expose to window for console debugging
if (typeof window !== "undefined") {
  ;(window as any).notificationScheduler = notificationScheduler
}
