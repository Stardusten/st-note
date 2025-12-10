import { createEffect } from "solid-js"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"

export function useTheme() {
  createEffect(() => {
    const theme = settingsStore.getTheme()
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme
    document.documentElement.setAttribute("data-kb-theme", resolved)
  })
}
