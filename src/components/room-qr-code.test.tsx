import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomQrCode } from "./room-qr-code";

describe("RoomQrCode", () => {
  it("renderiza um SVG acessível com módulos escuros para a URL", () => {
    const { container } = render(
      <RoomQrCode value="https://olenastudy.vercel.app/?sala=ABCDE" size={120} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-label")).toMatch(/qr code/i);
    expect(svg?.getAttribute("width")).toBe("120");
    expect(container.querySelector(".helena-room-qr")).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/helena-holding-qr.png");
    const path = container.querySelector("path");
    expect(path?.getAttribute("d")?.length).toBeGreaterThan(0);
  });
});
