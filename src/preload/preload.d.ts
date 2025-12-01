import { ElectronAPI } from "@electron-toolkit/preload"
import type { StorageAPI } from "./index"

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      storage: StorageAPI
    }
  }
}
