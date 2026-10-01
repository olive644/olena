import { useState } from "react";
import { importListeningBank } from "../domain/import-listening-bank";

export function ListeningBankFile({ onImport }: { onImport(ids: string[]): void }) {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="local-room-bank-import">
      <label className="secondary-button">
        <img src="/room-icons/upload.svg" width="22" height="22" alt="" />
        Importar lista
        <input
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
          aria-label="Importar lista de palavras"
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              if (!/\.(csv|txt|tsv)$/i.test(file.name) || file.size > 64_000)
                throw new Error("Use CSV, TXT ou TSV de até 64 KB.");
              const result = importListeningBank(await file.text());
              onImport(result.ids);
              setStatus(
                `${result.ids.length} palavras selecionadas.${result.missing.length ? ` Sem áudio no banco: ${result.missing.slice(0, 6).join(", ")}${result.missing.length > 6 ? "…" : ""}. Envie os áudios desses termos em Enviar arquivos.` : ""}`,
              );
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Não foi possível ler a lista.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>
        CSV, TXT ou TSV: uma palavra em inglês ou português por linha, na primeira coluna. Somente
        termos com áudio no banco são selecionados.
      </small>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
