// A voz natural (Cloudflare MeloTTS) foi desligada para guardar a cota gratuita da Cloudflare
// para o resumo. O app cai sozinho na voz do aparelho. Para religar, restaure o handler anterior
// (createSpeechHandler com createCloudflareTtsProvider) a partir do histórico do git.
export default function handler(
  _request: unknown,
  response: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body: string): void;
  },
): void {
  response.statusCode = 410;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(
    JSON.stringify({
      error: "voice_disabled",
      message: "A voz natural foi desligada. Use a voz do aparelho.",
    }),
  );
}
