/**
 * Pede o microfone no gesto de início da partida e DEVOLVE o fluxo aberto, sem gravar nada.
 * Quem o recebe decide quando soltá-lo. Manter o fluxo evita um segundo pedido na atividade
 * de fala (permissões "só desta vez" expiram assim que as trilhas são paradas).
 */
export async function prepareEnglishMicrophone(): Promise<MediaStream | undefined> {
  if (
    !window.isSecureContext ||
    !navigator.mediaDevices?.getUserMedia ||
    typeof AudioWorkletNode === "undefined"
  )
    return undefined;
  let expired = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then((stream) => {
        if (!expired) return stream;
        stream.getTracks().forEach((track) => track.stop());
        return undefined;
      }),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => {
          expired = true;
          resolve(undefined);
        }, 20000);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}
