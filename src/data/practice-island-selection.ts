import { ACCOUNT_OWNER_KEY } from "./personal-data";
const ITEM = "helena.practiceIsland.v1";
export function lastPracticeIsland(preference?: string) {
  try {
    const value = JSON.parse(localStorage.getItem(ITEM) ?? "null");
    return value?.owner === localStorage.getItem(ACCOUNT_OWNER_KEY) &&
      value.preference === preference &&
      typeof value.id === "string"
      ? value.id
      : undefined;
  } catch {
    return undefined;
  }
}
export function rememberPracticeIsland(id: string, preference?: string) {
  try {
    localStorage.setItem(
      ITEM,
      JSON.stringify({ owner: localStorage.getItem(ACCOUNT_OWNER_KEY), id, preference }),
    );
  } catch {
    /* A escolha visual não bloqueia a navegação sem armazenamento. */
  }
}
