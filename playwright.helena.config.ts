import { defineConfig } from "@playwright/test";
import applicationConfig from "./playwright.config";

const port = Number(process.env["PLAYWRIGHT_PORT"] ?? 4185);

// O preview não faz parte do bundle de produção. Testá-lo no servidor Vite.
export default defineConfig({
  ...applicationConfig,
  testMatch: "**/helena-chat-preview.spec.ts",
  testIgnore: [],
  use: { ...applicationConfig.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/preview-helena-chat.html`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
