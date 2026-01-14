import type { JSX, ValidComponent } from "solid-js"
import { splitProps } from "solid-js"

import * as ButtonPrimitive from "@kobalte/core/button"
import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

import { cn } from "@renderer/lib/common/utils/tailwindcss"

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center \
  gap-2 whitespace-nowrap rounded-md text-sm transition-colors \
  disabled:pointer-events-none disabled:opacity-50 \
  [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 \
  shrink-0 [&_svg]:shrink-0 outline-none",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        destructive: "bg-destructive text-white hover:bg-destructive/80",
        destructiveOutline: "border border-destructive/50 text-destructive hover:bg-destructive/10",
        destructiveGhost: "text-destructive hover:bg-destructive/10",
        outline: "border border-border bg-transparent hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        "text-only": "!p-0 !h-fit bg-none",
        soft: "border border-border/50 bg-input text-muted-foreground hover:text-foreground hover:bg-muted/30"
      },
      size: {
        default: "h-8 px-4 text-[13px] py-2 has-[>svg]:px-3",
        sm: "h-7 rounded-md gap-1.5 px-3 text-xs",
        xs: "h-[26px] rounded px-3 text-xs",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "sm-icon": "size-8 p-0 rounded-md",
        "xs-icon": "size-7 p-0 rounded-md",
        "2xs-icon": "size-6 p-0 rounded-md",
        "3xs-icon": "size-5 p-0 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

type ButtonProps<T extends ValidComponent = "button"> = ButtonPrimitive.ButtonRootProps<T> &
  VariantProps<typeof buttonVariants> & {
    class?: string | undefined
    children?: JSX.Element
    /**
     * Optional inline style attribute.
     * Accepts SolidJS JSX compatible style formats.
     */
    style?: JSX.CSSProperties | string
  }

const Button = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ButtonProps<T>>
) => {
  const [local, others] = splitProps(props as ButtonProps, ["variant", "size", "class"])
  return (
    <ButtonPrimitive.Root
      data-slot="button"
      class={cn(buttonVariants({ variant: local.variant, size: local.size }), local.class)}
      {...others}
    />
  )
}

export { Button, buttonVariants }
export type ButtonVariants = VariantProps<typeof buttonVariants>
export type { ButtonProps }
