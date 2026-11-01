export type DiscordAccountLogCode =
  | "discord-log-public"
  | "discord-log-extra-viewer"
  | "discord-log-bot-access"
  | "discord-log-destination"
  | "discord-token-invalid"
  | "discord-channel-access"
  | "discord-send-denied"
  | "discord-rate-limit"
  | "discord-unavailable"
  | "discord-invalid-response";

export class DiscordAccountLogError extends Error {
  constructor(
    readonly code: DiscordAccountLogCode,
    readonly target?: "category" | "channel",
  ) {
    super(code);
  }
}
