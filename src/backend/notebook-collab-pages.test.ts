import { expect, it } from "vitest";
import { createMemoryRoomStore } from "./room-transaction";
import { createNotebookCollabHandler } from "./notebook-collab-handler";
import { mergeNotebookPages, type PublicNotebookCollabState } from "../domain/notebook-collab";

it("compartilha todas as folhas, isola suas tintas e conserva edições ao mudar o índice", async () => {
  const handler = createNotebookCollabHandler({
    store: createMemoryRoomStore(),
    publish: async () => {},
    streamUrl: () => "",
  });
  const call = (action: string, body: object) =>
    handler(
      new Request(`https://test.example/api/notebook-collab?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  const doc = (pageText: string) => ({ version: 1, paper: "ruled", strokes: [], pageText });
  const initial = [
    { id: "one", title: "Primeira", document: doc("um") },
    { id: "two", title: "Segunda", document: doc("dois") },
  ];
  const created = (await (
    await call("create", {
      notebookId: "book",
      displayName: "Alice",
      pages: initial,
      title: "Caderno inteiro",
    })
  ).json()) as { code: string; hostToken: string };
  const joined = (await (
    await call("join", { code: created.code, displayName: "Bob" })
  ).json()) as { participantToken: string; state: PublicNotebookCollabState };
  expect(joined.state.pages).toHaveLength(2);
  expect(joined.state.title).toBe("Caderno inteiro");
  const updated = await call("update", {
    code: created.code,
    credential: joined.participantToken,
    pageId: "two",
    document: doc("nova tinta"),
    baseDocument: doc("dois"),
  });
  expect(updated.status).toBe(200);
  const edited = ((await updated.json()) as { state: PublicNotebookCollabState }).state;
  expect(edited.pages?.[0]?.document?.pageText).toBe("um");
  expect(edited.pages?.[1]?.document?.pageText).toBe("nova tinta");
  const indexed = await call("pages", {
    code: created.code,
    credential: created.hostToken,
    basePages: initial,
    pages: [{ ...initial[1], title: "Renomeada" }, initial[0], { id: "three", title: "Terceira" }],
  });
  const index = ((await indexed.json()) as { state: PublicNotebookCollabState }).state.pages;
  expect(index?.map((p) => p.id)).toEqual(["two", "one", "three"]);
  expect(index?.[0]?.document?.pageText).toBe("nova tinta");
  expect(
    (
      await call("update", {
        code: created.code,
        credential: created.hostToken,
        pageId: "missing",
        document: doc("erro"),
      })
    ).status,
  ).toBe(409);
});

it("índice preserva criação local e aceita reordenação remota sem reintroduzir folha excluída", () => {
  const a = { id: "a", title: "A" },
    b = { id: "b", title: "B" },
    c = { id: "c", title: "C" };
  expect(mergeNotebookPages([a, b], [a, b], [b, a])).toEqual([b, a]);
  expect(mergeNotebookPages([a, b], [a, b, c], [a])).toEqual([a, c]);
  expect(mergeNotebookPages([a, b], [b], [a, b, c])).toEqual([b, c]);
});
