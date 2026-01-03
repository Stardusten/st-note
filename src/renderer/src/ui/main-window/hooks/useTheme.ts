import { createEffect } from "solid-js"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"

export function useTheme() {
  createEffect(() => {
    const theme = settingsStore.settings().theme
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme
    document.documentElement.setAttribute("data-kb-theme", resolved)
  })

  createEffect(() => {
    const fontSize = settingsStore.settings().fontSize
    document.documentElement.style.setProperty("--editor-font-size", `${fontSize}px`)
  })

  createEffect(() => {
    const fontFamily = settingsStore.settings().fontFamily
    if (fontFamily) {
      document.documentElement.style.setProperty("--editor-font-family", fontFamily)
    } else {
      document.documentElement.style.removeProperty("--editor-font-family")
    }
  })
}
