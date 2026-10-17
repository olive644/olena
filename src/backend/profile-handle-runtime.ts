import { createFirebaseAccountIdentity } from "./firebase-account-identity.js";
import {
  createFirebaseAccessTokenProvider,
  createFirebaseRealtimeStore,
} from "./firebase-realtime-store.js";
import { createProfileHandleHandler, type HandleRegistry } from "./profile-handle-handler.js";
import { checkRateLimit } from "./rate-limit.js";

const config = {
  databaseUrl: process.env["FIREBASE_DATABASE_URL"] ?? "",
  serviceAccount: {
    clientEmail: process.env["FIREBASE_CLIENT_EMAIL"] ?? "",
    privateKey: (process.env["FIREBASE_PRIVATE_KEY"] ?? "").replace(/\\n/g, "\n"),
  },
};
const token = createFirebaseAccessTokenProvider(config);
const rateStore = createFirebaseRealtimeStore(config);
const identity = createFirebaseAccountIdentity(process.env["VITE_FIREBASE_PROJECT_ID"] ?? "");
const url = `${config.databaseUrl}/privateProfileHandles.json`;
export const profileAllowedOrigins = [
  ...(process.env["HELENA_ALLOWED_ORIGINS"] ?? "https://olenastudy.vercel.app").split(","),
  ...[process.env["VERCEL_URL"], process.env["VERCEL_BRANCH_URL"]]
    .filter(Boolean)
    .map((host) => `https://${host}`),
]
  .map((value) => value.trim())
  .filter(Boolean);
export async function identifyProfileAccount(request: Request) {
  const verified = await identity(request);
  if (!verified || verified.anonymous) return undefined;
  // Consulta atual impede reservar com token de conta removida/desativada.
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(process.env["VITE_FIREBASE_API_KEY"] ?? "")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: request.headers.get("authorization")!.slice(7) }),
    },
  );
  if (!response.ok) return undefined;
  const payload = (await response.json()) as {
    users?: { localId?: string; disabled?: boolean; email?: string; emailVerified?: boolean }[];
  };
  const user = payload.users?.[0];
  if (!user || user.localId !== verified.uid || user.disabled) return undefined;
  return {
    uid: verified.uid,
    anonymous: false,
    emailVerified: user.emailVerified === true,
    ...(user.email ? { email: user.email } : {}),
  };
}
export const handleProfileHandle = createProfileHandleHandler({
  ownerEmail: process.env["CREKS_OWNER_EMAIL"] ?? "",
  allowedOrigins: profileAllowedOrigins,
  identify: identifyProfileAccount,
  async afterDelete(request) {
    const { handleProfileSocial } = await import("./profile-social-runtime.js");
    const response = await handleProfileSocial(request);
    if (!response.ok) throw new Error("delete-social");
  },
  consume: (uid) => checkRateLimit(rateStore, "profile-handles-minute", uid, 30, 60),
  store: {
    async read() {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${await token()}`, "X-Firebase-ETag": "true" },
      });
      if (!response.ok) throw new Error("read");
      const version = response.headers.get("etag");
      if (!version) throw new Error("version");
      const value = (await response.json()) as HandleRegistry | null;
      return { value: value ?? {}, version };
    },
    async write(value, version) {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${await token()}`,
          "Content-Type": "application/json",
          "if-match": version,
        },
        body: JSON.stringify(value),
      });
      if (response.status === 412) return false;
      if (!response.ok) throw new Error("write");
      return true;
    },
  },
});
