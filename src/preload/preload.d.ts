import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SettingsAPI, GlobalSettingsAPI, DatabaseAPI, MenuAPI, FileAPI, ImageAPI, WindowAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      database: DatabaseAPI
      settings: SettingsAPI
      globalSettings: GlobalSettingsAPI
      menu: MenuAPI
      file: FileAPI
      image: ImageAPI
      window: WindowAPI
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
