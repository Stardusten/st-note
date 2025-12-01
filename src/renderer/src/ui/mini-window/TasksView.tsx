import { Component, createSignal, For, Show } from "solid-js"
import { TextField, TextFieldInput } from "@renderer/ui/solidui/text-field"
import { MoreHorizontal, Search } from "lucide-solid"
import { CircleX } from "@renderer/icons"
import { Checkbox } from "@renderer/ui/solidui/checkbox"
import { formatDateTime } from "@renderer/lib/common/utils/datetime"

const SearchBar: Component<{ value: string; onChange: (e: string) => void }> = (props) => {
  return (
    <div class="bg-muted px-2 pb-2 pt-1 border-b">
      <TextField class="flex items-center">
        <Search class="absolute left-4 size-4 text-muted-foreground" />
        <TextFieldInput
          placeholder="Search"
          class="h-[26px] rounded bg-background indent-4 text-[13px] placeholder:text-[13px]"
          value={props.value}
          onInput={(e) => props.onChange((e.target as HTMLInputElement).value)}
        />
        <CircleX class="absolute right-4 size-3.5 text-muted-foreground/70" />
      </TextField>
    </div>
  )
}

const TaskRow: Component<{ task: Task; temp?: boolean }> = (props) => {
  const showDeadline = () => !!props.task.deadline
  const showSchedule = () => !!props.task.schedule

  return (
    <Show when={!props.temp || props.task.title.trim().length > 0}>
      <div
        class="flex flex-col"
        classList={{
          "opacity-50 hover:opacity-80 transition-opacity cursor-pointer": props.temp
        }}>
        <div class="flex items-center gap-2 justify-between h-[24px]">
          <div class="flex items-center gap-2">
            <Checkbox checked={props.task.checked} />
            <div class="text-sm" classList={{ italic: props.temp }}>
              {props.task.title}
            </div>
          </div>
          <div>
            <For each={props.task.tags}>
              {(tag) => <span class="text-xs text-muted-foreground/80 px-1">#{tag}</span>}
            </For>
          </div>
        </div>
        <Show when={showDeadline() || showSchedule()}>
          <div class="pl-6">
            <Show when={props.task.deadline}>
              <div class="text-xs text-primary/80">
                deadline: {formatDateTime(props.task.deadline!)}
              </div>
            </Show>
            <Show when={props.task.schedule}>
              <div class="text-xs text-primary/80">
                schedule: {formatDateTime(props.task.schedule!)}
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </Show>
  )
}

const BottomStatusBar: Component = () => {
  return (
    <div class="bg-muted h-[28px] border-t flex items-center justify-between px-3">
      <div class="text-[12px] text-foreground/70">
        Page 1 of 3
        <span class="text-muted-foreground/60"> | Enter: Open Editor | Tab: Toggle Preview...</span>
      </div>
      <MoreHorizontal class="size-4 text-muted-foreground" />
    </div>
  )
}

const TasksView: Component = () => {
  const tasks: Task[] = [
    {
      title: "排查 st-note fuzzy search 性能问题",
      tags: ["st-note", "性能优化"],
      checked: false,
      deadline: new Date("2025-12-04")
    },
    { title: "学习 Golang 类型断言", tags: ["Golang"], checked: true },
    {
      title: "修复 Loro 在 macOS 上的编译问题",
      tags: ["Loro"],
      checked: false,
      deadline: new Date("2025-12-01")
    },
    {
      title: "学习 React 19 的新特性",
      tags: ["React"],
      checked: false
    },
    {
      title: "优化 st-note 的搜索算法",
      tags: ["st-note", "性能优化"],
      checked: true
    },
    {
      title: "学习 Python 的异步编程",
      tags: ["Python"],
      checked: false
    },
    {
      title: "修复 Loro 在 Windows 上的编译问题",
      tags: ["Loro"],
      checked: false
    },
    { title: "学习 Rust 的并发编程", tags: ["Rust"], checked: false },
    { title: "学习 Vue 3 的新特性", tags: ["Vue"], checked: false },
    {
      title: "学习 Angular 的新特性",
      tags: ["Angular"],
      checked: false,
      schedule: new Date("2025-12-08T10:00:00")
    },
    {
      title: "学习 Svelte 的新特性",
      tags: ["Svelte"],
      checked: false
    }
  ]
  const [tmpTask, setTmpTask] = createSignal({ title: "", tags: [], checked: false })

  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <SearchBar
        value={tmpTask().title}
        onChange={(title) => setTmpTask({ ...tmpTask(), title })}
      />
      <div class="flex flex-col flex-1 px-3 py-2 overflow-y-auto">
        <TaskRow task={tmpTask()} temp />
        <For each={tasks}>{(task) => <TaskRow task={task} />}</For>
      </div>
      <BottomStatusBar />
    </div>
  )
}

export default TasksView
