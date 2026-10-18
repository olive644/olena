import { expect, it } from "vitest";
import { supportRelayConfiguration, supportRelayEvent } from "./support-integration";

const ticket = "a".repeat(64);
const message = {
  id: "12345678-1234-1234-1234-123456789abc",
  text: "Preciso de ajuda",
  at: 1000,
  from: "user" as const,
};
it("keeps external delivery disabled", () => {
  expect(supportRelayConfiguration).toEqual({ enabled: false });
});
it("projects only the necessary fields with a stable idempotency key", () => {
  const event = supportRelayEvent(ticket, { ...message, text: "@everyone <script>" });
  expect(event).toEqual({
    version: 1,
    key: `support.v1:${ticket}:${message.id}`,
    ticketId: ticket,
    messageId: message.id,
    text: "@everyone <script>",
    at: 1000,
  });
  expect(supportRelayEvent(ticket, message)?.key).toBe(supportRelayEvent(ticket, message)?.key);
});
it("does not relay staff replies or accept arbitrary external paths", () => {
  expect(supportRelayEvent(ticket, { ...message, from: "team" })).toBeUndefined();
  expect(() => supportRelayEvent("../../account", message)).toThrow("invalid-support-ticket");
  expect(() => supportRelayEvent(ticket, { ...message, id: "untrusted" })).toThrow(
    "invalid-support-message",
  );
});
