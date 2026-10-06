import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomQrCode } from "./room-qr-code";

describe("RoomQrCode", () => {
  it("uses Poliana only for bingo and retains a functional QR", () => {
    const { container } = render(
      <RoomQrCode value="https://olenastudy.vercel.app/?sala=ABCDE" bingo />,
    );
    expect(container.querySelector(".poliana-room-qr img")?.getAttribute("src")).toBe(
      "/poliana-room-invite.webp",
    );
    expect(container.querySelectorAll("[data-qr-finder]")).toHaveLength(3);
    expect(container.querySelector("svg")?.getAttribute("data-qr-error-correction")).toBe("H");
  });
  it("renderiza um QR transparente com a Helena integrada e três marcadores", () => {
    const { container } = render(
      <RoomQrCode value="https://olenastudy.vercel.app/?sala=ABCDE" size={120} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-label")).toMatch(/qr code/i);
    expect(svg?.getAttribute("data-qr-error-correction")).toBe("H");
    expect(svg?.getAttribute("width")).toBe("120");
    expect(container.querySelector(".helena-room-qr")).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/helena-room-invite.webp");
    expect(container.querySelector("[data-qr-modules]")?.getAttribute("d")?.length).toBeGreaterThan(
      0,
    );
    expect(container.querySelectorAll("[data-qr-finder]")).toHaveLength(3);
    expect(container.querySelector("[data-qr-finder] rect")?.getAttribute("fill")).toBe("#0B5C66");
    expect(container.querySelector("[data-qr-logo]")?.getAttribute("href")).toBe(
      "/favicon-star.svg",
    );
    expect(svg?.querySelectorAll("rect")).toHaveLength(9);
  });
});
