import { Component, For, Show, createSignal, onCleanup, onMount } from "solid-js"
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns"
import { appStore } from "@renderer/lib/state/AppStore"
import { TASK_CONFIG, type TaskEntry } from "@renderer/lib/task/types"
import { getTaskTitle } from "@renderer/lib/task/utils"
import type { TaskGroup } from "@renderer/lib/task/TaskIndex"
import { getCurrentCycleCompletions } from "@renderer/lib/task/parser"

type AgendaViewProps = {
  onTaskClick: (cardId: string, pos: number) => void
}

/**
 * Check if a task has time precision (HH:mm in the timestamp)
 */
function hasTimePrecision(task: TaskEntry): boolean {
  return /\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(task.rawText)
}

/**
 * Check if end timestamp has time precision
 */
function endHasTimePrecision(task: TaskEntry): boolean {
  return /to\s+(?:\d{4}-\d{2}-\d{2}\s+)?(\d{2}:\d{2})/.test(task.rawText)
}

/**
 * Check if a range task is currently in progress.
 * - For time-precise ranges: now is between start and end timestamps
 * - For date-only ranges: today is between start and end dates
 */
function isInProgress(task: TaskEntry, now: Date): boolean {
  if (!task.endTimestamp) return false

  const startHasTime = hasTimePrecision(task)
  const endHasTime = endHasTimePrecision(task)

  if (startHasTime || endHasTime) {
    // Time-precise comparison
    return now >= task.timestamp && now <= task.endTimestamp
  } else {
    // Date-only comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startDate = new Date(task.timestamp.getFullYear(), task.timestamp.getMonth(), task.timestamp.getDate())
    const endDate = new Date(task.endTimestamp.getFullYear(), task.endTimestamp.getMonth(), task.endTimestamp.getDate())
    return today >= startDate && today <= endDate
  }
}

/**
 * Get extra info for each task type based on howm semantics
 */
function getTaskExtraInfo(task: TaskEntry, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const taskDate = new Date(task.timestamp.getFullYear(), task.timestamp.getMonth(), task.timestamp.getDate())
  const daysDiff = differenceInDays(taskDate, today) // positive = future, negative = past

  // For range tasks, also consider end date
  const endDate = task.endTimestamp
    ? new Date(task.endTimestamp.getFullYear(), task.endTimestamp.getMonth(), task.endTimestamp.getDate())
    : null
  const endDaysDiff = endDate ? differenceInDays(endDate, today) : null

  switch (task.type) {
    case "schedule": {
      // Check if in progress (works for both time-precise and date-only)
      if (task.endTimestamp && isInProgress(task, now)) {
        const startHasTime = hasTimePrecision(task)
        const endHasTime = endHasTimePrecision(task)

        if (startHasTime || endHasTime) {
          // Time-precise: show remaining time
          const minutesLeft = differenceInMinutes(task.endTimestamp, now)
          if (minutesLeft <= 60) return `in progress · ${minutesLeft} min left`
          const hoursLeft = Math.floor(minutesLeft / 60)
          return `in progress · ${hoursLeft} hr left`
        } else {
          // Date-only multi-day: show day progress
          const totalDays = endDaysDiff! - daysDiff + 1
          const elapsed = -daysDiff + 1
          return `in progress ${elapsed}/${totalDays}`
        }
      }

      // Not in progress - show relative info
      if (endDaysDiff !== null && taskDate.getTime() !== endDate!.getTime()) {
        if (daysDiff > 0) return `starts in ${daysDiff} days`
        if (endDaysDiff < 0) return `ended ${-endDaysDiff} days ago`
      }

      // Single date or same-day range (not currently in progress)
      if (task.endTimestamp && hasTimePrecision(task)) {
        // Same day with time - check if upcoming or past
        if (now < task.timestamp) {
          const minutesUntil = differenceInMinutes(task.timestamp, now)
          if (minutesUntil <= 60) return `in ${minutesUntil} min`
          const hoursUntil = Math.floor(minutesUntil / 60)
          return `in ${hoursUntil} hr`
        }
        if (now > task.endTimestamp) {
          return "ended"
        }
      }

      if (daysDiff === 0) return "today"
      if (daysDiff === 1) return "tomorrow"
      if (daysDiff === 2) return "in 2 days"
      if (daysDiff === -1) return "yesterday"
      if (daysDiff > 0) return `in ${daysDiff} days`
      return `${-daysDiff} days ago`
    }

    case "todo": {
      if (daysDiff > 0) return `starts in ${daysDiff} days`
      if (daysDiff === 0) return "starts today"
      const waitDays = -daysDiff
      if (waitDays >= 14) return `waiting ${Math.floor(waitDays / 7)} weeks`
      return `waiting ${waitDays} days`
    }

    case "deadline": {
      // Use end date as deadline if range
      const deadlineDiff = endDaysDiff ?? daysDiff
      if (deadlineDiff < 0) return `${-deadlineDiff} days overdue`
      if (deadlineDiff === 0) {
        const hoursLeft = differenceInHours(task.endTimestamp ?? task.timestamp, now)
        if (hoursLeft > 0) return `${hoursLeft} hr left`
        if (hoursLeft === 0) return "due now"
        return "overdue"
      }
      if (deadlineDiff === 1) return "due tomorrow"
      return `${deadlineDiff} days left`
    }

    case "reminder": {
      if (daysDiff > 0) return `in ${daysDiff} days`
      if (daysDiff === 0) return "today"
      const daysPassed = -daysDiff
      return `${daysPassed} days ago`
    }

    case "defer": {
      if (daysDiff > 0) return `starts in ${daysDiff} days`
      const cycleDays = task.cycleDays || 30
      const cycleTarget = task.cycleTarget || 1
      const daysSinceStart = -daysDiff
      const currentCycle = Math.floor(daysSinceStart / cycleDays) + 1
      const cycleCompletions = getCurrentCycleCompletions(task, now)
      const totalCompletions = task.completions?.length || 0

      // Daily task (cycleDays=1): just show total completions
      if (cycleDays === 1) {
        if (totalCompletions > 0) {
          return `${totalCompletions} done`
        }
        return "not done"
      }

      if (cycleTarget > 1) {
        // Multi-target per cycle
        if (totalCompletions > 0) {
          return `cycle ${currentCycle} · ${cycleCompletions}/${cycleTarget} · ${totalCompletions} total`
        }
        return `cycle ${currentCycle} · ${cycleCompletions}/${cycleTarget}`
      } else {
        // Single target per cycle
        if (totalCompletions > 0) {
          return `cycle ${currentCycle} · ${totalCompletions} done`
        }
        const positionInCycle = (daysSinceStart % cycleDays) + 1
        return `cycle ${currentCycle} · day ${positionInCycle}/${cycleDays}`
      }
    }

    case "done": {
      if (daysDiff === 0) return "done today"
      if (daysDiff < 0) return `${-daysDiff} days ago`
      return ""
    }

    default:
      return ""
  }
}

const AgendaView: Component<AgendaViewProps> = (props) => {
  const groups = appStore.getGroupedTasks()

  // Reactive current time - updates every minute for time-sensitive display
  const [now, setNow] = createSignal(new Date())

  onMount(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60_000) // Update every minute

    onCleanup(() => clearInterval(timer))
  })

  const formatTaskTime = (task: TaskEntry) => {
    // Check if rawText contains time part (HH:mm)
    const startHasTime = hasTimePrecision(task)
    const startFmt = format(task.timestamp, startHasTime ? "MM-dd HH:mm" : "MM-dd")

    // Handle range display
    if (task.endTimestamp) {
      const endHasTime = endHasTimePrecision(task)
      const sameDay =
        task.timestamp.getFullYear() === task.endTimestamp.getFullYear() &&
        task.timestamp.getMonth() === task.endTimestamp.getMonth() &&
        task.timestamp.getDate() === task.endTimestamp.getDate()

      if (sameDay && endHasTime) {
        // Same day: show "MM-dd HH:mm-HH:mm"
        return `${startFmt}-${format(task.endTimestamp, "HH:mm")}`
      } else if (!sameDay) {
        // Different days: show "MM-dd ~ MM-dd"
        const endFmt = format(task.endTimestamp, endHasTime ? "MM-dd HH:mm" : "MM-dd")
        return `${startFmt} ~ ${endFmt}`
      }
    }

    return startFmt
  }

  const getCardTitle = (cardId: string) => {
    return appStore.getCardTitle(cardId)() || "Untitled"
  }

  const handleClick = (task: TaskEntry) => {
    props.onTaskClick(task.cardId, task.pos)
  }

  const getTaskSuffix = (task: TaskEntry) => {
    if (task.type === "defer" && task.cycleDays) {
      const target = task.cycleTarget || 1
      if (target > 1) {
        return `~${task.cycleDays}x${target}`
      }
      return `~${task.cycleDays}`
    }
    return TASK_CONFIG[task.type].symbol
  }

  /** Get task display title: use shared util with card title as fallback */
  const getDisplayTitle = (task: TaskEntry) => {
    return getTaskTitle(task, getCardTitle(task.cardId))
  }

  return (
    <div class="flex-1 overflow-y-auto min-h-0 text-xs">
      <Show when={groups().length === 0}>
        <div class="p-4 text-muted-foreground text-center">No tasks</div>
      </Show>
      <For each={groups()}>
        {(group: TaskGroup) => (
          <div>
            <div class="sticky top-0 px-2 py-1 text-[10px] font-medium text-muted-foreground bg-muted/50 border-b border-border/40">
              {group.label}
            </div>
            <For each={group.tasks}>
              {(task: TaskEntry) => (
                <div
                  class="flex items-center gap-2 px-2 py-1.5 border-b border-border/40 cursor-pointer hover:bg-muted/30"
                  classList={{ "bg-primary/5 border-l-2 border-l-primary": isInProgress(task, now()) }}
                  onClick={() => handleClick(task)}>
                  <span class="shrink-0" style={{ color: TASK_CONFIG[task.type].color }}>
                    {formatTaskTime(task)}
                  </span>
                  <span class="text-muted-foreground text-[10px] font-mono shrink-0">
                    {getTaskSuffix(task)}
                  </span>
                  <span class="text-foreground truncate flex-1">{getDisplayTitle(task)}</span>
                  <span class="text-muted-foreground text-[10px] shrink-0">{getTaskExtraInfo(task, now())}</span>
                </div>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  )
}

export default AgendaView
