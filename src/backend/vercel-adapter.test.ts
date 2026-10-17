import { Readable } from "node:stream";
import type { ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { MAX_REQUEST_BODY_BYTES, createVercelHandler, type VercelRequest } from "./vercel-adapter";

function incoming(chunks: Buffer[], headers: Record<string, string> = {}): VercelRequest {
  return Object.assign(Readable.from(chunks), {
    method: "POST",
    url: "/api/x",
    headers: { host: "helena.example", ...headers },
  }) as unknown as VercelRequest;
}

function outgoing() {
  const captured = { status: 0, body: "" };
  const response = {
    statusCode: 0,
    writableEnded: false,
    once: vi.fn(),
    removeListener: vi.fn(),
    setHeader: vi.fn(),
    end(value: Buffer | string) {
      captured.status = this.statusCode;
      captured.body = value.toString();
    },
  };
  return { captured, response: response as unknown as ServerResponse };
}

describe("adaptador da Vercel", () => {
  it("entrega corpos normais ao handler", async () => {
    const handler = vi.fn(async (request: Request) => new Response(await request.text()));
    const { captured, response } = outgoing();
    await createVercelHandler("/api/x", handler)(incoming([Buffer.from("ola")]), response);
    expect(captured.body).toBe("ola");
  });

  it("recusa com 413, sem chamar o handler, quando o cabeçalho já declara corpo grande demais", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const { captured, response } = outgoing();
    await createVercelHandler("/api/x", handler)(
      incoming([Buffer.from("x")], { "content-length": String(MAX_REQUEST_BODY_BYTES + 1) }),
      response,
    );
    expect(captured.status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });

  it("interrompe a leitura quando o fluxo passa do teto, mesmo sem content-length honesto", async () => {
    const handler = vi.fn(async () => new Response("ok"));
    const { captured, response } = outgoing();
    const piece = Buffer.alloc(1_000_000, 97);
    const request = incoming(Array.from({ length: 6 }, () => piece));
    await createVercelHandler("/api/x", handler)(request, response);
    expect(captured.status).toBe(413);
    expect(handler).not.toHaveBeenCalled();
  });
});
