import { Component, For } from "solid-js"
import { TextField, TextFieldInput } from "@renderer/ui/solidui/text-field"
import { MoreHorizontal, Search } from "lucide-solid"
import { CircleX } from "@renderer/icons"

const SearchBar: Component = () => {
  return (
    <div class="bg-muted px-2 pb-2 pt-1 border-b">
      <TextField class="flex items-center">
        <Search class="absolute left-4 size-4 text-muted-foreground" />
        <TextFieldInput
          placeholder="Search"
          class="h-[26px] rounded bg-background indent-4 text-[13px] placeholder:text-[13px]"
        />
        <CircleX class="absolute right-4 size-3.5 text-muted-foreground/70" />
      </TextField>
    </div>
  )
}

const SearchResults: Component = () => {
  const notes = [
    {
      title: "New Note 1",
      tags: ["重要", "待办", "项目A"]
    },
    {
      title: "New Note 2",
      tags: ["灵感", "学习"]
    },
    {
      title: "New Note 3",
      tags: ["会议", "紧急", "文档", "纪要"]
    },
    {
      title: "New Note 4",
      tags: ["草稿", "想法"]
    },
    {
      title: "New Note 5",
      tags: ["回顾", "计划", "未来"]
    },
    {
      title: "New Note 6",
      tags: ["工作", "进展", "报告"]
    },
    {
      title: "New Note 7",
      tags: ["设计", "原型", "UI/UX"]
    },
    {
      title: "New Note 8",
      tags: ["代码"]
    },
    {
      title: "New Note 9",
      tags: ["测试", "发布", "部署"]
    },
    {
      title: "New Note 10",
      tags: ["客户", "反馈", "需求"]
    },
    {
      title: "New Note 11",
      tags: ["营销", "策略"]
    },
    {
      title: "New Note 12",
      tags: ["财务", "预算", "报销", "发票"]
    },
    {
      title: "New Note 13",
      tags: ["招聘", "面试"]
    },
    {
      title: "New Note 14",
      tags: ["培训", "技能", "发展"]
    },
    {
      title: "New Note 15",
      tags: ["健康", "运动", "饮食"]
    },
    {
      title: "New Note 16",
      tags: ["旅行"]
    },
    {
      title: "New Note 17",
      tags: ["阅读", "书籍", "摘要"]
    },
    {
      title: "New Note 18",
      tags: ["电影", "音乐"]
    },
    {
      title: "New Note 19",
      tags: ["日记", "感悟", "随笔"]
    },
    {
      title: "New Note 20",
      tags: ["其他", "杂项"]
    }
  ]
  const focusIndex = 2

  return (
    <div class="flex flex-row flex-1 overflow-hidden">
      <div class="flex-1 overflow-y-auto">
        <div class="h-[3px]"></div>
        <For each={notes}>
          {(note, index) => (
            <div
              class="text-[13px] px-2 py-[1px] flex justify-between"
              classList={{ "bg-muted": index() === focusIndex }}>
              <div>{note.title}</div>
              <div class="flex gap-[4px]">
                <For each={note.tags}>
                  {(tag) => <span class="text-xs text-muted-foreground/80">#{tag}</span>}
                </For>
              </div>
            </div>
          )}
        </For>
        <div class="h-[3px]"></div>
      </div>
      <div class="flex-1 overflow-y-auto border-l">Preview</div>
    </div>
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

const SearchView: Component = () => {
  return (
    <div class="flex flex-col flex-1 overflow-hidden">
      <SearchBar />
      <SearchResults />
      <BottomStatusBar />
    </div>
  )
}

export default SearchView
