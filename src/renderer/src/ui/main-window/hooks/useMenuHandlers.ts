import { onMount } from "solid-js"
import { appStore } from "@renderer/lib/state/AppStore"

export function useMenuHandlers(focusSearchInput: () => void) {
  onMount(() => {
    window.api.menu.onExport(async () => {
      const currentPath = appStore.getDbPath()
      if (!currentPath) return
      const result = await window.api.database.export(currentPath)
      if (result.success) alert(`Exported to: ${result.path}`)
      else if (!result.canceled && result.error) alert(`Export failed: ${result.error}`)
    })

    window.api.menu.onImport(async () => {
      const path = await window.api.database.import()
      if (path) {
        await appStore.close()
        await appStore.initWithPath(path)
        focusSearchInput()
      }
    })

    window.api.menu.onNewDatabase(async () => {
      const path = await window.api.database.new()
      if (path) {
        await appStore.close()
        await appStore.initWithPath(path)
        focusSearchInput()
      }
    })

    window.api.menu.onOpenDatabase(async () => {
      const path = await window.api.database.import()
      if (path) {
        await appStore.close()
        await appStore.initWithPath(path)
        focusSearchInput()
      }
    })
  })
}
