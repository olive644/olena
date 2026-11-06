// Gera public/.well-known/assetlinks.json, o arquivo que prova ao Android que o app da Play e o
// site são do mesmo dono (sem ele, o app abre o site com a barra do navegador por cima).
//
// A impressão digital (SHA-256) é a da chave de assinatura que a Play usa no app publicado: em
// Play Console > Teste e lançamento > Integridade do app > Assinatura de apps, "Certificado da
// chave de assinatura do app". Se você também instala builds assinados com a chave de upload,
// repita --fingerprint com a impressão dela. O arquivo só deve ser publicado com valores reais:
// uma impressão errada faz a verificação falhar sem avisar.
//
// Uso:
//   node scripts/android/make-assetlinks.mjs --fingerprint AA:BB:...:FF [--fingerprint ...]
//   opções: --package app.olenastudy (padrão: android/twa-manifest.json) e --stdout
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (path) => fileURLToPath(new URL(`../../${path}`, import.meta.url));
const PACKAGE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const args = process.argv.slice(2);
const fingerprints = [];
let packageName = JSON.parse(readFileSync(root("android/twa-manifest.json"), "utf8")).packageId;
let toStdout = false;
for (let index = 0; index < args.length; index++) {
  const flag = args[index];
  if (flag === "--stdout") toStdout = true;
  else if (flag === "--package") packageName = args[++index] ?? "";
  else if (flag === "--fingerprint") fingerprints.push((args[++index] ?? "").trim().toUpperCase());
  else fail(`Opção desconhecida: ${flag}`);
}
if (!PACKAGE.test(packageName)) fail(`Nome de pacote inválido: ${packageName}`);
if (fingerprints.length === 0) fail("Informe ao menos uma --fingerprint (SHA-256, AA:BB:...).");
for (const value of fingerprints)
  if (!FINGERPRINT.test(value))
    fail(
      `Impressão digital inválida (esperado 32 bytes em hexadecimal separados por dois-pontos): ${value}`,
    );

const links = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: packageName,
      sha256_cert_fingerprints: [...new Set(fingerprints)],
    },
  },
];
const text = `${JSON.stringify(links, null, 2)}\n`;
if (toStdout) process.stdout.write(text);
else {
  mkdirSync(root("public/.well-known"), { recursive: true });
  writeFileSync(root("public/.well-known/assetlinks.json"), text);
  console.log("public/.well-known/assetlinks.json escrito para", packageName);
}
