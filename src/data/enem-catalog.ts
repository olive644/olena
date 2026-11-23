// O catálogo do Enem (public/enem/catalog.json, cerca de 210 KB) fica fora do JavaScript e é buscado
// uma vez quando o acervo abre. Só o tipo vem do arquivo (apagado na compilação).
export type EnemCatalog = typeof import("../../public/enem/catalog.json");

let pending: Promise<EnemCatalog> | undefined;

export function loadEnemCatalog(): Promise<EnemCatalog> {
  pending ??= fetch("/enem/catalog.json", { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error("catalogo indisponivel");
      return response.json() as Promise<EnemCatalog>;
    })
    .catch((error: unknown) => {
      pending = undefined;
      throw error;
    });
  return pending;
}
