import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { handleOlena } from "./src/backend/olena-handler";
import { createVercelHandler } from "./src/backend/vercel-adapter";
const enemCatalog = JSON.parse(
  readFileSync(new URL("./public/enem/catalog.json", import.meta.url), "utf8"),
) as {
  papers: { year: number; day: number; variants: { url: string; answerUrl: string | null }[] }[];
};
const enemPaths = new Set(
  enemCatalog.papers.flatMap((p) =>
    p.variants.flatMap((v) =>
      [v.url, v.answerUrl]
        .filter((url): url is string => !!url)
        .map((url) => new URL(url).pathname),
    ),
  ),
);
async function enemPdfMiddleware(request: IncomingMessage, response: ServerResponse) {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (!enemPaths.has(path)) {
    response.statusCode = 404;
    response.end();
    return;
  }
  try {
    let data: Buffer;
    const cached = enemCatalog.papers.find(
      (p) =>
        new URL(p.variants[0]!.url).pathname === path ||
        (p.variants[0]!.answerUrl && new URL(p.variants[0]!.answerUrl!).pathname === path),
    );
    let cachedData: Buffer | undefined;
    if (cached) {
      try {
        const answer = new URL(cached.variants[0]!.url).pathname !== path;
        cachedData = readFileSync(
          new URL(
            `./tmp/enem-acervo/${cached.year}-${cached.day}${answer ? "-answer" : ""}.pdf`,
            import.meta.url,
          ),
        );
      } catch {
        /* Busca o original se o cache de desenvolvimento ainda não existe. */
      }
    }
    if (cachedData) data = cachedData;
    else if (process.platform === "win32") {
      // curl usa os certificados do Windows, como o navegador do usuário.
      const result = await promisify(execFile)(
        "curl.exe",
        [
          "--fail",
          "--silent",
          "--show-error",
          "--location",
          "--max-time",
          "45",
          `https://download.inep.gov.br${path}`,
        ],
        { encoding: "buffer", maxBuffer: 64 * 1024 * 1024, windowsHide: true },
      );
      data = result.stdout;
    } else {
      const pdf = await fetch(`https://download.inep.gov.br${path}`, {
        signal: AbortSignal.timeout(45000),
      });
      if (!pdf.ok) {
        response.statusCode = 502;
        response.end();
        return;
      }
      data = Buffer.from(await pdf.arrayBuffer());
    }
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader("Cache-Control", "public, max-age=86400");
    response.end(data);
  } catch {
    response.statusCode = 502;
    response.end();
  }
}

async function helenaMiddleware(request: IncomingMessage, response: ServerResponse) {
  const { handleHelenaRuntime } = await import("./src/backend/helena-runtime");
  await createVercelHandler("/api/helena", handleHelenaRuntime)(request, response);
}
async function profileHandleMiddleware(request: IncomingMessage, response: ServerResponse) {
  const { handleProfileHandle } = await import("./src/backend/profile-handle-runtime");
  await createVercelHandler("/api/profile-handle", handleProfileHandle)(request, response);
}
async function accountDevicesMiddleware(request: IncomingMessage, response: ServerResponse) {
  const { handleAccountDevices } = await import("./src/backend/account-devices-runtime");
  await createVercelHandler("/api/account-devices", handleAccountDevices)(request, response);
}
async function profileSocialMiddleware(request: IncomingMessage, response: ServerResponse) {
  const { handleProfileSocial } = await import("./src/backend/profile-social-runtime");
  await createVercelHandler("/api/profile-social", handleProfileSocial)(request, response);
}

// O preview (e2e e teste local do build) serve os mesmos cabeçalhos de segurança da
// produção, inclusive o CSP. Sem isso, algo que o CSP bloqueia só falha depois do deploy.
type HeaderRule = { source: string; headers: { key: string; value: string }[] };
const vercelConfig = JSON.parse(
  readFileSync(new URL("./vercel.json", import.meta.url), "utf8"),
) as { headers: HeaderRule[] };
const productionHeaders = Object.fromEntries(
  (vercelConfig.headers.find((rule) => rule.source === "/(.*)")?.headers ?? []).map((header) => [
    header.key,
    header.value,
  ]),
);

async function olenaMiddleware(request: IncomingMessage, response: ServerResponse) {
  try {
    let body = "";
    for await (const chunk of request) {
      body += String(chunk);
      if (body.length > 4096) {
        response.statusCode = 413;
        response.end();
        return;
      }
    }
    const result = await handleOlena(
      new Request(new URL(request.url ?? "", "http://localhost/api/olena"), {
        method: request.method ?? "GET",
        headers: {
          "Content-Type": request.headers["content-type"] ?? "",
          ...(request.headers.authorization
            ? { Authorization: request.headers.authorization }
            : {}),
          ...(request.headers.origin ? { Origin: request.headers.origin } : {}),
          ...(request.headers["sec-fetch-site"]
            ? { "Sec-Fetch-Site": String(request.headers["sec-fetch-site"]) }
            : {}),
        },
        ...(body && request.method !== "GET" ? { body } : {}),
      }),
    );
    response.statusCode = result.status;
    result.headers.forEach((value, key) => response.setHeader(key, value));
    response.end(await result.text());
  } catch {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: "API indisponível." }));
  }
}
export default defineConfig({
  worker: { format: "es" },
  plugins: [
    react(),
    {
      name: "olena-local-api",
      configureServer(server) {
        server.middlewares.use("/enem-pdf", (request, response) => {
          void enemPdfMiddleware(request, response);
        });
        server.middlewares.use("/api/account-devices", (request, response) => {
          void accountDevicesMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/profile-social", (request, response) => {
          void profileSocialMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/profile-handle", (request, response) => {
          void profileHandleMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/olena", olenaMiddleware);
        server.middlewares.use("/api/helena", (request, response) => {
          void helenaMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use("/enem-pdf", (request, response) => {
          void enemPdfMiddleware(request, response);
        });
        server.middlewares.use("/api/account-devices", (request, response) => {
          void accountDevicesMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/profile-social", (request, response) => {
          void profileSocialMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/profile-handle", (request, response) => {
          void profileHandleMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
        server.middlewares.use("/api/olena", olenaMiddleware);
        server.middlewares.use("/api/helena", (request, response) => {
          void helenaMiddleware(request, response).catch(() => {
            response.statusCode = 503;
            response.end();
          });
        });
      },
    },
  ],
  resolve: {
    tsconfigPaths: true,
    dedupe: ["react", "react-dom"],
    // O tesseract.js carrega o regenerator-runtime só para navegadores sem async e
    // await nativos. O build é ES2022, então o polyfill (6,6 KB) nunca é usado.
    alias: {
      "regenerator-runtime/runtime": fileURLToPath(
        new URL("./src/build-empty-module.ts", import.meta.url),
      ),
    },
  },
  // sourcemap fica desligado no build de produção: um .map publicado exporia o
  // código-fonte original (não só o bundle minificado) a qualquer visitante.
  build: {
    target: "es2022",
    sourcemap: false,
    manifest: true,
    modulePreload: {
      // WebKit pode manter preloads que falharam mesmo após reload (bug 270357).
      // No bootstrap, deixe import() carregar o JS; conserve CSS e os demais preloads.
      resolveDependencies: (filename, dependencies) =>
        /^assets\/app-[^/]+\.js$/.test(filename)
          ? dependencies.filter((dependency) => !dependency.endsWith(".js"))
          : dependencies,
    },
  },
  preview: { headers: productionHeaders },
});
