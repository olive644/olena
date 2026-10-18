import { defineConfig, devices } from "@playwright/test";
import { PRIVACY_POLICY_VERSION } from "./src/domain/privacy-policy";

const port = Number(process.env["PLAYWRIGHT_PORT"] ?? 4173);

export default defineConfig({
  testDir: "./e2e",
  testIgnore: "**/helena-chat-preview.spec.ts",
  fullyParallel: true,
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? "github" : "list",
  // No CI, lista no log os arquivos de teste mais lentos: é o dado para decidir o que otimizar
  // ou dividir quando for preciso gastar menos minutos (ver docs/CI_MINUTOS.md).
  reportSlowTests: process.env["CI"] ? { max: 10, threshold: 30_000 } : null,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    // Os fluxos existentes representam quem já leu o resumo. Primeira entrada
    // é exercitada com storageState vazio nos testes de onboarding e privacidade.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://127.0.0.1:${port}`,
          localStorage: [{ name: "helena.privacyNotice.v1", value: PRIVACY_POLICY_VERSION }],
        },
      ],
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env["PLAYWRIGHT_SYSTEM_EDGE"] ? { channel: "msedge" } : {}),
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["iPhone 13"],
        ...(process.env["PLAYWRIGHT_SYSTEM_EDGE"]
          ? { browserName: "chromium" as const, channel: "msedge" }
          : {}),
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
