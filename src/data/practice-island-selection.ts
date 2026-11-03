import { ACCOUNT_OWNER_KEY } from "./personal-data";
const KEY = "helena.practiceIsland.v1";
export function lastPracticeIsland() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return value?.owner === localStorage.getItem(ACCOUNT_OWNER_KEY) && typeof value.id === "string"
      ? value.id
      : undefined;
  } catch {
    return undefined;
  }
}
export function rememberPracticeIsland(id: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ owner: localStorage.getItem(ACCOUNT_OWNER_KEY), id }),
    );
  } catch {
    /* A escolha visual não bloqueia a navegação sem armazenamento. */
  }
}
