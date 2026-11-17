// Bytes de um endereço `data:...;base64,...`. O leitor de PDF recebe os bytes direto: pedir o
// endereço a ele faz uma requisição interna que falha em alguns celulares ("Unexpected server
// response (0) while retrieving PDF").
export function dataUrlBytes(url: string): Uint8Array | undefined {
  const match = /^data:[^,]*;base64,([\s\S]*)$/i.exec(url);
  if (!match) return undefined;
  try {
    const binary = atob(match[1]!.replace(/\s+/g, ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return undefined;
  }
}
