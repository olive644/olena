import type { KvStore } from "./kv-store.js";
import { checkRateLimit } from "./rate-limit.js";

// Gerar áudio custa na conta do Cloudflare e a voz individual não exige login. Por isso a
// geração tem limite por endereço (minuto e dia) e um teto global diário: muitos endereços
// juntos não esgotam a cota de todos os outros.
export function createSpeechGenerationQuota(store: KvStore) {
  return {
    async consume(clientId: string): Promise<boolean> {
      return (
        (await checkRateLimit(store, "speech-generation-rate-limit", clientId, 30, 60)) &&
        (await checkRateLimit(store, "speech-generation-day", clientId, 600, 86400)) &&
        (await checkRateLimit(store, "speech-generation-global-day", "all", 6000, 86400))
      );
    },
  };
}
