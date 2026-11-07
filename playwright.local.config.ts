import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  workers: 1,
  use: { ...base.use, launchOptions: { executablePath: "/usr/bin/chromium" } },
});
