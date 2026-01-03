import { createSignal, type Accessor } from "solid-js"
import type { Settings } from "src/preload"

export type { Settings }

const defaultSettings: Settings = {
  theme: "dark",
  fontSize: "medium",
  fontFamily: "",
  showLineNumbers: false,
  spellCheck: false,
  quickCaptureShortcut: "CommandOrControl+Shift+C",
  searchShortcut: "CommandOrControl+Shift+P",
  language: "zh-CN",
  autoSave: true,
  autoLayout: true,
  preferredLayout: "horizontal",
  searchMatchThreshold: 1
}

class SettingsStore {
  private _settings: Accessor<Settings>
  private setSettings: (s: Settings) => void
  private initialized = false

  constructor() {
    const [settings, setSettings] = createSignal<Settings>(defaultSettings)
    this._settings = settings
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

  get settings(): Accessor<Settings> {
    return this._settings
  }

  getSettings = (): Settings => this._settings()
  getTheme = (): Settings["theme"] => this._settings().theme
  getFontSize = () => this._settings().fontSize
  getFontFamily = () => this._settings().fontFamily
  getShowLineNumbers = () => this._settings().showLineNumbers
  getSpellCheck = () => this._settings().spellCheck
  getQuickCaptureShortcut = () => this._settings().quickCaptureShortcut
  getSearchShortcut = () => this._settings().searchShortcut
  getLanguage = () => this._settings().language
  getAutoSave = () => this._settings().autoSave
  getAutoLayout = () => this._settings().autoLayout
  getPreferredLayout = () => this._settings().preferredLayout
  getSearchMatchThreshold = () => this._settings().searchMatchThreshold

  async setTheme(theme: Settings["theme"]) {
    const updated = await window.api.settings.set({ theme })
    this.setSettings(updated)
  }

  async setFontSize(fontSize: Settings["fontSize"]) {
    const updated = await window.api.settings.set({ fontSize })
    this.setSettings(updated)
  }

  async setFontFamily(fontFamily: string) {
    const updated = await window.api.settings.set({ fontFamily })
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

  async setAutoLayout(autoLayout: boolean) {
    const updated = await window.api.settings.set({ autoLayout })
    this.setSettings(updated)
  }

  async setPreferredLayout(preferredLayout: Settings["preferredLayout"]) {
    const updated = await window.api.settings.set({ preferredLayout })
    this.setSettings(updated)
  }

  async setSearchMatchThreshold(searchMatchThreshold: number) {
    const updated = await window.api.settings.set({ searchMatchThreshold })
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
