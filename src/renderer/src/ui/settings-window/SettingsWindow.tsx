import { Component, createEffect, createSignal, onMount, Show } from "solid-js"
import Kbd from "@renderer/ui/solidui/kbd"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"

const formatShortcut = (shortcut: string) => {
  return shortcut
    .replace("CommandOrControl", navigator.platform.includes("Mac") ? "⌘" : "Ctrl")
    .replace("Command", "⌘")
    .replace("Control", "Ctrl")
    .replace("Shift", "⇧")
    .replace("Alt", navigator.platform.includes("Mac") ? "⌥" : "Alt")
    .replace("Option", "⌥")
    .split("+")
}

const thresholdOptions = [
  { value: 0, label: "OR", desc: "Any token matches" },
  { value: 0.5, label: "50%", desc: "At least half tokens match" },
  { value: 1, label: "AND", desc: "All tokens must match" }
]

const SettingsWindow: Component = () => {
  const [shortcut, setShortcut] = createSignal("")
  const [isRecording, setIsRecording] = createSignal(false)
  const [error, setError] = createSignal("")
  const [dbPath, setDbPath] = createSignal("")
  const [theme, setTheme] = createSignal<"light" | "dark" | "system">("dark")
  const [searchThreshold, setSearchThreshold] = createSignal(1)
  const [customCSS, setCustomCSS] = createSignal("")

  onMount(async () => {
    await settingsStore.init()
    const settings = await window.api.globalSettings.get()
    setShortcut(settings.bringToFrontShortcut)
    setDbPath(settings.lastDatabase || "")
    setTheme(settingsStore.getTheme())
    setSearchThreshold(settingsStore.getSearchMatchThreshold())
    setCustomCSS(settingsStore.getCustomCSS())
  })

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

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (!isRecording()) return

    e.preventDefault()
    e.stopPropagation()

    if (e.key === "Escape") {
      setIsRecording(false)
      return
    }

    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return

    const parts: string[] = []
    if (e.metaKey || e.ctrlKey) parts.push("CommandOrControl")
    if (e.shiftKey) parts.push("Shift")
    if (e.altKey) parts.push("Alt")

    let key = e.key
    if (key === " ") key = "Space"
    else if (key.length === 1) key = key.toUpperCase()
    parts.push(key)

    if (parts.length < 2) {
      setError("Shortcut must include a modifier key (Cmd/Ctrl, Shift, or Alt)")
      return
    }

    const newShortcut = parts.join("+")
    const success = await window.api.globalSettings.registerShortcut(newShortcut)

    if (success) {
      await window.api.globalSettings.update({ bringToFrontShortcut: newShortcut })
      setShortcut(newShortcut)
      setError("")
    } else {
      setError("Failed to register shortcut. It may conflict with another application.")
    }

    setIsRecording(false)
  }

  const handleClear = async () => {
    await window.api.globalSettings.registerShortcut("")
    await window.api.globalSettings.update({ bringToFrontShortcut: "" })
    setShortcut("")
    setError("")
  }

  const handleExport = async () => {
    const currentPath = dbPath()
    if (!currentPath) return
    const result = await window.api.database.export(currentPath)
    if (result.success) alert(`Exported to: ${result.path}`)
    else if (!result.canceled && result.error) alert(`Export failed: ${result.error}`)
  }

  const handleImport = async () => {
    const path = await window.api.database.import()
    if (path) {
      await window.api.globalSettings.update({ lastDatabase: path })
      setDbPath(path)
      alert("Database imported. Please restart the app to use the new database.")
    }
  }

  const handleSwitch = async () => {
    const path = await window.api.database.import()
    if (path) {
      await window.api.globalSettings.update({ lastDatabase: path })
      setDbPath(path)
      alert("Database switched. Please restart the app to use the new database.")
    }
  }

  const handleNew = async () => {
    const path = await window.api.database.new()
    if (path) {
      await window.api.globalSettings.update({ lastDatabase: path })
      setDbPath(path)
      alert("New database created. Please restart the app to use the new database.")
    }
  }

  const getFileName = (path: string) => path.split("/").pop() || path

  const handleThemeChange = async (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
    await settingsStore.setTheme(newTheme)
  }

  const handleThresholdChange = async (value: number) => {
    setSearchThreshold(value)
    await settingsStore.setSearchMatchThreshold(value)
  }

  const handleCustomCSSChange = async (value: string) => {
    setCustomCSS(value)
    await settingsStore.setCustomCSS(value)
  }

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden bg-surface text-foreground">
      <div
        class="shrink-0 h-[34px] select-none flex items-center justify-center"
        style={{ "-webkit-app-region": "drag" }}>
        <span class="text-[13px] font-medium text-muted-foreground">Settings</span>
      </div>
      <div class="flex-1 overflow-auto px-4 pb-2">
        <div class="space-y-3">
          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground">Bring-to-Front Hotkey</label>
            <p class="text-[10px] text-muted-foreground">
              Global shortcut to bring the window to front.
            </p>
            <div
              class={`flex items-center gap-2 h-[26px] px-2 rounded border cursor-pointer bg-input text-xs ${
                isRecording() ? "border-ring ring-1 ring-ring/50" : "border-border/50"
              }`}
              onClick={() => setIsRecording(true)}
              onKeyDown={handleKeyDown}
              tabIndex={0}>
              <Show when={isRecording()}>
                <span class="text-muted-foreground">Press a key combination...</span>
              </Show>
              <Show when={!isRecording() && shortcut()}>
                <div class="flex items-center gap-1">
                  {formatShortcut(shortcut()).map((part) => (
                    <Kbd>{part}</Kbd>
                  ))}
                </div>
              </Show>
              <Show when={!isRecording() && !shortcut()}>
                <span class="text-muted-foreground">Click to set shortcut</span>
              </Show>
              <Show when={shortcut() && !isRecording()}>
                <button
                  class="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClear()
                  }}>
                  Clear
                </button>
              </Show>
            </div>
            <Show when={error()}>
              <p class="text-[10px] text-destructive">{error()}</p>
            </Show>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground">Theme</label>
            <div class="flex gap-2">
              <button
                class={`h-[26px] px-3 rounded border text-xs ${
                  theme() === "light"
                    ? "border-ring bg-accent text-foreground"
                    : "border-border/50 bg-input text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                onClick={() => handleThemeChange("light")}>
                Light
              </button>
              <button
                class={`h-[26px] px-3 rounded border text-xs ${
                  theme() === "dark"
                    ? "border-ring bg-accent text-foreground"
                    : "border-border/50 bg-input text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                onClick={() => handleThemeChange("dark")}>
                Dark
              </button>
              <button
                class={`h-[26px] px-3 rounded border text-xs ${
                  theme() === "system"
                    ? "border-ring bg-accent text-foreground"
                    : "border-border/50 bg-input text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                onClick={() => handleThemeChange("system")}>
                System
              </button>
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground">Search Match Mode</label>
            <p class="text-[10px] text-muted-foreground">
              Controls how multiple search terms are matched. OR: any term matches. AND: all terms
              must match. 50%: at least half of the terms must match.
            </p>
            <div class="flex gap-2">
              {thresholdOptions.map((opt) => (
                <button
                  class={`h-[26px] px-3 rounded border text-xs ${
                    searchThreshold() === opt.value
                      ? "border-ring bg-accent text-foreground"
                      : "border-border/50 bg-input text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                  onClick={() => handleThresholdChange(opt.value)}
                  title={opt.desc}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground">Custom CSS</label>
            <p class="text-[10px] text-muted-foreground">
              Add custom CSS to customize the appearance. Changes apply immediately.
            </p>
            <textarea
              value={customCSS()}
              onInput={(e) => handleCustomCSSChange(e.currentTarget.value)}
              placeholder="/* Your custom CSS here */&#10;.editor { }&#10;:root { --accent: #ff0000; }"
              spellcheck={false}
              class="w-full h-24 px-2 py-1.5 text-xs font-mono bg-input border border-border/50 rounded outline-none focus:border-ring resize-none"
            />
          </div>

          <div class="space-y-1">
            <label class="text-xs font-medium text-muted-foreground">Database</label>
            <p class="text-xs text-muted-foreground truncate py-1" title={dbPath()}>
              Current DB:{" "}
              <span class="text-foreground font-mono font-medium">
                {dbPath() ? getFileName(dbPath()) : "No database"}
              </span>
            </p>
            <div class="flex flex-row flex-wrap gap-2">
              <button
                class="h-[26px] px-2 rounded border border-border/50 bg-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={handleSwitch}>
                Switch Database
              </button>
              <button
                class="h-[26px] px-2 rounded border border-border/50 bg-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={handleNew}>
                New Empty Database
              </button>
              <button
                class="h-[26px] px-2 rounded border border-border/50 bg-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={handleExport}>
                Export Database
              </button>
              <button
                class="h-[26px] px-2 rounded border border-border/50 bg-input text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30"
                onClick={handleImport}>
                Import Database
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsWindow
