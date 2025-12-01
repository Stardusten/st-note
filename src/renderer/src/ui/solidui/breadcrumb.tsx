import type { Component, ComponentProps, JSX, ValidComponent } from "solid-js";
import { Show, splitProps } from "solid-js";

import type { PolymorphicProps } from "@kobalte/core";
import * as BreadcrumbPrimitive from "@kobalte/core/breadcrumbs";

import { cn } from "@renderer/lib/common/utils/tailwindcss";

const Breadcrumb = BreadcrumbPrimitive.Root;

const BreadcrumbList: Component<ComponentProps<"ol">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <ol class={cn("flex items-center text-sm", local.class)} {...others} />
  );
};

const BreadcrumbItem: Component<ComponentProps<"li">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return <li class={cn("inline-flex items-center", local.class)} {...others} />;
};

type BreadcrumbLinkProps<T extends ValidComponent = "a"> =
  BreadcrumbPrimitive.BreadcrumbsLinkProps<T> & { class?: string | undefined };

const BreadcrumbLink = <T extends ValidComponent = "a">(
  props: PolymorphicProps<T, BreadcrumbLinkProps<T>>
) => {
  const [local, others] = splitProps(props as BreadcrumbLinkProps, ["class"]);
  return (
    <BreadcrumbPrimitive.Link
      class={cn(
        "transition-colors duration-200 cursor-pointer hover:text-foreground text-muted-foreground data-[current]:text-foreground data-[current]:cursor-default",
        local.class
      )}
      {...others}
    />
  );
};

type BreadcrumbSeparatorProps<T extends ValidComponent = "span"> =
  BreadcrumbPrimitive.BreadcrumbsSeparatorProps<T> & {
    class?: string | undefined;
    children?: JSX.Element;
  };

const BreadcrumbSeparator = <T extends ValidComponent = "span">(
  props: PolymorphicProps<T, BreadcrumbSeparatorProps<T>>
) => {
  const [local, others] = splitProps(props as BreadcrumbSeparatorProps, [
    "class",
    "children",
  ]);
  return (
    <BreadcrumbPrimitive.Separator
      class={cn("mx-2 text-border text-sm", local.class)}
      {...others}
    >
      <Show when={local.children} fallback={"/"}>
        {local.children}
      </Show>
    </BreadcrumbPrimitive.Separator>
  );
};

const BreadcrumbEllipsis: Component<ComponentProps<"span">> = (props) => {
  const [local, others] = splitProps(props, ["class"]);
  return (
    <span
      class={cn("flex size-9 items-center justify-center", local.class)}
      {...others}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="size-4"
      >
        <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
        <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      </svg>
      <span class="sr-only">More</span>
    </span>
  );
};

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
