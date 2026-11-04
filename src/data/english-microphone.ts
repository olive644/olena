/** Requests access from the round's start gesture, then immediately releases every track. */
export async function prepareEnglishMicrophone(): Promise<boolean> {
  if (
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof AudioWorkletNode === "undefined"
  )
    return false;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        return !expired;
      }),
      new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          resolve(false);
        }, 20000);
      }),
    ]);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
