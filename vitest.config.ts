import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true
  },
  resolve: {
    alias: {
      "@renderer": path.resolve(__dirname, "./src/renderer/src")
    }
  }
})
