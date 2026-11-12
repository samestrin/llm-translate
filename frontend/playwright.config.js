import { defineConfig, devices } from '@playwright/test'

// A port per checkout, so parallel worktrees never reuse another checkout's stale build.
const port = 4173 + ([...process.cwd()].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 0) % 500)
const baseURL = `http://localhost:${port}`

export default defineConfig({
  testDir: './e2e',
  // The live capture needs a running instance with real models; only `npm run capture:live` runs it.
  testIgnore: ['live/**'],
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
