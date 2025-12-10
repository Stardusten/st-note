import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SettingsAPI, GlobalSettingsAPI, DatabaseAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      database: DatabaseAPI
      settings: SettingsAPI
      globalSettings: GlobalSettingsAPI
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
