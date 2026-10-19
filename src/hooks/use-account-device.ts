import { useEffect } from "react";
import { requestAccountDevices } from "../data/account-devices";

// Registro de acesso, não presença online nem autorização para outros recursos.
export function useAccountDevice(enabled: boolean, account: string | undefined) {
  useEffect(() => {
    if (!enabled) return;
    let lastAttempt = 0;
    const register = () => {
      if (document.visibilityState === "hidden" || Date.now() - lastAttempt < 30 * 60_000) return;
      lastAttempt = Date.now();
      void requestAccountDevices().catch(() => {});
    };
    register();
    const timer = setInterval(register, 30 * 60_000);
    document.addEventListener("visibilitychange", register);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", register);
    };
  }, [enabled, account]);
}
