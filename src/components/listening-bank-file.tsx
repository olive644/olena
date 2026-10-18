import { uiText, useLanguage } from "../i18n/runtime";
import { useState } from "react";
import { importListeningBank } from "../domain/import-listening-bank";

export function ListeningBankFile({ onImport }: { onImport(ids: string[]): void }) {
  useLanguage();

  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="local-room-bank-import">
      <label className="secondary-button">
        <img src="/room-icons/upload.svg" width="22" height="22" alt="" />
        {uiText(399)}
        <input
          type="file"
          accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
          aria-label={uiText(400)}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              if (!/\.(csv|txt|tsv)$/i.test(file.name) || file.size > 64_000)
                throw new Error(uiText(401));
              const result = importListeningBank(await file.text());
              onImport(result.ids);
              setStatus(
                `${result.ids.length} palavras selecionadas.${result.missing.length ? uiText(1714, [result.missing.slice(0, 6).join(", "), result.missing.length > 6 ? "…" : ""]) : ""}`,
              );
            } catch (error) {
              setStatus(error instanceof Error ? error.message : uiText(402));
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>{uiText(403)}</small>
      {status && <p role="status">{uiText(status)}</p>}
    </div>
  );
}
