import { defineConfig, devices } from "@playwright/test";

// E2E はローカル Supabase(supabase start)が起動している前提で実行する。
// NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を環境変数で渡すこと。
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    // モバイルファースト(375px幅)で検証する(品質基準)
    viewport: { width: 375, height: 812 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 } },
    },
  ],
  webServer: {
    // CIでは本番ビルドで検証する(devサーバー固有の挙動を排除し、実運用に近づける)
    command: process.env.CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
