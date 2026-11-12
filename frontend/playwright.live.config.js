import { defineConfig, devices } from '@playwright/test'

// Records the README demo GIF from a real, running instance (`npm run capture:live`).
// Nothing is mocked: the page and the models are live. LIVE_URL is the instance's
// address, for example a local `docker compose up` or the review host.
const url = process.env.LIVE_URL
if (!url) throw new Error('LIVE_URL is required, for example LIVE_URL=http://localhost:3000')

export default defineConfig({
  testDir: 'e2e/live',
  testMatch: '**/*.spec.js', // guards.test.js is a vitest unit test, not a live recording
  retries: 2, // a live model can fail one stream; try the whole recording again
  workers: 1,
  timeout: 10 * 60 * 1000,
  use: { baseURL: url },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } }],
})
