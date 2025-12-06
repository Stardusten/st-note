import { Component, createSignal, For } from "solid-js"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../solidui/dialog"
import { Switch, SwitchControl, SwitchThumb } from "../solidui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../solidui/select"
import { Button } from "../solidui/button"
import { settingsStore } from "@renderer/lib/settings/SettingsStore"
import type { Settings } from "src/preload"
import { Download, Settings2, Upload } from "lucide-solid"
import Kbd from "../solidui/kbd"

const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0

const keySymbols: Record<string, string> = {
  CommandOrControl: isMac ? "⌘" : "Ctrl",
  Command: "⌘",
  Control: "Ctrl",
  Shift: "⇧",
  Alt: isMac ? "⌥" : "Alt",
  Option: "⌥",
  Meta: isMac ? "⌘" : "Win"
}

function parseShortcut(shortcut: string): string[] {
  return shortcut.split("+").map((key) => keySymbols[key] || key)
}

type SettingsPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SettingsPanel: Component<SettingsPanelProps> = (props) => {
  const [exportError, setExportError] = createSignal<string | null>(null)
  const [importError, setImportError] = createSignal<string | null>(null)

  const handleExport = async () => {
    setExportError(null)
    const dbPath = await window.api.database.getPath()
    if (!dbPath) {
      setExportError("No database opened")
      return
    }
    const result = await window.api.database.export(dbPath)
    if (result.canceled) return
    if (!result.success) {
      setExportError(result.error || "Export failed")
    }
  }

  const handleImport = async () => {
    setImportError(null)
    const dbPath = await window.api.database.import()
    if (!dbPath) return
    window.location.reload()
  }

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle class="flex flex-row gap-2 items-center">
            <Settings2 class="size-4 stroke-[1.5px]" />
            Settings
          </DialogTitle>
        </DialogHeader>

        <div class="flex flex-col gap-6 mt-4">
          {/* Appearance */}
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
              APPEARANCE
            </div>

            <SettingRow label="Theme">
              <Select
                value={settingsStore.getTheme()}
                onChange={(val) => val && settingsStore.setTheme(val as Settings["theme"])}
                options={["light", "dark", "system"]}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                )}>
                <SelectTrigger class="w-32">
                  <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </SettingRow>

            <SettingRow label="Font Size">
              <Select
                value={settingsStore.getFontSize()}
                onChange={(val) => val && settingsStore.setFontSize(val as Settings["fontSize"])}
                options={["small", "medium", "large"]}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                )}>
                <SelectTrigger class="w-32">
                  <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </SettingRow>
          </div>

          {/* Editor */}
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
              EDITOR
            </div>
            <SettingRow label="Show Line Numbers">
              <Switch
                checked={settingsStore.getShowLineNumbers()}
                onChange={(checked) => settingsStore.setShowLineNumbers(checked)}>
                <SwitchControl>
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
            </SettingRow>

            <SettingRow label="Spell Check">
              <Switch
                checked={settingsStore.getSpellCheck()}
                onChange={(checked) => settingsStore.setSpellCheck(checked)}>
                <SwitchControl>
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
            </SettingRow>

            <SettingRow label="Auto Save">
              <Switch
                checked={settingsStore.getAutoSave()}
                onChange={(checked) => settingsStore.setAutoSave(checked)}>
                <SwitchControl>
                  <SwitchThumb />
                </SwitchControl>
              </Switch>
            </SettingRow>
          </div>

          {/* General */}
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
              GENERAL
            </div>

            <SettingRow label="Language">
              <Select
                value={settingsStore.getLanguage()}
                onChange={(val) => val && settingsStore.setLanguage(val as Settings["language"])}
                options={["zh-CN", "en-US"]}
                itemComponent={(props) => (
                  <SelectItem item={props.item}>{props.item.rawValue}</SelectItem>
                )}>
                <SelectTrigger class="w-32">
                  <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </SettingRow>
          </div>

          {/* Shortcuts */}
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
              SHORTCUTS
            </div>

            <SettingRow label="Quick Capture">
              <ShortcutDisplay shortcut={settingsStore.getQuickCaptureShortcut()} />
            </SettingRow>

            <SettingRow label="Search">
              <ShortcutDisplay shortcut={settingsStore.getSearchShortcut()} />
            </SettingRow>
          </div>

          {/* Import/Export */}
          <div class="flex flex-col gap-4">
            <div class="text-muted-foreground/60 font-medium text-[0.625rem] tracking-[0.8px]">
              DATA
            </div>

            <div class="flex flex-row gap-2">
              <Button variant="outline" onClick={handleExport}>
                <Upload class="size-4 stroke-[1.5px]" />
                Export Base
              </Button>
              <Button variant="outline" onClick={handleImport}>
                <Download class="size-4 stroke-[1.5px]" />
                Import Base
              </Button>
            </div>
            {exportError() && <div class="text-sm text-destructive">{exportError()}</div>}
            {importError() && <div class="text-sm text-destructive">{importError()}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const SettingRow: Component<{ label: string; children: any }> = (props) => {
  return (
    <div class="flex flex-row justify-between items-center">
      <span class="text-sm">{props.label}</span>
      {props.children}
    </div>
  )
}

const ShortcutDisplay: Component<{ shortcut: string }> = (props) => {
  const keys = () => parseShortcut(props.shortcut)
  return (
    <div class="flex flex-row gap-1">
      <For each={keys()}>{(key) => <Kbd>{key}</Kbd>}</For>
    </div>
  )
}

export default SettingsPanel
