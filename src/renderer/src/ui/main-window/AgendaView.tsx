import { Component, For, Show } from "solid-js"
import { format } from "date-fns"
import { appStore } from "@renderer/lib/state/AppStore"
import type { TaskEntry, TaskType } from "@renderer/lib/task/types"
import type { TaskGroup } from "@renderer/lib/task/TaskIndex"

const TASK_TYPE_LABELS: Record<TaskType, string> = {
  reminder: "Reminder",
  deadline: "Deadline",
  scheduled: "Scheduled",
  done: "Done",
  memo: "Memo"
}

const TASK_TYPE_CLASSES: Record<TaskType, string> = {
  reminder: "text-[#63b3ed]",
  deadline: "text-[#f56565]",
  scheduled: "text-[#48bb78]",
  done: "text-[#a0aec0] line-through",
  memo: "text-[#ed8936]"
}

type AgendaViewProps = {
  onTaskClick: (cardId: string, pos: number) => void
}

const AgendaView: Component<AgendaViewProps> = (props) => {
  const groups = appStore.getGroupedTasks()

  const formatTaskTime = (task: TaskEntry) => {
    return format(task.timestamp, "MM-dd HH:mm")
  }

  const getCardTitle = (cardId: string) => {
    return appStore.getCardTitle(cardId)() || "Untitled"
  }

  const handleClick = (task: TaskEntry) => {
    props.onTaskClick(task.cardId, task.pos)
  }

  return (
    <div class="flex-1 overflow-y-auto min-h-0 text-xs">
      <Show when={groups().length === 0}>
        <div class="p-4 text-muted-foreground text-center">No tasks</div>
      </Show>
      <For each={groups()}>
        {(group: TaskGroup) => (
          <div class="mb-2">
            <div class="sticky top-0 px-2 py-1 text-[10px] font-medium text-muted-foreground bg-surface/95 border-b border-border/40">
              {group.label}
            </div>
            <For each={group.tasks}>
              {(task: TaskEntry) => (
                <div
                  class="flex flex-col gap-0.5 px-2 py-1.5 border-b border-border/40 cursor-pointer hover:bg-muted/30"
                  onClick={() => handleClick(task)}>
                  <div class="flex items-center gap-2">
                    <span class={`shrink-0 ${TASK_TYPE_CLASSES[task.type]}`}>
                      {formatTaskTime(task)}
                    </span>
                    <span class="text-muted-foreground text-[10px]">
                      {TASK_TYPE_LABELS[task.type]}
                      {task.type === "reminder" && task.reminderDays ? ` +${task.reminderDays}` : ""}
                    </span>
                  </div>
                  <div class="text-foreground truncate">{getCardTitle(task.cardId)}</div>
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
