import type { TaskEntry, TaskType } from "../task/types"

/**
 * Notification rule condition types (discriminated union / sum type)
 */
export type RuleCondition =
  | { type: "before_start"; minutes: number[] }
  | { type: "before_end"; minutes: number[] }
  | { type: "at_start" }
  | { type: "at_end" }
  | { type: "morning_of_day" }
  | { type: "days_waiting"; initialDays: number[]; repeatEvery: number }
  | { type: "cycle_start" }
  | { type: "cycle_ending"; daysBeforeEnd: number }
  | { type: "overdue" }

/**
 * Context passed to message generator based on condition type
 */
export type MessageContext =
  | { type: "before_start"; minutes: number }
  | { type: "before_end"; minutes: number }
  | { type: "at_start" }
  | { type: "at_end" }
  | { type: "morning_of_day" }
  | { type: "days_waiting"; days: number }
  | { type: "cycle_start"; cycle: number; target: number }
  | { type: "cycle_ending"; cycle: number; completed: number; target: number }
  | { type: "overdue"; days: number }

/**
 * Notification priority levels
 */
export type NotificationPriority = "low" | "normal" | "high" | "urgent"

/**
 * A notification rule definition
 */
export interface NotificationRule {
  /** Unique rule identifier */
  id: string
  /** Human-readable rule name */
  name: string
  /** Task types this rule applies to */
  taskTypes: TaskType[]
  /** Condition that triggers the notification */
  condition: RuleCondition
  /** Generate notification status message (title is shown separately) */
  message: (task: TaskEntry, context: MessageContext) => string
  /** Notification priority */
  priority: NotificationPriority
  /** Whether this rule is enabled by default */
  enabledByDefault: boolean
}

/**
 * A scheduled notification instance
 */
export interface ScheduledNotification {
  /** Unique notification ID (rule_id + task_id + trigger_key) */
  id: string
  /** Rule that generated this notification */
  ruleId: string
  /** Task that triggered this notification */
  taskId: string
  /** Card ID containing the task */
  cardId: string
  /** When to fire the notification */
  fireAt: Date
  /** Notification title */
  title: string
  /** Notification body */
  body: string
  /** Priority */
  priority: NotificationPriority
}

/**
 * Record of a sent notification (to avoid duplicates)
 */
export interface NotificationHistoryEntry {
  /** Same as ScheduledNotification.id */
  id: string
  /** When the notification was sent */
  sentAt: Date
}

/**
 * User-configurable notification settings
 */
export interface NotificationSettings {
  /** Master switch */
  enabled: boolean
  /** Do not disturb start time (HH:mm) */
  dndStart: string
  /** Do not disturb end time (HH:mm) */
  dndEnd: string
  /** Morning summary time (HH:mm), empty to disable */
  morningSummaryTime: string
  /** Minutes before start for schedule/deadline (configurable) */
  beforeStartMinutes: number[]
  /** Minutes before end for deadline (configurable) */
  beforeEndMinutes: number[]
  /** Todo reminder: initial days */
  todoInitialDays: number[]
  /** Todo reminder: repeat interval after initial */
  todoRepeatEvery: number
  /** Per-rule enable/disable overrides */
  ruleOverrides: Record<string, boolean>
}

/**
 * Default notification settings
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  dndStart: "22:00",
  dndEnd: "08:00",
  morningSummaryTime: "08:00",
  beforeStartMinutes: [15, 5, 2, 1],
  beforeEndMinutes: [15, 5, 2, 1],
  todoInitialDays: [3, 7, 14],
  todoRepeatEvery: 7,
  ruleOverrides: {}
}
