import type { Page } from "@playwright/test";

// Simula execução viva, com heartbeats, não o computador suspenso entre dois ticks.
export async function advanceFocusClock(page: Page, milliseconds: number) {
  for (let remaining = milliseconds; remaining > 0; remaining -= 30_000)
    await page.clock.fastForward(Math.min(remaining, 30_000));
}
