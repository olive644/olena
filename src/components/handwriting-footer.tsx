import type { CloudSyncState } from "../hooks/use-cloud-sync";

type HandwritingFooterProps = {
  cloud: CloudSyncState | undefined;
  draftStatus: string;
  inert: boolean;
};

export function HandwritingFooter({ cloud, draftStatus, inert }: HandwritingFooterProps) {
  return (
    <footer className="handwriting-footer" inert={inert}>
      <p>
        <strong>
          {cloud?.authenticated
            ? cloud.status === "synced"
              ? "Sincronizado na sua conta"
              : cloud.status === "offline"
                ? "Sem conexão. Alterações aguardando sincronização"
                : cloud.status === "conflict"
                  ? "Há alterações simultâneas para revisar na conta"
                  : "Sincronizando com sua conta…"
            : draftStatus || "Salvamento automático ativo"}
        </strong>
        <span>
          {cloud?.authenticated
            ? "Computador e celular usam a mesma conta."
            : "Entre na sua conta para sincronizar entre dispositivos."}
        </span>
      </p>
    </footer>
  );
}
