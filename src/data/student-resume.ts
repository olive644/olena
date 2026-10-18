import { writeSyncedStorage } from "./synced-storage";
import { ACCOUNT_PROFILE_KEY, profileRecord } from "../domain/profile-progress";
export const STUDENT_RESUME_KEY = ACCOUNT_PROFILE_KEY;
type Resume = {
  notebook?: { id: string; page?: string; at: number };
  focus?: { mode: "timer" | "pomodoro"; at: number };
};
export function readStudentResume(): Resume {
  try {
    const value: unknown = profileRecord(localStorage.getItem(STUDENT_RESUME_KEY))["studentResume"];
    if (!value || typeof value !== "object") return {};
    const result: Resume = {};
    if ("notebook" in value && value.notebook && typeof value.notebook === "object") {
      const book = value.notebook;
      if (
        "id" in book &&
        typeof book.id === "string" &&
        "at" in book &&
        typeof book.at === "number"
      )
        result.notebook = {
          id: book.id,
          at: book.at,
          ...("page" in book && typeof book.page === "string" ? { page: book.page } : {}),
        };
    }
    if ("focus" in value && value.focus && typeof value.focus === "object") {
      const focus = value.focus;
      if (
        "mode" in focus &&
        (focus.mode === "timer" || focus.mode === "pomodoro") &&
        "at" in focus &&
        typeof focus.at === "number"
      )
        result.focus = { mode: focus.mode, at: focus.at };
    }
    return result;
  } catch {
    return {};
  }
}
export function saveStudentResume(value: Resume) {
  try {
    writeSyncedStorage(
      STUDENT_RESUME_KEY,
      JSON.stringify({
        ...profileRecord(localStorage.getItem(STUDENT_RESUME_KEY)),
        studentResume: { ...readStudentResume(), ...value },
      }),
    );
  } catch {
    /* Retomar é uma conveniência, nunca deve impedir o estudo. */
  }
}
