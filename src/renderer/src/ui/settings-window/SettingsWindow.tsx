import { Component, createEffect, createSignal, For, onMount, Show } from "solid-js"
import Kbd from "@renderer/ui/solidui/kbd"
import { Button } from "@renderer/ui/solidui/button"
import { Checkbox } from "@renderer/ui/solidui/checkbox"
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

type TabId = "general" | "database" | "appearance"
const tabs: { id: TabId; label: string }[] = [
  { id: "general", label: "General" },
  { id: "database", label: "Database" },
  { id: "appearance", label: "Appearance" }
]

type GeneralTabProps = {
  shortcut: () => string
  isRecording: () => boolean
  error: () => string
  theme: () => "light" | "dark" | "system"
  searchThreshold: () => number
  codeBlockWrap: () => boolean
  setIsRecording: (v: boolean) => void
  handleKeyDown: (e: KeyboardEvent) => void
  handleClear: () => void
  handleThemeChange: (v: "light" | "dark" | "system") => void
  handleThresholdChange: (v: number) => void
  handleCodeBlockWrapChange: (v: boolean) => void
}

const GeneralTab: Component<GeneralTabProps> = (props) => (
  <div class="space-y-3">
    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Bring-to-Front Hotkey</label>
      <p class="text-[10px] text-muted-foreground">Global shortcut to bring the window to front.</p>
      <div
        class={`flex items-center gap-2 h-[26px] px-2 rounded border cursor-pointer bg-input text-xs ${
          props.isRecording() ? "border-ring ring-1 ring-ring/50" : "border-border/50"
        }`}
        onClick={() => props.setIsRecording(true)}
        onKeyDown={props.handleKeyDown}
        tabIndex={0}>
        <Show when={props.isRecording()}>
          <span class="text-muted-foreground">Press a key combination...</span>
        </Show>
        <Show when={!props.isRecording() && props.shortcut()}>
          <div class="flex items-center gap-1">
            {formatShortcut(props.shortcut()).map((part) => (
              <Kbd>{part}</Kbd>
            ))}
          </div>
        </Show>
        <Show when={!props.isRecording() && !props.shortcut()}>
          <span class="text-muted-foreground">Click to set shortcut</span>
        </Show>
        <Show when={props.shortcut() && !props.isRecording()}>
          <Button
            variant="text-only"
            class="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              props.handleClear()
            }}>
            Clear
          </Button>
        </Show>
      </div>
      <Show when={props.error()}>
        <p class="text-[10px] text-destructive">{props.error()}</p>
      </Show>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Theme</label>
      <div class="flex gap-2">
        <For each={["light", "dark", "system"] as const}>
          {(t) => (
            <Button
              variant="soft"
              size="xs"
              class={props.theme() === t ? "capitalize border-ring bg-accent text-foreground" : "capitalize"}
              onClick={() => props.handleThemeChange(t)}>
              {t}
            </Button>
          )}
        </For>
      </div>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Search Match Mode</label>
      <p class="text-[10px] text-muted-foreground">
        OR: any term matches. AND: all terms must match. 50%: at least half match.
      </p>
      <div class="flex gap-2">
        <For each={thresholdOptions}>
          {(opt) => (
            <Button
              variant="soft"
              size="xs"
              class={props.searchThreshold() === opt.value ? "border-ring bg-accent text-foreground" : ""}
              onClick={() => props.handleThresholdChange(opt.value)}
              title={opt.desc}>
              {opt.label}
            </Button>
          )}
        </For>
      </div>
    </div>

    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Code Block Wrap</label>
      <p class="text-[10px] text-muted-foreground">
        Wrap long lines in code blocks instead of horizontal scrolling.
      </p>
      <Checkbox
        checked={props.codeBlockWrap()}
        onChange={props.handleCodeBlockWrapChange}
        class="text-xs text-muted-foreground">
        Enable
      </Checkbox>
    </div>
  </div>
)

type DatabaseTabProps = {
  dbPath: () => string
  handleSwitch: () => void
  handleNew: () => void
  handleExport: () => void
  handleImport: () => void
}

const getFileName = (path: string) => path.split("/").pop() || path

const DatabaseTab: Component<DatabaseTabProps> = (props) => (
  <div class="space-y-3">
    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Database</label>
      <p class="text-xs text-muted-foreground truncate py-1" title={props.dbPath()}>
        Current DB:{" "}
        <span class="text-foreground font-mono font-medium">
          {props.dbPath() ? getFileName(props.dbPath()) : "No database"}
        </span>
      </p>
      <div class="flex flex-row flex-wrap gap-2">
        <Button variant="outline" size="xs" onClick={props.handleSwitch}>
          Switch Database
        </Button>
        <Button variant="outline" size="xs" onClick={props.handleNew}>
          New Empty Database
        </Button>
        <Button variant="outline" size="xs" onClick={props.handleExport}>
          Export Database
        </Button>
        <Button variant="outline" size="xs" onClick={props.handleImport}>
          Import Database
        </Button>
      </div>
    </div>
  </div>
)

type AppearanceTabProps = {
  customCSS: () => string
  handleCustomCSSChange: (v: string) => void
}

const AppearanceTab: Component<AppearanceTabProps> = (props) => (
  <div class="space-y-3">
    <div class="space-y-1">
      <label class="text-xs font-medium text-foreground">Custom CSS</label>
      <p class="text-[10px] text-muted-foreground">
        Add custom CSS to customize the appearance. Changes apply immediately.
      </p>
      <textarea
        value={props.customCSS()}
        onInput={(e) => props.handleCustomCSSChange(e.currentTarget.value)}
        placeholder="/* Your custom CSS here */&#10;.editor { }&#10;:root { --accent: #ff0000; }"
        spellcheck={false}
        class="w-full h-64 px-2 py-1.5 text-xs font-mono bg-input border border-border/50 rounded outline-none focus:border-ring resize-none"
      />
    </div>
  </div>
)

const SettingsWindow: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>("general")
  const [shortcut, setShortcut] = createSignal("")
  const [isRecording, setIsRecording] = createSignal(false)
  const [error, setError] = createSignal("")
  const [dbPath, setDbPath] = createSignal("")
  const [theme, setTheme] = createSignal<"light" | "dark" | "system">("dark")
  const [searchThreshold, setSearchThreshold] = createSignal(1)
  const [customCSS, setCustomCSS] = createSignal("")
  const [codeBlockWrap, setCodeBlockWrap] = createSignal(false)

  onMount(async () => {
    await settingsStore.init()
    const settings = await window.api.globalSettings.get()
    setShortcut(settings.bringToFrontShortcut)
    setDbPath(settings.lastDatabase || "")
    setTheme(settingsStore.getTheme())
    setSearchThreshold(settingsStore.getSearchMatchThreshold())
    setCustomCSS(settingsStore.getCustomCSS())
    setCodeBlockWrap(settingsStore.getCodeBlockWrap())
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

  const handleCodeBlockWrapChange = async (enabled: boolean) => {
    setCodeBlockWrap(enabled)
    await settingsStore.setCodeBlockWrap(enabled)
  }

  return (
    <div class="h-screen w-full flex flex-col overflow-hidden bg-surface text-foreground">
      <div
        class="shrink-0 h-[34px] select-none flex items-center justify-center"
        style={{ "-webkit-app-region": "drag" }}>
        <span class="text-[13px] font-medium text-muted-foreground">Settings</span>
      </div>
      <div class="flex-1 flex overflow-hidden">
        <div class="w-28 shrink-0 border-r border-border/30 py-2 px-2">
          <For each={tabs}>
            {(tab) => (
              <button
                class={`w-full text-left px-2 py-1.5 rounded text-xs mb-0.5 ${
                  activeTab() === tab.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                }`}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            )}
          </For>
        </div>
        <div class="flex-1 overflow-auto px-4 py-2">
          <Show when={activeTab() === "general"}>
            <GeneralTab
              shortcut={shortcut}
              isRecording={isRecording}
              error={error}
              theme={theme}
              searchThreshold={searchThreshold}
              codeBlockWrap={codeBlockWrap}
              setIsRecording={setIsRecording}
              handleKeyDown={handleKeyDown}
              handleClear={handleClear}
              handleThemeChange={handleThemeChange}
              handleThresholdChange={handleThresholdChange}
              handleCodeBlockWrapChange={handleCodeBlockWrapChange}
            />
          </Show>
          <Show when={activeTab() === "database"}>
            <DatabaseTab
              dbPath={dbPath}
              handleSwitch={handleSwitch}
              handleNew={handleNew}
              handleExport={handleExport}
              handleImport={handleImport}
            />
          </Show>
          <Show when={activeTab() === "appearance"}>
            <AppearanceTab customCSS={customCSS} handleCustomCSSChange={handleCustomCSSChange} />
          </Show>
        </div>
      </div>
    </div>
  )
}

export default SettingsWindow
