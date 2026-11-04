import { VOICE_FILES, VOICE_MODEL, VOICE_REVISION } from "./english-asr-model";

// O modelo de voz fica no cache do navegador depois do primeiro preparo. Este marcador, só neste
// aparelho (nunca sincronizado com a conta), evita pedir o download de novo a cada prática.
const KEY = "olena.englishVoice.prepared.v1";
const CACHE = "transformers-cache"; // nome usado pelo @huggingface/transformers
const HOST = "https://huggingface.co/"; // env.remoteHost + {model}/resolve/{revision}/

export function voiceRemembered() {
  try {
    return localStorage.getItem(KEY) === VOICE_REVISION;
  } catch {
    return false;
  }
}
/** Grava ou apaga o marcador; sem armazenamento, só voltamos a perguntar na próxima prática. */
export function setVoicePrepared(prepared: boolean) {
  try {
    if (prepared) localStorage.setItem(KEY, VOICE_REVISION);
    else localStorage.removeItem(KEY);
  } catch {
    /* nada a fazer */
  }
}
/** Marcador presente E os dois pesos ainda no cache: carregar não baixa nada. */
export async function voiceModelCached() {
  try {
    if (!voiceRemembered() || typeof caches === "undefined") return false;
    const cache = await caches.open(CACHE);
    const found = await Promise.all(
      VOICE_FILES.map((file) =>
        cache.match(`${HOST}${VOICE_MODEL}/resolve/${VOICE_REVISION}/onnx/${file}`),
      ),
    );
    return found.every(Boolean);
  } catch {
    return false;
  }
}
/** Pede ao navegador que não apague os arquivos do modelo quando faltar espaço. */
export function keepVoiceStorage() {
  return navigator.storage?.persist?.().catch(() => false);
}
