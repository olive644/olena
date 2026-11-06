import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Icon = { src: string; sizes: string; type: string; purpose?: string };
type WebManifest = {
  id: string;
  name: string;
  short_name: string;
  lang: string;
  start_url: string;
  scope: string;
  display: string;
  background_color: string;
  theme_color: string;
  icons: Icon[];
};
const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8")) as WebManifest;
const twa = JSON.parse(readFileSync("android/twa-manifest.json", "utf8")) as Record<
  string,
  unknown
>;
const html = readFileSync("index.html", "utf8");
const vercel = JSON.parse(readFileSync("vercel.json", "utf8")) as {
  headers: { source: string; headers: { key: string; value: string }[] }[];
};
const FINGERPRINT = Array.from({ length: 32 }, (_, i) =>
  (i * 7 + 1).toString(16).toUpperCase().padStart(2, "0"),
).join(":");

function makeAssetLinks(...args: string[]) {
  return spawnSync(process.execPath, ["scripts/android/make-assetlinks.mjs", "--stdout", ...args], {
    encoding: "utf8",
  });
}

describe("manifesto web do app", () => {
  it("tem o que o Android e o Chrome exigem para instalar e abrir em tela cheia", () => {
    expect(manifest.name).toBe("OlenaStudy");
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.scope).toBe("/");
    expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(manifest.theme_color).toBe("#fff9ef");
  });

  it("declara ícones de 192 e 512 px e um mascarável, e todos os arquivos existem com o tamanho dito", () => {
    const purposes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(purposes).toContain("192x192:any");
    expect(purposes).toContain("512x512:any");
    expect(purposes).toContain("512x512:maskable");
    for (const icon of manifest.icons) {
      const path = `public${icon.src}`;
      expect(existsSync(path), path).toBe(true);
      expect(icon.type).toBe("image/png");
      // IHDR do PNG: largura e altura em big-endian nos bytes 16 a 23
      const data = readFileSync(path);
      const side = Number(icon.sizes.split("x")[0]);
      expect([data.readUInt32BE(16), data.readUInt32BE(20)]).toEqual([side, side]);
    }
  });

  it("o ícone da loja tem 512 x 512 px, é PNG e fica abaixo do limite de 1 MB da Play", () => {
    const path = "android/store/play-store-icon-512.png";
    const data = readFileSync(path);
    expect([data.readUInt32BE(16), data.readUInt32BE(20)]).toEqual([512, 512]);
    expect(statSync(path).size).toBeLessThan(1024 * 1024);
  });

  it("é ligado no HTML e a CSP padrão do site já permite carregá-lo", () => {
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    const csp =
      vercel.headers
        .find((rule) => rule.source === "/(.*)")
        ?.headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain("manifest-src");
  });

  it("serve o manifesto e o assetlinks com o tipo certo", () => {
    const type = (source: string) =>
      vercel.headers
        .find((rule) => rule.source === source)
        ?.headers.find((header) => header.key === "Content-Type")?.value;
    expect(type("/manifest.webmanifest")).toBe("application/manifest+json");
    expect(type("/.well-known/assetlinks.json")).toBe("application/json");
  });
});

describe("configuração do app Android (TWA)", () => {
  it("usa um nome de pacote válido e o mesmo site, manifesto e cores do app web", () => {
    expect(twa["packageId"]).toMatch(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/);
    expect(twa["host"]).toBe("olenastudy.vercel.app");
    expect(twa["webManifestUrl"]).toBe("https://olenastudy.vercel.app/manifest.webmanifest");
    expect(twa["startUrl"]).toBe(manifest.start_url);
    expect(twa["backgroundColor"]).toBe(manifest.background_color);
    expect(twa["themeColor"]).toBe(manifest.theme_color);
    expect(twa["enableNotifications"]).toBe(false);
  });

  it("não guarda a chave de assinatura no repositório", () => {
    const ignore = readFileSync(".gitignore", "utf8");
    expect(ignore).toMatch(/^\*\.keystore$/m);
    expect(ignore).toMatch(/^\*\.jks$/m);
    expect(JSON.stringify(twa)).not.toMatch(/password/i);
  });

  it("só publica o assetlinks com pacote igual ao da configuração e impressão válida", () => {
    const published = "public/.well-known/assetlinks.json";
    if (!existsSync(published)) return; // ainda não há impressão digital real da Play
    const links = JSON.parse(readFileSync(published, "utf8")) as {
      target: { package_name: string; sha256_cert_fingerprints: string[] };
    }[];
    expect(links[0]?.target.package_name).toBe(twa["packageId"]);
    for (const value of links[0]?.target.sha256_cert_fingerprints ?? [])
      expect(value).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });
});

describe("gerador do assetlinks", () => {
  it("monta o arquivo no formato da Digital Asset Links com o pacote da configuração", () => {
    const result = makeAssetLinks("--fingerprint", FINGERPRINT.toLowerCase());
    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: twa["packageId"],
          sha256_cert_fingerprints: [FINGERPRINT],
        },
      },
    ]);
  });

  it("aceita mais de uma impressão e remove repetidas", () => {
    const result = makeAssetLinks(
      "--fingerprint",
      FINGERPRINT,
      "--fingerprint",
      FINGERPRINT,
      "--fingerprint",
      FINGERPRINT.replace(/^../, "FF"),
    );
    expect(JSON.parse(result.stdout)[0].target.sha256_cert_fingerprints).toHaveLength(2);
  });

  it("recusa impressão curta, sem separador, pacote inválido ou nenhuma impressão", () => {
    expect(makeAssetLinks("--fingerprint", "AA:BB").status).toBe(1);
    expect(makeAssetLinks("--fingerprint", FINGERPRINT.replace(/:/g, "")).status).toBe(1);
    expect(makeAssetLinks("--package", "OlenaStudy", "--fingerprint", FINGERPRINT).status).toBe(1);
    expect(makeAssetLinks("--package", "olenastudy", "--fingerprint", FINGERPRINT).status).toBe(1);
    expect(makeAssetLinks().status).toBe(1);
    expect(makeAssetLinks("--oops").status).toBe(1);
  });
});
