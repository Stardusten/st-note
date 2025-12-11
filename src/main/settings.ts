import { app } from "electron"
import { join } from "path"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { getAllSettings, setSetting } from "./storage"

// ============ 知识库设置（存储在 SQLite） ============

export type VaultSettings = {
  theme: "light" | "dark" | "system"
  fontSize: "small" | "medium" | "large"
  showLineNumbers: boolean
  spellCheck: boolean
  quickCaptureShortcut: string
  searchShortcut: string
  language: "zh-CN" | "en-US"
  autoSave: boolean
  timestampFormat: string
}

export const defaultVaultSettings: VaultSettings = {
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

export function loadVaultSettings(dbPath: string): VaultSettings {
  const raw = getAllSettings(dbPath)
  const result = { ...defaultVaultSettings }
  for (const key of Object.keys(defaultVaultSettings) as (keyof VaultSettings)[]) {
    if (raw[key] !== undefined) {
      const value = raw[key]
      if (typeof defaultVaultSettings[key] === "boolean") {
        ;(result as any)[key] = value === "true"
      } else {
        ;(result as any)[key] = value
      }
    }
  }
  return result
}

export function saveVaultSettings(dbPath: string, settings: VaultSettings): void {
  for (const key of Object.keys(settings) as (keyof VaultSettings)[]) {
    setSetting(dbPath, key, String(settings[key]))
  }
}

export function updateVaultSettings(dbPath: string, partial: Partial<VaultSettings>): VaultSettings {
  const current = loadVaultSettings(dbPath)
  const updated = { ...current, ...partial }
  saveVaultSettings(dbPath, updated)
  return updated
}

// ============ 全局设置（存储在 userData JSON） ============

export type GlobalSettings = {
  lastDatabase: string | null
  recentDatabases: string[]
  bringToFrontShortcut: string
}

const defaultGlobalSettings: GlobalSettings = {
  lastDatabase: null,
  recentDatabases: [],
  bringToFrontShortcut: "CommandOrControl+Shift+Space"
}

function getGlobalSettingsPath(): string {
  return join(app.getPath("userData"), "global-settings.json")
}

export function loadGlobalSettings(): GlobalSettings {
  const path = getGlobalSettingsPath()
  if (!existsSync(path)) return { ...defaultGlobalSettings }
  try {
    const data = readFileSync(path, "utf-8")
    return { ...defaultGlobalSettings, ...JSON.parse(data) }
  } catch {
    return { ...defaultGlobalSettings }
  }
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  const path = getGlobalSettingsPath()
  writeFileSync(path, JSON.stringify(settings, null, 2), "utf-8")
}

export function updateGlobalSettings(partial: Partial<GlobalSettings>): GlobalSettings {
  const current = loadGlobalSettings()
  const updated = { ...current, ...partial }
  saveGlobalSettings(updated)
  return updated
}

export function addRecentDatabase(dbPath: string): GlobalSettings {
  const current = loadGlobalSettings()
  const filtered = current.recentDatabases.filter((p) => p !== dbPath)
  const updated: GlobalSettings = {
    ...current,
    lastDatabase: dbPath,
    recentDatabases: [dbPath, ...filtered].slice(0, 10)
  }
  saveGlobalSettings(updated)
  return updated
}

// ============ 兼容旧版：迁移旧设置 ============

export type Settings = VaultSettings

export const defaultSettings = defaultVaultSettings

function getOldSettingsPath(): string {
  return join(app.getPath("userData"), "settings.json")
}

export function migrateOldSettingsToVault(dbPath: string): void {
  const oldPath = getOldSettingsPath()
  if (!existsSync(oldPath)) return

  const hasAnySettings = Object.keys(getAllSettings(dbPath)).length > 0
  if (hasAnySettings) return

  try {
    const oldData = JSON.parse(readFileSync(oldPath, "utf-8"))
    const merged = { ...defaultVaultSettings, ...oldData }
    saveVaultSettings(dbPath, merged)
  } catch {
    // ignore
  }
}

// ============ 兼容旧 API（将被逐步废弃） ============

let currentDbPath: string | null = null

export function setCurrentDatabase(dbPath: string | null): void {
  currentDbPath = dbPath
}

export function loadSettings(): Settings {
  if (!currentDbPath) return { ...defaultVaultSettings }
  return loadVaultSettings(currentDbPath)
}

export function saveSettings(settings: Settings): void {
  if (!currentDbPath) return
  saveVaultSettings(currentDbPath, settings)
}

export function updateSettings(partial: Partial<Settings>): Settings {
  if (!currentDbPath) return { ...defaultVaultSettings, ...partial }
  return updateVaultSettings(currentDbPath, partial)
}

export function exportSettings(): string {
  return JSON.stringify(loadSettings(), null, 2)
}

export function importSettings(json: string): Settings {
  const imported = JSON.parse(json)
  const settings = { ...defaultVaultSettings, ...imported }
  saveSettings(settings)
  return settings
}
