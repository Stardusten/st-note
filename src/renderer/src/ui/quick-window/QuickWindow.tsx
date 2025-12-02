import { Component } from "solid-js"
import CardMainEditor from "../main-window/CardEditor"
import { Button } from "../solidui/button"
import { Inbox } from "lucide-solid"

const QuickWindow: Component = () => {
  return (
    <div class="p-4 h-full">
      <div
        class="absolute h-full w-full left-0 top-0"
        style={{
          background:
            "linear-gradient(138.16deg, rgb(49, 49, 53) -14.83%, rgb(31, 32, 36) 92.59%) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box"
        }}></div>
      <div class="relative">
        <CardMainEditor />
        <div class="p-2 flex flex-row justify-between items-center">
          <div class="text-sm text-foreground flex flex-row items-center gap-2">
            <Inbox class="size-4 stroke-[1.5px]" />
            Notes Inbox
          </div>
          <Button variant="outline">Capture</Button>
        </div>
      </div>
    </div>
  )
}

export default QuickWindow
