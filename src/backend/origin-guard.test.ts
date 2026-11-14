import { describe, expect, it } from "vitest";
import { createMemoryRoomStore } from "./room-transaction";
import { createNotebookCollabHandler } from "./notebook-collab-handler";
import { handleOnboarding } from "./onboarding-handler";

// Todo pedido que muda estado precisa recusar uma página de outro site. Este teste percorre as
// ações de escrita de cada endpoint que usa a verificação de Origin e falha se alguma esquecer.
const foreign = "https://pagina-de-outro-site.example";

describe("origem de outro site", () => {
  const collabActions = [
    "create",
    "join",
    "resume",
    "cursor",
    "heartbeat",
    "leave",
    "pages",
    "update",
    "view-create",
    "view-read",
    "view-revoke",
  ];
  it.each(collabActions)("cadernos compartilhados recusam a ação %s", async (action) => {
    const handler = createNotebookCollabHandler({
      store: createMemoryRoomStore(),
      publish: async () => {},
      streamUrl: () => "",
    });
    const response = await handler(
      new Request(`https://helena.example/api/notebook-collab?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: foreign },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(403);
  });

  it("onboarding recusa Origin estranho, mesmo com corpo válido", async () => {
    const response = await handleOnboarding(
      new Request("https://helena.example/api/olena?action=onboarding&version=1", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: foreign },
        body: JSON.stringify({ answers: [] }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
