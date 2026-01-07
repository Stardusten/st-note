import type { NotificationRule } from "./types"

/**
 * Default notification rules
 * Note: `message` returns status info only (title is shown separately in notification title)
 */
export const defaultRules: NotificationRule[] = [
  // ============ Schedule ============
  {
    id: "schedule-before-start",
    name: "Schedule: Before Start",
    taskTypes: ["schedule"],
    condition: { type: "before_start", minutes: [15, 5, 2, 1] },
    message: (_task, ctx) => {
      if (ctx.type !== "before_start") return ""
      if (ctx.minutes <= 0) return "starting now"
      return `starts in ${ctx.minutes} min`
    },
    priority: "high",
    enabledByDefault: true
  },
  {
    id: "schedule-at-start",
    name: "Schedule: At Start",
    taskTypes: ["schedule"],
    condition: { type: "at_start" },
    message: () => "starting now",
    priority: "high",
    enabledByDefault: true
  },
  {
    id: "schedule-morning",
    name: "Schedule: Morning Reminder",
    taskTypes: ["schedule"],
    condition: { type: "morning_of_day" },
    message: () => "scheduled for today",
    priority: "normal",
    enabledByDefault: true
  },

  // ============ Deadline ============
  {
    id: "deadline-before-end",
    name: "Deadline: Before Due",
    taskTypes: ["deadline"],
    condition: { type: "before_end", minutes: [15, 5, 2, 1] },
    message: (_task, ctx) => {
      if (ctx.type !== "before_end") return ""
      if (ctx.minutes <= 0) return "due now"
      return `due in ${ctx.minutes} min`
    },
    priority: "urgent",
    enabledByDefault: true
  },
  {
    id: "deadline-morning-today",
    name: "Deadline: Due Today",
    taskTypes: ["deadline"],
    condition: { type: "morning_of_day" },
    message: () => "due today",
    priority: "high",
    enabledByDefault: true
  },
  {
    id: "deadline-overdue",
    name: "Deadline: Overdue",
    taskTypes: ["deadline"],
    condition: { type: "overdue" },
    message: (_task, ctx) => {
      if (ctx.type !== "overdue") return ""
      if (ctx.days === 0) return "now overdue"
      return `${ctx.days} day${ctx.days > 1 ? "s" : ""} overdue`
    },
    priority: "urgent",
    enabledByDefault: true
  },

  // ============ Reminder ============
  {
    id: "reminder-morning",
    name: "Reminder: Morning",
    taskTypes: ["reminder"],
    condition: { type: "morning_of_day" },
    message: () => "reminder for today",
    priority: "normal",
    enabledByDefault: true
  },

  // ============ Defer (Recurring) ============
  {
    id: "defer-cycle-start",
    name: "Defer: Cycle Start",
    taskTypes: ["defer"],
    condition: { type: "cycle_start" },
    message: (_task, ctx) => {
      if (ctx.type !== "cycle_start") return ""
      if (ctx.target > 1) return `new cycle (0/${ctx.target})`
      return "new cycle started"
    },
    priority: "normal",
    enabledByDefault: true
  },
  {
    id: "defer-cycle-ending",
    name: "Defer: Cycle Ending",
    taskTypes: ["defer"],
    condition: { type: "cycle_ending", daysBeforeEnd: 1 },
    message: (_task, ctx) => {
      if (ctx.type !== "cycle_ending") return ""
      return `cycle ends tomorrow (${ctx.completed}/${ctx.target})`
    },
    priority: "high",
    enabledByDefault: true
  },

  // ============ Todo ============
  {
    id: "todo-waiting",
    name: "Todo: Waiting Reminder",
    taskTypes: ["todo"],
    condition: { type: "days_waiting", initialDays: [3, 7, 14], repeatEvery: 7 },
    message: (_task, ctx) => {
      if (ctx.type !== "days_waiting") return ""
      if (ctx.days >= 14) {
        const weeks = Math.floor(ctx.days / 7)
        return `waiting ${weeks} week${weeks > 1 ? "s" : ""}`
      }
      return `waiting ${ctx.days} day${ctx.days > 1 ? "s" : ""}`
    },
    priority: "normal",
    enabledByDefault: true
  }
]

/**
 * Get rule by ID
 */
export function getRuleById(id: string): NotificationRule | undefined {
  return defaultRules.find((r) => r.id === id)
}

/**
 * Get rules for a specific task type
 */
export function getRulesForTaskType(taskType: string): NotificationRule[] {
  return defaultRules.filter((r) => r.taskTypes.includes(taskType as any))
}
