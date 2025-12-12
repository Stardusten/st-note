import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import * as ContextMenuPrimitive from "@kobalte/core/context-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import { cn } from "@renderer/lib/common/utils/tailwindcss";

const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenu: Component<ContextMenuPrimitive.ContextMenuRootProps> = (props) => {
  return <ContextMenuPrimitive.Root gutter={2} {...props} />;
};

type ContextMenuContentProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuContentProps<T> & {
    class?: string | undefined;
  };

const ContextMenuContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuContentProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuContentProps, ["class"]);
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        class={cn(
          "z-50 max-h-[var(--kb-menu-content-available-height)] min-w-28 overflow-visible rounded-sm p-0.5",
          props.class
        )}
        {...rest}
        style={{
          background: "rgba(37, 38, 42, 0.85)",
          border: "0.5px solid rgba(255, 255, 255, 0.12)",
          "backdrop-filter": "blur(8px)",
          "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.3)"
        }}
      />
    </ContextMenuPrimitive.Portal>
  );
};

type ContextMenuItemProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuItemProps<T> & {
    class?: string | undefined;
    inset?: boolean;
    variant?: "default" | "destructive";
  };

const ContextMenuItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuItemProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuItemProps, ["class", "inset", "variant"]);
  return (
    <ContextMenuPrimitive.Item
      data-inset={props.inset ? "" : undefined}
      data-variant={props.variant}
      class={cn(
        "relative flex cursor-default select-none items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-white/90 outline-none",
        "focus:bg-white/10",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        "data-[inset]:pl-6 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "data-[variant=destructive]:text-red-400 data-[variant=destructive]:focus:bg-red-500/15",
        props.class
      )}
      {...rest}
    />
  );
};

const ContextMenuShortcut: Component<ComponentProps<"span">> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("ml-auto text-[10px] font-mono tracking-wide opacity-50", props.class)}
      {...rest}
    />
  );
};

type ContextMenuSeparatorProps<T extends ValidComponent = "hr"> =
  ContextMenuPrimitive.ContextMenuSeparatorProps<T> & {
    class?: string | undefined;
  };

const ContextMenuSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, ContextMenuSeparatorProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuSeparatorProps, ["class"]);
  return (
    <ContextMenuPrimitive.Separator
      class={cn("-mx-0.5 my-0.5 h-px bg-white/10", props.class)}
      {...rest}
    />
  );
};

type ContextMenuSubTriggerProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuSubTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const ContextMenuSubTrigger = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuSubTriggerProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuSubTriggerProps, ["class", "children"]);
  return (
    <ContextMenuPrimitive.SubTrigger
      class={cn(
        "flex cursor-default select-none items-center gap-1.5 rounded-sm px-2 py-1 text-xs text-white/90 outline-none",
        "focus:bg-white/10 data-[state=open]:bg-white/10",
        props.class
      )}
      {...rest}
    >
      {props.children}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="ml-auto size-3">
        <path d="M9 6l6 6l-6 6" />
      </svg>
    </ContextMenuPrimitive.SubTrigger>
  );
};

type ContextMenuSubContentProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuSubContentProps<T> & {
    class?: string | undefined;
  };

const ContextMenuSubContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuSubContentProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuSubContentProps, ["class"]);
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.SubContent
        class={cn("z-50 min-w-28 overflow-hidden rounded-sm p-0.5", props.class)}
        style={{
          background: "rgba(37, 38, 42, 0.85)",
          border: "0.5px solid rgba(255, 255, 255, 0.12)",
          "backdrop-filter": "blur(8px)",
          "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.3)"
        }}
        {...rest}
      />
    </ContextMenuPrimitive.Portal>
  );
};

type ContextMenuCheckboxItemProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuCheckboxItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const ContextMenuCheckboxItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuCheckboxItemProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuCheckboxItemProps, ["class", "children"]);
  return (
    <ContextMenuPrimitive.CheckboxItem
      class={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs text-white/90 outline-none",
        "focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        props.class
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-3 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3">
            <path d="M5 12l5 5l10 -10" />
          </svg>
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </ContextMenuPrimitive.CheckboxItem>
  );
};

type ContextMenuGroupLabelProps<T extends ValidComponent = "span"> =
  ContextMenuPrimitive.ContextMenuGroupLabelProps<T> & {
    class?: string | undefined;
  };

const ContextMenuGroupLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, ContextMenuGroupLabelProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuGroupLabelProps, ["class"]);
  return (
    <ContextMenuPrimitive.GroupLabel
      class={cn("px-2 py-1 text-xs font-medium text-white/50", props.class)}
      {...rest}
    />
  );
};

type ContextMenuRadioItemProps<T extends ValidComponent = "div"> =
  ContextMenuPrimitive.ContextMenuRadioItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const ContextMenuRadioItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ContextMenuRadioItemProps<T>>
) => {
  const [, rest] = splitProps(props as ContextMenuRadioItemProps, ["class", "children"]);
  return (
    <ContextMenuPrimitive.RadioItem
      class={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs text-white/90 outline-none",
        "focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        props.class
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-3 items-center justify-center">
        <ContextMenuPrimitive.ItemIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-2 fill-current">
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          </svg>
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </ContextMenuPrimitive.RadioItem>
  );
};

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuShortcut,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuCheckboxItem,
  ContextMenuGroup,
  ContextMenuGroupLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
};
