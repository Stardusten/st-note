import { Component } from "solid-js"

const CardBacklinkEditor: Component = () => {
  return (
    <div
      class="p-[16px] w-full min-h-[60px] rounded-md"
      style={{
        "box-shadow":
          "rgba(0, 0, 0, 0.12) 0px 1px 10px, rgba(0, 0, 0, 0.14) 0px 4px 5px, rgba(0, 0, 0, 0.2) 0px 2px 4px -1px",
        background:
          "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        border: "0.5px solid transparent"
      }}>
      <div class="text-sm">
        比如作为一个后端开发，我经常用 Cmd-L 打开 Lazy capture，然后输入 “[[某个需求]] 客户要求
        xxxx” 记录一个需求的最新进展。那么在 [[某个需求]] 这个笔记的 Connections
        里，时间线视图就能让我看到这个需求从被提出至今的整个生命周期。
        <div class="text-muted-foreground text-xs mt-2 text-right">Nov 30</div>
      </div>
    </div>
  )
}

export default CardBacklinkEditor
