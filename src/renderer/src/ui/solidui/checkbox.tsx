import type { ValidComponent, JSX } from "solid-js";
import { splitProps, Show } from "solid-js";

import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { Check, Minus } from "lucide-solid";

import { cn } from "@renderer/lib/common/utils/tailwindcss";

type CheckboxRootProps<T extends ValidComponent = "div"> =
  CheckboxPrimitive.CheckboxRootProps<T> & { class?: string | undefined };

const Checkbox = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, CheckboxRootProps<T>>
) => {
  const [local, others] = splitProps(props as CheckboxRootProps, [
    "class",
    "children",
  ]);
  const childrenContent = local.children as unknown;
  const shouldRenderLabel =
    typeof childrenContent !== "function" && !!childrenContent;
  return (
    <CheckboxPrimitive.Root
      class={cn("inline-flex items-center gap-2 select-none", local.class)}
      {...others}
    >
      <CheckboxPrimitive.Input />
      <CheckboxPrimitive.Control
        class={cn(
          "size-4 shrink-0 rounded-[4px] border border-foreground/20 bg-foreground/5 shadow-xs transition-shadow outline-none flex items-center justify-center",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
          "hover:bg-foreground/10",
          "data-[checked]:bg-foreground/10 data-[checked]:text-foreground data-[checked]:border-foreground/50",
          "data-[indeterminate]:bg-foreground/10 data-[indeterminate]:text-foreground data-[indeterminate]:border-foreground/50",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Show
            when={others.indeterminate}
            fallback={<Check class="size-3.5" strokeWidth={2.5} />}
          >
            <Minus class="size-3.5" strokeWidth={2.5} />
          </Show>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      <Show when={shouldRenderLabel}>
        <CheckboxPrimitive.Label>
          {childrenContent as JSX.Element}
        </CheckboxPrimitive.Label>
      </Show>
    </CheckboxPrimitive.Root>
  );
};

export { Checkbox };
