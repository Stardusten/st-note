import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI, SearchAPI, SettingsAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
      search: SearchAPI
      settings: SettingsAPI
      quick: {
        capture: (options: { content: any; checked?: boolean }) => Promise<void>
        onCapture: (callback: (data: { content: any; checked?: boolean; responseChannel: string }) => void) => void
        sendCaptured: (channel: string) => void
      }
      hideQuickWindow: () => void
      hideSearchWindow: () => void
      fetchPageTitle: (url: string) => Promise<string | null>
    }
  }
}
