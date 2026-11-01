import { expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
import { prepareAccountLog } from "./account-auth";
import { recordPrivacyConsent } from "../domain/privacy-policy";

it("sem aceite atual ou para convidado não captura token nem envia", async () => {
  localStorage.clear();
  const user = { isAnonymous: false, getIdToken: vi.fn() } as unknown as User;
  expect(await prepareAccountLog(user)).toBeUndefined();
  expect(user.getIdToken).not.toHaveBeenCalled();
  recordPrivacyConsent(localStorage);
  expect(await prepareAccountLog({ ...user, isAnonymous: true } as User)).toBeUndefined();
});
it("captura token antes da saída e envia apenas após a confirmação do chamador", async () => {
  localStorage.clear();
  recordPrivacyConsent(localStorage);
  const user = {
    isAnonymous: false,
    getIdToken: vi.fn().mockResolvedValue("test-token"),
  } as unknown as User;
  const send = await prepareAccountLog(user);
  expect(fetch).not.toHaveBeenCalled();
  localStorage.clear();
  await send?.("logout");
  expect(fetch).toHaveBeenCalledWith(
    "/api/olena?action=account-log",
    expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
    }),
  );
});
