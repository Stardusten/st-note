import { resolve } from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import solid from "vite-plugin-solid"

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "src/renderer/index.html"),
          settings: resolve(__dirname, "src/renderer/settings.html"),
          "image-viewer": resolve(__dirname, "src/renderer/image-viewer.html")
        }
      }
    },
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [solid()]
  }
})
