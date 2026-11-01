import { expect, it } from "vitest";
import { arcanaThumbnailPng } from "./arcana-png";

// A rasterização real (layout, glifos, canvas limpo) foi conferida no Edge headless; o jsdom
// não tem layout, então aqui ficam só as recusas que não dependem dele.
const card = (html: string, className = "arcana-paper") => {
  const article = document.createElement("article");
  article.className = className;
  article.innerHTML = html;
  return article;
};
it("recusa o verso e arte fora do baralho", async () => {
  await expect(arcanaThumbnailPng(card("", "arcana-paper arcana-paper--back"))).rejects.toThrow(
    "Card front required",
  );
  await expect(arcanaThumbnailPng(document.createElement("div"))).rejects.toThrow(
    "Card front required",
  );
  for (const src of ["https://example.com/a-small.webp", "/arcana/../x.webp", "/outra/a.webp", ""])
    await expect(
      arcanaThumbnailPng(
        card(`<div class="arcana-paper__scene"><img src="${src}" alt="" /></div>`),
      ),
    ).rejects.toThrow("Artwork unavailable");
});
