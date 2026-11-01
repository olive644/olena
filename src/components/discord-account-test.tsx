import { useEffect, useRef, useState } from "react";
import { uiText, useLanguage } from "../i18n/runtime";
import { getFirebaseAccountServices } from "../data/firebase-account";
import { useProfileHandle } from "../hooks/use-profile-handle";
import { AccountProviderIcon } from "./account-provider-icon";
import { HelenaLoading } from "./helena-loading";

function diagnosticMessage(code: unknown) {
  switch (code) {
    case "disabled":
      return uiText("Ative DISCORD_ACCOUNT_LOG_ENABLED na Vercel e publique um novo deploy.");
    case "discord-token-invalid":
      return uiText("O Discord recusou o token do bot. Confira a configuração na Vercel.");
    case "discord-channel-access":
      return uiText("O bot não consegue acessar a categoria LOG ou o canal ACCOUNT.");
    case "discord-log-public":
      return uiText("Negue Ver canal a everyone na categoria LOG e no canal ACCOUNT.");
    case "discord-log-extra-viewer":
      return uiText("Outro cargo ou membro tem permissão explícita de ver os logs.");
    case "discord-log-bot-access":
      return uiText(
        "Permita Ver canal e Enviar mensagens ao próprio membro do bot nos dois locais.",
      );
    case "discord-log-destination":
      return uiText("A categoria ou o canal não correspondem à configuração do ACCOUNT.");
    case "discord-send-denied":
      return uiText("Confira as permissões do bot para enviar mensagens e inserir links.");
    case "quota":
    case "discord-rate-limit":
      return uiText("Aguarde antes de testar novamente. O limite é três testes por hora.");
    case "owner":
    case "auth":
      return uiText("Entre na conta responsável com e-mail confirmado para executar o teste.");
    default:
      return uiText("Teste não confirmado. Recarregue a página e tente novamente.");
  }
}

export function DiscordAccountTest() {
  useLanguage();
  const { handle } = useProfileHandle(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [message, setMessage] = useState("");
  const [messageId, setMessageId] = useState("");
  const pending = useRef(false);
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 60000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  if (!handle.creks) return null;

  async function send() {
    if (pending.current || cooldown) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setMessageId("");
    try {
      const { auth } = await getFirebaseAccountServices();
      const user = auth.currentUser;
      if (!user || user.isAnonymous) throw new Error("account");
      const token = await user.getIdToken();
      if (!active.current || auth.currentUser?.uid !== user.uid) return;
      controller.current = new AbortController();
      const response = await fetch("/api/olena?action=account-log-test", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
        signal: AbortSignal.any([controller.current.signal, AbortSignal.timeout(25000)]),
      });
      const body: unknown = await response.json();
      if (!active.current || auth.currentUser?.uid !== user.uid) return;
      if (
        response.ok &&
        body &&
        typeof body === "object" &&
        "messageId" in body &&
        typeof body.messageId === "string" &&
        /^\d{17,22}$/.test(body.messageId)
      ) {
        setMessageId(body.messageId);
        setMessage(uiText("Teste enviado ao ACCOUNT."));
      } else {
        const code = body && typeof body === "object" && "error" in body ? body.error : undefined;
        const target =
          body && typeof body === "object" && "target" in body ? body.target : undefined;
        setMessage(
          `${diagnosticMessage(code)}${target === "category" ? ` ${uiText("Local: categoria LOG.")}` : target === "channel" ? ` ${uiText("Local: canal ACCOUNT.")}` : ""}`,
        );
      }
    } catch {
      if (active.current) setMessage(diagnosticMessage(undefined));
    } finally {
      pending.current = false;
      if (active.current) {
        setBusy(false);
        setCooldown(true);
      }
    }
  }
  return (
    <section className="account-access" aria-labelledby="discord-account-test-title">
      <AccountProviderIcon provider="discord" />
      <h2 id="discord-account-test-title">{uiText("Teste do Discord")}</h2>
      <p>
        {uiText("Envia um aviso de teste ao ACCOUNT, sem criar uma conta ou alterar seus dados.")}
      </p>
      <button
        type="button"
        className="account-access__action"
        disabled={busy || cooldown}
        onClick={() => void send()}
      >
        {uiText("Enviar mensagem de teste")}
      </button>
      {busy && <HelenaLoading compact label={uiText("Aguarde…")} />}
      <p role="status" aria-live="polite">
        {message}
      </p>
      {messageId && <p>{uiText("ID da mensagem: {0}", [messageId])}</p>}
      {cooldown && <p>{uiText("Aguarde um minuto antes de reenviar.")}</p>}
    </section>
  );
}
