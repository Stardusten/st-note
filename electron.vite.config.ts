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
          index: resolve(__dirname, "src/renderer/index.html"), // 主窗口
          quick: resolve(__dirname, "src/renderer/quick.html") // 悬浮窗
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
