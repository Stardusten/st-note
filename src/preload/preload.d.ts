import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SettingsAPI, GlobalSettingsAPI, DatabaseAPI, MenuAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      database: DatabaseAPI
      settings: SettingsAPI
      globalSettings: GlobalSettingsAPI
      menu: MenuAPI
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
