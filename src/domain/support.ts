export type SupportMessage = { id: string; text: string; at: number; from: "user" | "team" };
export type SupportTicket = { id: string; updatedAt: number; messages: SupportMessage[] };
export type SupportFeed = {
  staff: boolean;
  ticket?: SupportTicket;
  inbox?: { id: string; updatedAt: number }[];
};
