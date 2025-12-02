import type { JSX, ValidComponent } from "solid-js"
import { splitProps } from "solid-js"

import * as ButtonPrimitive from "@kobalte/core/button"
import type { PolymorphicProps } from "@kobalte/core/polymorphic"
import type { VariantProps } from "class-variance-authority"
import { cva } from "class-variance-authority"

import { cn } from "@renderer/lib/common/utils/tailwindcss"

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        destructiveOutline:
          "border border-destructive/50 text-destructive shadow-xs hover:bg-destructive/10",
        destructiveGhost: "text-destructive hover:bg-destructive/10",
        outline:
          "rounded border border-transparent [background:linear-gradient(138.16deg,rgb(49,49,53)_-14.83%,rgb(31,32,36)_92.59%)_padding-box,linear-gradient(rgb(184,184,184)_-76.62%,rgba(184,184,184,0)_131.05%)_border-box] hover:[background:linear-gradient(rgb(78,79,82),rgb(78,79,82))_padding-box,linear-gradient(rgb(184,184,184)_-76.62%,rgba(184,184,184,0)_131.05%)_border-box]",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-8 px-4 text-[13px] py-2 has-[>svg]:px-3",
        sm: "rounded-sm gap-1.5 px-1 py-1 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "sm-icon": "size-8 p-0 rounded-sm",
        "xs-icon": "size-7 p-0 rounded-sm",
        "2xs-icon": "size-6 p-0 rounded-sm",
        "3xs-icon": "size-5 p-0 rounded-sm"
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
