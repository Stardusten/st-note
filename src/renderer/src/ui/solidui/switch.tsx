import type { JSX, ValidComponent } from "solid-js"
import { splitProps } from "solid-js"

import type { PolymorphicProps } from "@kobalte/core"
import * as SwitchPrimitive from "@kobalte/core/switch"

import { cn } from "@renderer/lib/common/utils/tailwindcss"

const Switch = (props: SwitchPrimitive.SwitchRootProps & { class?: string }) => {
  const [local, others] = splitProps(props, ["class"])
  return <SwitchPrimitive.Root class={cn("data-[checked]:scale-87", local.class)} {...others} />
}
const SwitchDescription = SwitchPrimitive.Description
const SwitchErrorMessage = SwitchPrimitive.ErrorMessage

type SwitchControlProps = SwitchPrimitive.SwitchControlProps & {
  class?: string | undefined
  children?: JSX.Element
}

const SwitchControl = <T extends ValidComponent = "input">(
  props: PolymorphicProps<T, SwitchControlProps>
) => {
  const [local, others] = splitProps(props as SwitchControlProps, ["class", "children"])
  return (
    <>
      <SwitchPrimitive.Input
        class={cn(
          "[&:focus-visible+div]:outline-none [&:focus-visible+div]:ring-2 [&:focus-visible+div]:ring-ring [&:focus-visible+div]:ring-offset-2 [&:focus-visible+div]:ring-offset-background",
          local.class
        )}
      />
      <SwitchPrimitive.Control
        class={cn(
          "inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-[#323338] transition-all outline-none",
          "bg-[#1a1b1f] data-[checked]:bg-primary data-[checked]:border-primary",
          "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
          local.class
        )}
        {...others}>
        {local.children}
      </SwitchPrimitive.Control>
    </>
  )
}

type SwitchThumbProps = SwitchPrimitive.SwitchThumbProps & {
  class?: string | undefined
}

const SwitchThumb = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, SwitchThumbProps>
) => {
  const [local, others] = splitProps(props as SwitchThumbProps, ["class"])
  return (
    <SwitchPrimitive.Thumb
      class={cn(
        "pointer-events-none block rounded-full bg-[rgb(217,217,217)] ring-0 transition-all",
        "size-3.5 translate-x-[3px]",
        "data-[checked]:translate-x-[19px]",
        local.class
      )}
      {...others}
    />
  )
}

type SwitchLabelProps = SwitchPrimitive.SwitchLabelProps & {
  class?: string | undefined
}

const SwitchLabel = <T extends ValidComponent = "label">(
  props: PolymorphicProps<T, SwitchLabelProps>
) => {
  const [local, others] = splitProps(props as SwitchLabelProps, ["class"])
  return (
    <SwitchPrimitive.Label
      class={cn(
        "text-sm font-medium leading-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-70",
        local.class
      )}
      {...others}
    />
  )
}

export { Switch, SwitchControl, SwitchThumb, SwitchLabel, SwitchDescription, SwitchErrorMessage }
