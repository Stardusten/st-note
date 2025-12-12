import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { splitProps } from "solid-js";

import * as DropdownMenuPrimitive from "@kobalte/core/dropdown-menu";
import type { PolymorphicProps } from "@kobalte/core/polymorphic";

import { cn } from "@renderer/lib/common/utils/tailwindcss";

const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenu: Component<DropdownMenuPrimitive.DropdownMenuRootProps> = (props) => {
  return <DropdownMenuPrimitive.Root gutter={2} {...props} />;
};

type DropdownMenuContentProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuContentProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuContentProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuContentProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
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
    </DropdownMenuPrimitive.Portal>
  );
};

type DropdownMenuItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuItemProps<T> & {
    class?: string | undefined;
    inset?: boolean;
    variant?: "default" | "destructive";
  };

const DropdownMenuItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuItemProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuItemProps, ["class", "inset", "variant"]);
  return (
    <DropdownMenuPrimitive.Item
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

const DropdownMenuShortcut: Component<ComponentProps<"span">> = (props) => {
  const [, rest] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("ml-auto text-[10px] font-mono tracking-wide opacity-50", props.class)}
      {...rest}
    />
  );
};

const DropdownMenuLabel: Component<ComponentProps<"div"> & { inset?: boolean }> = (props) => {
  const [, rest] = splitProps(props, ["class", "inset"]);
  return (
    <div
      class={cn("px-2 py-1 text-xs font-medium text-white/50", props.inset && "pl-6", props.class)}
      {...rest}
    />
  );
};

type DropdownMenuSeparatorProps<T extends ValidComponent = "hr"> =
  DropdownMenuPrimitive.DropdownMenuSeparatorProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuSeparator = <T extends ValidComponent = "hr">(
  props: PolymorphicProps<T, DropdownMenuSeparatorProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuSeparatorProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Separator
      class={cn("-mx-0.5 my-0.5 h-px bg-white/10", props.class)}
      {...rest}
    />
  );
};

type DropdownMenuSubTriggerProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuSubTriggerProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuSubTrigger = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuSubTriggerProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuSubTriggerProps, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.SubTrigger
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
    </DropdownMenuPrimitive.SubTrigger>
  );
};

type DropdownMenuSubContentProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuSubContentProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuSubContent = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuSubContentProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuSubContentProps, ["class"]);
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        class={cn("z-50 min-w-28 overflow-hidden rounded-sm p-0.5", props.class)}
        style={{
          background: "rgba(37, 38, 42, 0.85)",
          border: "0.5px solid rgba(255, 255, 255, 0.12)",
          "backdrop-filter": "blur(8px)",
          "box-shadow": "0 2px 8px rgba(0, 0, 0, 0.3)"
        }}
        {...rest}
      />
    </DropdownMenuPrimitive.Portal>
  );
};

type DropdownMenuCheckboxItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuCheckboxItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuCheckboxItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuCheckboxItemProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuCheckboxItemProps, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.CheckboxItem
      class={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs text-white/90 outline-none",
        "focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        props.class
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-3 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3">
            <path d="M5 12l5 5l10 -10" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
};

type DropdownMenuGroupLabelProps<T extends ValidComponent = "span"> =
  DropdownMenuPrimitive.DropdownMenuGroupLabelProps<T> & {
    class?: string | undefined;
  };

const DropdownMenuGroupLabel = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, DropdownMenuGroupLabelProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuGroupLabelProps, ["class"]);
  return (
    <DropdownMenuPrimitive.GroupLabel
      class={cn("px-2 py-1 text-xs font-medium text-white/50", props.class)}
      {...rest}
    />
  );
};

type DropdownMenuRadioItemProps<T extends ValidComponent = "div"> =
  DropdownMenuPrimitive.DropdownMenuRadioItemProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const DropdownMenuRadioItem = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, DropdownMenuRadioItemProps<T>>
) => {
  const [, rest] = splitProps(props as DropdownMenuRadioItemProps, ["class", "children"]);
  return (
    <DropdownMenuPrimitive.RadioItem
      class={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1 pl-6 pr-2 text-xs text-white/90 outline-none",
        "focus:bg-white/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
        props.class
      )}
      {...rest}
    >
      <span class="absolute left-1.5 flex size-3 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-2 fill-current">
            <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
          </svg>
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {props.children}
    </DropdownMenuPrimitive.RadioItem>
  );
};

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
};
