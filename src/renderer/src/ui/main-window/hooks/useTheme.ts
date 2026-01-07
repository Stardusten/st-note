import { createEffect } from "solid-js"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"

const CUSTOM_CSS_STYLE_ID = "st-note-custom-css"

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
    const customCSS = settingsStore.settings().customCSS
    let styleEl = document.getElementById(CUSTOM_CSS_STYLE_ID) as HTMLStyleElement | null

    if (customCSS) {
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = CUSTOM_CSS_STYLE_ID
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = customCSS
    } else if (styleEl) {
      styleEl.remove()
    }
  })

  createEffect(() => {
    const enabled = settingsStore.settings().codeBlockWrap
    document.documentElement.setAttribute("data-code-block-wrap", enabled ? "true" : "false")
  })
}
