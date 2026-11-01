import type { User } from "firebase/auth";
import { prepareAccountLog } from "./account-auth";
import { PRIVACY_POLICY_VERSION, readPrivacyConsent } from "../domain/privacy-policy";

// Atividade observada no app, não presença online garantida.
export function startAccountActivity(currentUser: () => User | null) {
  let active = true;
  let pending = false;
  const reported = new Map<string, number>();
  const report = () => {
    const user = currentUser();
    if (
      !active ||
      pending ||
      !user ||
      user.isAnonymous ||
      readPrivacyConsent(localStorage)?.version !== PRIVACY_POLICY_VERSION ||
      document.visibilityState === "hidden" ||
      Date.now() - (reported.get(user.uid) ?? 0) < 1800000
    )
      return;
    pending = true;
    reported.set(user.uid, Date.now());
    void (async () => {
      try {
        const log = await prepareAccountLog(user);
        if (!active || currentUser()?.uid !== user.uid || !log) return;
        await log("activity");
        reported.set(user.uid, Date.now());
      } catch {
        /* Melhor esforço, nenhuma fila com credenciais. */
      } finally {
        pending = false;
      }
    })();
  };
  const events = ["pointerdown", "keydown", "visibilitychange"] as const;
  for (const event of events) document.addEventListener(event, report, { passive: true });
  return {
    report,
    stop() {
      active = false;
      for (const event of events) document.removeEventListener(event, report);
    },
  };
}
