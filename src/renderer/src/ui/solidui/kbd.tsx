import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { cn } from "@renderer/lib/common/utils/tailwindcss"

const Kbd: Component<ComponentProps<"kbd">> = (props) => {
  const [local, others] = splitProps(props, ["class", "style"])
  return (
    <span class="min-w-[20px] h-[20px] box-border bg-[#1a1b1f] rounded-[4px] inline-flex justify-center items-center border border-[#323338] shadow-[0_1px_0_0_rgba(26,27,31,1)]">
      <kbd
        class={cn(
          "mx-0 my-0 px-[3px] py-0 font-sans text-xs font-normal leading-[1.125rem] not-italic tracking-normal normal-case text-[rgb(217,217,217)]",
          local.class
        )}
        style={local.style}
        {...others}
      />
    </span>
  )
}

export default Kbd
