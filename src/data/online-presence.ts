import type { User } from "firebase/auth";
import { readPrivacyConsent, PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";
export function startOnlinePresence(currentUser: () => User | null) {
  let stopped = false,
    pending = false,
    last = 0,
    lastUid = "";
  const controller = new AbortController();
  async function report() {
    const user = currentUser();
    if (
      stopped ||
      pending ||
      !user ||
      user.isAnonymous ||
      document.visibilityState === "hidden" ||
      readPrivacyConsent(localStorage)?.version !== PRIVACY_POLICY_VERSION
    )
      return;
    if (user.uid === lastUid && Date.now() - last < 60000) return;
    pending = true;
    last = Date.now();
    lastUid = user.uid;
    try {
      const token = await user.getIdToken();
      if (stopped || currentUser()?.uid !== user.uid) return;
      const response = await fetch("/api/olena?action=online-presence", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "text/plain" },
        body: PRIVACY_POLICY_VERSION,
        signal: controller.signal,
      });
      if (response.headers.get("X-Olena-Presence") === "disabled") {
        stopped = true;
        window.clearInterval(timer);
      }
    } catch {
      /* Melhor esforço; sessão expira sem sinal. */
    } finally {
      pending = false;
    }
  }
  const timer = window.setInterval(() => void report(), 60000);
  const visible = () => void report();
  document.addEventListener("visibilitychange", visible);
  void report();
  return () => {
    stopped = true;
    controller.abort();
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", visible);
  };
}
