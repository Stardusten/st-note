import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SearchAPI, SettingsAPI, GlobalSettingsAPI, DatabaseAPI, QuickAPI, CaptureSuccessAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      database: DatabaseAPI
      search: SearchAPI
      settings: SettingsAPI
      globalSettings: GlobalSettingsAPI
      quick: QuickAPI
      captureSuccess: CaptureSuccessAPI
      hideQuickWindow: () => void
      hideSearchWindow: () => void
      showSearchWindow: () => void
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
