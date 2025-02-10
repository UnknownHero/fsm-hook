/// <reference types="vitest" />

import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./setupTests.ts"],
    coverage: {
      enabled: true,
      include: ['src/**/*'],
      reporter: ['text', 'json', 'html'],
      all: true,
      thresholds: {
        lines: 100,
      }
    }
  },
})