import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { expect, it } from "vitest";
import { PaperFlower } from "./agenda-focus-week";
import { FriendIcon } from "./profile-friend-icon";
import { ProfileQrIcon } from "./profile-qr-icon";

const unsafeSvg = /<script|https?:\/\/(?!www\.w3\.org\/)/;

it("aceita somente o host exato do namespace SVG, sem domínios parecidos", () => {
  expect('xmlns="http://www.w3.org/2000/svg"').not.toMatch(unsafeSvg);
  for (const host of ["wwwXw3.org", "www.w3Xorg", "www.w3.org.evil.test"])
    expect(`https://${host}/image.svg`).toMatch(unsafeSvg);
});

it.each([true, false])("flor conserva facetas, cores e rotação originais: %s", (active) => {
  const { container } = render(<PaperFlower active={active} />);
  const image = container.querySelector("img")!;
  expect(image.classList.contains("is-active")).toBe(active);
  const art = readFileSync(`public${image.getAttribute("src")}`, "utf8");
  expect(art.match(/<path /g)).toHaveLength(7);
  expect(art).toContain('viewBox="40 20 170 220"');
  expect(art.includes('transform="rotate(45 126 105)"')).toBe(!active);
  expect(art).toContain(active ? "#f27e92" : "#b7a184");
});
it("ícones de amigos e QR usam a arte original como recurso cacheável", () => {
  const { container } = render(
    <>
      <FriendIcon />
      <ProfileQrIcon />
    </>,
  );
  expect(container.querySelector("img")?.getAttribute("src")).toBe(
    "/navigation-icons/paper/profile-friend.svg",
  );
  expect(container.querySelector("use")?.getAttribute("href")).toBe(
    "/navigation-icons/paper/profile-qr.svg#qr",
  );
  for (const name of ["profile-friend", "profile-contacts", "profile-search", "profile-qr"]) {
    const art = readFileSync(`public/navigation-icons/paper/${name}.svg`, "utf8");
    expect(art).toContain("<path");
    expect(art).not.toMatch(unsafeSvg);
  }
});
