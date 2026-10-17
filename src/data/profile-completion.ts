import { getFirebaseAccountServices } from "./firebase-account";
import { PROFILE_STEPS, type ProfileCompletion } from "../domain/profile-completion";

export function parseProfileCompletion(body: unknown): ProfileCompletion {
  if (!body || typeof body !== "object") throw new Error("Resposta inválida da Olena.");
  const value = body as ProfileCompletion;
  if (
    value.version !== 1 ||
    !Array.isArray(value.steps) ||
    value.steps.length !== 3 ||
    !value.steps.every(
      (step, index) => step && step.id === PROFILE_STEPS[index] && typeof step.done === "boolean",
    )
  )
    throw new Error("Etapas inválidas da Olena.");
  const completed = value.steps.filter((step) => step.done).length;
  const next = value.steps.find((step) => !step.done)?.id ?? null;
  if (value.completed !== completed || value.complete !== (completed === 3) || value.next !== next)
    throw new Error("Conclusão inválida da Olena.");
  return {
    version: 1,
    steps: value.steps.map(({ id, done }) => ({ id, done })),
    completed,
    complete: completed === 3,
    next,
  };
}
const cache = new Map<string, { key: string; value: ProfileCompletion; at: number }>();
let flight: { uid: string; promise: Promise<ProfileCompletion> } | undefined;
export async function requestProfileCompletion(key: string) {
  const { auth } = await getFirebaseAccountServices();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user || user.isAnonymous) {
    cache.clear();
    throw new Error("Entre na conta.");
  }
  const uid = user.uid;
  for (const uid of cache.keys()) if (uid !== user.uid) cache.delete(uid);
  const prior = cache.get(user.uid);
  if (prior?.key === key && Date.now() - prior.at < 15000) return prior.value;
  const promise =
    flight?.uid === user.uid
      ? flight.promise
      : (async () => {
          const token = await user.getIdToken();
          const response = await fetch("/api/olena?action=profile-completion&version=1", {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(8000),
          });
          if (!response.ok) throw new Error("Conferência da Olena indisponível.");
          return parseProfileCompletion(await response.json());
        })();
  flight = { uid: user.uid, promise };
  try {
    const result = await promise;
    if (auth.currentUser?.uid !== uid || auth.currentUser.isAnonymous)
      throw new Error("A conta mudou.");
    cache.set(uid, { key, value: result, at: Date.now() });
    return result;
  } finally {
    if (flight?.promise === promise) flight = undefined;
  }
}
export function invalidateProfileCompletion() {
  cache.clear();
}
