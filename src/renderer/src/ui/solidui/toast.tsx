import type { JSX, ValidComponent } from "solid-js";
import { Match, splitProps, Switch } from "solid-js";
import { Portal } from "solid-js/web";

import type { PolymorphicProps } from "@kobalte/core/polymorphic";
import * as ToastPrimitive from "@kobalte/core/toast";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { CheckCircle, XCircle, AlertCircle, AlertTriangle } from "lucide-solid";

import { cn } from "@renderer/lib/common/utils/tailwindcss";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-3 overflow-hidden rounded-md border p-4 pr-10 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--kb-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--kb-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[opened]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[opened]:fade-in-0 data-[closed]:zoom-out-95 data-[opened]:zoom-in-95 data-[opened]:slide-in-from-right-2 data-[closed]:slide-out-to-right-2 data-[swipe=end]:animate-out",
  {
    variants: {
      variant: {
        default: "border bg-card text-card-foreground",
        destructive:
          "border-red-500/50 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-300",
        success:
          "border-green-500/50 bg-green-50 text-green-700 dark:border-green-400 dark:bg-green-950 dark:text-green-300",
        warning:
          "border-yellow-500/50 bg-yellow-50 text-yellow-700 dark:border-yellow-400 dark:bg-yellow-950 dark:text-yellow-300",
        error:
          "border-red-500/50 bg-red-50 text-red-700 dark:border-red-400 dark:bg-red-950 dark:text-red-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);
type ToastVariant = NonNullable<VariantProps<typeof toastVariants>["variant"]>;

type ToastListProps<T extends ValidComponent = "ol"> =
  ToastPrimitive.ToastListProps<T> & {
    class?: string | undefined;
  };

const Toaster = <T extends ValidComponent = "ol">(
  props: PolymorphicProps<T, ToastListProps<T>>
) => {
  const [local, others] = splitProps(props as ToastListProps, ["class"]);
  return (
    <Portal>
      <ToastPrimitive.Region>
        <ToastPrimitive.List
          class={cn(
            "fixed right-0 top-0 z-[100] flex max-h-screen w-full flex-col gap-2 p-4 sm:right-0 sm:top-0 sm:w-auto md:max-w-[420px]",
            local.class
          )}
          {...others}
        />
      </ToastPrimitive.Region>
    </Portal>
  );
};

type ToastRootProps<T extends ValidComponent = "li"> =
  ToastPrimitive.ToastRootProps<T> &
  VariantProps<typeof toastVariants> & { class?: string | undefined };

const Toast = <T extends ValidComponent = "li">(
  props: PolymorphicProps<T, ToastRootProps<T>>
) => {
  const [local, others] = splitProps(props as ToastRootProps, [
    "class",
    "variant",
  ]);
  return (
    <ToastPrimitive.Root
      class={cn(toastVariants({ variant: local.variant }), local.class)}
      data-variant={local.variant ?? "default"}
      {...others}
    />
  );
};

type ToastCloseButtonProps<T extends ValidComponent = "button"> =
  ToastPrimitive.ToastCloseButtonProps<T> & { class?: string | undefined };

const ToastClose = <T extends ValidComponent = "button">(
  props: PolymorphicProps<T, ToastCloseButtonProps<T>>
) => {
  const [local, others] = splitProps(props as ToastCloseButtonProps, ["class"]);
  return (
    <ToastPrimitive.CloseButton
      class={cn(
        "absolute cursor-pointer opacity-50 hover:opacity-100 transition-opacity right-2 top-2 rounded-md p-1 focus:outline-none focus:ring-2",
        local.class
      )}
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
        class="size-[14px]"
      >
        <path d="M18 6l-12 12" />
        <path d="M6 6l12 12" />
      </svg>
    </ToastPrimitive.CloseButton>
  );
};

type ToastTitleProps<T extends ValidComponent = "div"> =
  ToastPrimitive.ToastTitleProps<T> & {
    class?: string | undefined;
    variant?: ToastVariant;
  };

const ToastTitle = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ToastTitleProps<T>>
) => {
  const [local, others] = splitProps(props as ToastTitleProps, [
    "class",
    "variant",
  ]);

  const getIcon = () => {
    switch (local.variant) {
      case "success":
        return <CheckCircle size={16} />;
      case "warning":
        return <AlertTriangle size={16} />;
      case "error":
      case "destructive":
        return <XCircle size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  return (
    <div class="flex items-center gap-2">
      {local.variant && local.variant !== "default" && getIcon()}
      <ToastPrimitive.Title class={cn("text-sm", local.class)} {...others} />
    </div>
  );
};

type ToastDescriptionProps<T extends ValidComponent = "div"> =
  ToastPrimitive.ToastDescriptionProps<T> & { class?: string | undefined };

const ToastDescription = <T extends ValidComponent = "div">(
  props: PolymorphicProps<T, ToastDescriptionProps<T>>
) => {
  const [local, others] = splitProps(props as ToastDescriptionProps, ["class"]);
  return (
    <ToastPrimitive.Description
      class={cn("text-xs", local.class)}
      {...others}
    />
  );
};

function showToast(props: {
  title?: JSX.Element;
  description?: JSX.Element;
  variant?: ToastVariant;
  duration?: number;
}) {
  ToastPrimitive.toaster.show((data) => (
    <Toast
      toastId={data.toastId}
      variant={props.variant}
      duration={props.duration}
    >
      <div class="grid gap-1">
        {props.title && (
          <ToastTitle variant={props.variant}>{props.title}</ToastTitle>
        )}
        {props.description && (
          <ToastDescription>{props.description}</ToastDescription>
        )}
      </div>
      <ToastClose />
    </Toast>
  ));
}

function showToastPromise<T, U>(
  promise: Promise<T> | (() => Promise<T>),
  options: {
    loading?: JSX.Element;
    success?: (data: T) => JSX.Element;
    error?: (error: U) => JSX.Element;
    duration?: number;
  }
) {
  const variant: { [key in ToastPrimitive.ToastPromiseState]: ToastVariant } = {
    pending: "default",
    fulfilled: "success",
    rejected: "error",
  };
  return ToastPrimitive.toaster.promise<T, U>(promise, (props) => (
    <Toast
      toastId={props.toastId}
      variant={variant[props.state]}
      duration={options.duration}
    >
      <Switch>
        <Match when={props.state === "pending"}>{options.loading}</Match>
        <Match when={props.state === "fulfilled"}>
          {options.success?.(props.data!)}
        </Match>
        <Match when={props.state === "rejected"}>
          {options.error?.(props.error!)}
        </Match>
      </Switch>
    </Toast>
  ));
}

export {
  Toaster,
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
  showToast,
  showToastPromise,
};
