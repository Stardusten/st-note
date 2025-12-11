import { createSignal, type Accessor } from "solid-js"
import type { Settings } from "src/preload"

const defaultSettings: Settings = {
  theme: "dark",
  fontSize: "medium",
  showLineNumbers: false,
  spellCheck: false,
  quickCaptureShortcut: "CommandOrControl+Shift+C",
  searchShortcut: "CommandOrControl+Shift+P",
  language: "zh-CN",
  autoSave: true,
  timestampFormat: "MM-dd HH:mm"
}

class SettingsStore {
  private settings: Accessor<Settings>
  private setSettings: (s: Settings) => void
  private initialized = false

  constructor() {
    const [settings, setSettings] = createSignal<Settings>(defaultSettings)
    this.settings = settings
    this.setSettings = setSettings
  }

  async init() {
    if (this.initialized) return
    this.initialized = true

    const saved = await window.api.settings.get()
    this.setSettings(saved)

    window.api.settings.onChange((newSettings) => {
      this.setSettings(newSettings)
    })
  }

  getSettings = () => this.settings()
  getTheme = () => this.settings().theme
  getFontSize = () => this.settings().fontSize
  getShowLineNumbers = () => this.settings().showLineNumbers
  getSpellCheck = () => this.settings().spellCheck
  getQuickCaptureShortcut = () => this.settings().quickCaptureShortcut
  getSearchShortcut = () => this.settings().searchShortcut
  getLanguage = () => this.settings().language
  getAutoSave = () => this.settings().autoSave
  getTimestampFormat = () => this.settings().timestampFormat

  async setTheme(theme: Settings["theme"]) {
    const updated = await window.api.settings.set({ theme })
    this.setSettings(updated)
  }

  async setFontSize(fontSize: Settings["fontSize"]) {
    const updated = await window.api.settings.set({ fontSize })
    this.setSettings(updated)
  }

  async setShowLineNumbers(showLineNumbers: boolean) {
    const updated = await window.api.settings.set({ showLineNumbers })
    this.setSettings(updated)
  }

  async setSpellCheck(spellCheck: boolean) {
    const updated = await window.api.settings.set({ spellCheck })
    this.setSettings(updated)
  }

  async setQuickCaptureShortcut(quickCaptureShortcut: string) {
    const updated = await window.api.settings.set({ quickCaptureShortcut })
    this.setSettings(updated)
  }

  async setSearchShortcut(searchShortcut: string) {
    const updated = await window.api.settings.set({ searchShortcut })
    this.setSettings(updated)
  }

  async setLanguage(language: Settings["language"]) {
    const updated = await window.api.settings.set({ language })
    this.setSettings(updated)
  }

  async setAutoSave(autoSave: boolean) {
    const updated = await window.api.settings.set({ autoSave })
    this.setSettings(updated)
  }

  async exportSettings(): Promise<string> {
    return window.api.settings.export()
  }

  async importSettings(json: string): Promise<void> {
    const updated = await window.api.settings.import(json)
    this.setSettings(updated)
  }
}

export const settingsStore = new SettingsStore()
