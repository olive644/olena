import { useEffect, useId, useRef, useState } from "react";
import { AccountDeletionError, isDeletionConfirmed } from "../data/account-deletion";

type DeleteAccountPanelProps = {
  accountName: string;
  onDelete: () => Promise<void>;
};

type Status = "idle" | "deleting" | "cancelled" | "failed";

// Zona de perigo do perfil, no estilo do GitHub: o botão abre uma janela onde a pessoa lê o que
// será apagado e precisa digitar o nome da conta para liberar a exclusão.
export function DeleteAccountPanel({ accountName, onDelete }: DeleteAccountPanelProps) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const opener = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const inputId = useId();
  const busy = status === "deleting";
  const confirmed = isDeletionConfirmed(typed, accountName);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  function close() {
    if (busy) return;
    setOpen(false);
    setTyped("");
    setStatus("idle");
    opener.current?.focus();
  }

  async function confirmDeletion() {
    if (!confirmed || busy) return;
    setStatus("deleting");
    try {
      await onDelete();
    } catch (cause) {
      setStatus(
        cause instanceof AccountDeletionError && cause.reason === "cancelled"
          ? "cancelled"
          : "failed",
      );
    }
  }

  return (
    <section className="delete-account-panel" aria-labelledby={`${titleId}-zone`}>
      <div>
        <span className="section-label">Zona de perigo</span>
        <h2 id={`${titleId}-zone`}>Excluir esta conta</h2>
        <p>
          Apaga para sempre a sua conta e os estudos guardados na nuvem, e limpa os dados deste
          aparelho. Não dá para desfazer.
        </p>
      </div>
      <button
        ref={opener}
        type="button"
        className="delete-account-panel__open"
        onClick={() => setOpen(true)}
      >
        Excluir minha conta
      </button>

      {open && (
        <div
          className="delete-account-dialog__backdrop"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <div
            className="delete-account-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <h2 id={titleId}>Tem certeza de que quer excluir a conta?</h2>
            <p>Isto vai apagar para sempre:</p>
            <ul>
              <li>a sua conta e o acesso com o Google;</li>
              <li>todos os estudos, cadernos e anotações guardados na nuvem;</li>
              <li>os dados deste aparelho e a conexão com o Google Agenda.</li>
            </ul>
            <p>
              Outros aparelhos com esta conta também deixam de ter acesso. Salas e cadernos
              compartilhados já abertos expiram sozinhos.
            </p>
            <label htmlFor={inputId}>
              Para confirmar, digite{" "}
              <strong className="delete-account-dialog__name">{accountName}</strong>
            </label>
            <input
              ref={input}
              id={inputId}
              type="text"
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={busy}
              onChange={(event) => {
                setTyped(event.target.value);
                if (status !== "deleting") setStatus("idle");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirmDeletion();
                }
              }}
            />
            <p className="delete-account-dialog__note">
              Vamos pedir o login do Google mais uma vez para confirmar que é você.
            </p>
            <p className="delete-account-dialog__message" role="alert">
              {status === "cancelled" &&
                "O login foi fechado, então nada foi apagado. Tente de novo quando quiser."}
              {status === "failed" &&
                "Não foi possível concluir a exclusão agora. Confira a conexão e tente de novo."}
            </p>
            <div className="delete-account-dialog__actions">
              <button type="button" className="secondary-button" disabled={busy} onClick={close}>
                Cancelar
              </button>
              <button
                type="button"
                className="delete-account-dialog__confirm"
                disabled={!confirmed || busy}
                onClick={() => void confirmDeletion()}
              >
                {busy ? "Excluindo…" : "Excluir esta conta para sempre"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
