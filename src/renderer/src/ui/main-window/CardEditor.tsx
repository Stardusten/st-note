import { Component } from "solid-js"
import "./card-editor.css"
import {
  Command,
  Image,
  Inbox,
  Link,
  Pin,
  Smile,
  SquareArrowRight,
  WandSparkles
} from "lucide-solid"
import { Button } from "../solidui/button"

const CardMainEditor: Component = () => {
  return (
    <div
      class="h-[500px] w-full card-editor pt-[68px]"
      style={{
        color: "rgb(217, 217, 217)",
        transition: "box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms",
        "border-radius": "8px",
        position: "relative",
        border: "0.5px solid transparent",
        "box-shadow": "rgba(4, 4, 7, 0.25) 0px 2px 2px, rgba(4, 4, 7, 0.4) 0px 8px 24px",
        "min-height": "401px",
        background:
          "radial-gradient(100% 210px at center top, rgb(49, 49, 53) 30px, rgb(49, 49, 53) -300%, rgb(31, 32, 36) 780px) padding-box padding-box, linear-gradient(94.85deg, rgb(140, 140, 147) 0.63%, rgb(63, 63, 67) 100%) border-box border-box",
        overflow: "visible"
      }}>
      <div class="h-[28px] pl-[56px] text-sm flex flex-row gap-2">
        <Button variant="ghost" size="sm">
          <Smile class="size-4" />
          <span>Add emoji</span>
        </Button>
        <Button variant="ghost" size="sm">
          <Image class="size-4" />
          <span>Add cover</span>
        </Button>
      </div>
      <div class=" px-[64px] pb-[68px]">
        <div
          style={{
            "font-size": "29px",
            "font-family":
              "var(--font-inter),Inter-Regular,-apple-system,BlinkMacSystemFont,'Segoe UI','Roboto','Oxygen','Ubuntu','Cantarell','Fira Sans','Droid Sans','Helvetica Neue',sans-serif",
            "border-bottom": "1px solid rgb(27, 27, 29)",
            "box-shadow": "rgba(72, 73, 75, 0.84) 0px 1px 0px",
            "margin-bottom": "18px",
            "margin-top": "2px"
          }}>
          Another Lazy
        </div>
        <div class="absolute top-0 right-0 p-6 flex flex-row gap-2">
          <Button variant="ghost" size="xs-icon">
            <Link class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <WandSparkles class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <Inbox class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <Pin class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <SquareArrowRight class="size-4 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="xs-icon">
            <Command class="size-4 stroke-[1.5]" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default CardMainEditor
