import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SearchAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      search: SearchAPI
      hideQuickWindow: () => void
      hideSearchWindow: () => void
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
