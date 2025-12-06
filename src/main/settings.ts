import { app } from "electron"
import { join } from "path"
import { readFileSync, writeFileSync, existsSync } from "fs"

export type Settings = {
  theme: "light" | "dark" | "system"
  fontSize: "small" | "medium" | "large"
  showLineNumbers: boolean
  spellCheck: boolean
  quickCaptureShortcut: string
  searchShortcut: string
  language: "zh-CN" | "en-US"
  autoSave: boolean
}

const defaultSettings: Settings = {
  theme: "dark",
  fontSize: "medium",
  showLineNumbers: false,
  spellCheck: false,
  quickCaptureShortcut: "CommandOrControl+Shift+C",
  searchShortcut: "CommandOrControl+Shift+P",
  language: "zh-CN",
  autoSave: true
}

function getSettingsPath(): string {
  return join(app.getPath("userData"), "settings.json")
}

export function loadSettings(): Settings {
  const path = getSettingsPath()
  if (!existsSync(path)) return { ...defaultSettings }
  try {
    const data = readFileSync(path, "utf-8")
    return { ...defaultSettings, ...JSON.parse(data) }
  } catch {
    return { ...defaultSettings }
  }
}

export function saveSettings(settings: Settings): void {
  const path = getSettingsPath()
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8")
}

export function updateSettings(partial: Partial<Settings>): Settings {
  const current = loadSettings()
  const updated = { ...current, ...partial }
  saveSettings(updated)
  return updated
}

export function exportSettings(): string {
  const settings = loadSettings()
  return JSON.stringify(settings, null, 2)
}

export function importSettings(json: string): Settings {
  const imported = JSON.parse(json)
  const settings = { ...defaultSettings, ...imported }
  saveSettings(settings)
  return settings
}

export { defaultSettings }
