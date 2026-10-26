import { useId, useRef, useState } from "react";
import { uiText } from "../i18n/runtime";
import { accountAuthError, setAccountLanguage, type AccountServices } from "../data/account-auth";
import { passwordChecks, passwordStrength } from "../data/password-strength";

export function EmailAuthForm({
  services,
  accepted,
  onAuthenticated,
  onBusy,
  initialRegister = false,
  linkToCurrent = false,
  onOpenChange,
}: {
  services: AccountServices | undefined;
  accepted: boolean;
  onAuthenticated: () => void;
  onBusy: (busy: boolean) => void;
  initialRegister?: boolean;
  linkToCurrent?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(linkToCurrent);
  const [mode, setMode] = useState<"login" | "register" | "reset">(
    initialRegister || linkToCurrent ? "register" : "login",
  );
  const [email, setEmail] = useState(
    linkToCurrent ? (services?.auth.currentUser?.email ?? "") : "",
  );
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const pending = useRef(false);
  const checks = passwordChecks(password);
  const strength = passwordStrength(password);
  function change(next: typeof mode) {
    setMode(next);
    setPassword("");
    setConfirmation("");
    setMessage("");
  }
  async function submit() {
    if (!services || pending.current || (!accepted && mode !== "reset")) return;
    if (mode === "register" && password.length < 12) {
      setMessage(uiText("Use pelo menos 12 caracteres. Prefira uma frase única e longa."));
      return;
    }
    if (linkToCurrent && !services.auth.currentUser) {
      setMessage(accountAuthError(null));
      return;
    }
    if (mode === "register" && password !== confirmation) {
      setMessage(uiText("As senhas precisam ser iguais."));
      return;
    }
    if (mode === "register" && !checks.every(Boolean)) {
      setMessage(uiText("Use 12 caracteres, maiúscula, minúscula, número e símbolo."));
      return;
    }
    pending.current = true;
    setBusy(true);
    onBusy(true);
    setMessage("");
    setAccountLanguage(services);
    try {
      if (mode === "reset") {
        try {
          await services.authApi.sendPasswordResetEmail(services.auth, email.trim());
        } catch (cause) {
          if (!(
            cause &&
            typeof cause === "object" &&
            "code" in cause &&
            cause.code === "auth/user-not-found"
          ))
            throw cause;
        }
        setMessage(
          uiText(
            "Se houver uma conta para este e-mail, você receberá instruções para redefinir a senha.",
          ),
        );
      } else {
        if (mode === "register") {
          const policy = await services.authApi.validatePassword(services.auth, password);
          if (!policy.isValid) {
            setMessage(uiText("A senha não atende à política de segurança da conta."));
            return;
          }
        }
        const credential =
          linkToCurrent && services.auth.currentUser
            ? await services.authApi.linkWithCredential(
                services.auth.currentUser,
                services.authApi.EmailAuthProvider.credential(email.trim(), password),
              )
            : mode === "register"
              ? await services.authApi.createUserWithEmailAndPassword(
                  services.auth,
                  email.trim(),
                  password,
                )
              : await services.authApi.signInWithEmailAndPassword(
                  services.auth,
                  email.trim(),
                  password,
                );
        if (mode === "register" && !linkToCurrent) {
          // Falhas no envio não transformam uma conta já criada em cadastro inexistente.
          await services.authApi
            .updateProfile(credential.user, { displayName: name.trim() })
            .catch(() => {});
          await services.authApi.sendEmailVerification(credential.user).catch(() => {});
        }
        setPassword("");
        setConfirmation("");
        // Só a identidade ativa confirmada pode finalizar a entrada. O resultado
        // com credenciais não é encaminhado para o restante da interface.
        if (services.auth.currentUser?.uid !== credential.user.uid)
          throw new Error("auth/user-mismatch");
        onAuthenticated();
      }
    } catch (cause) {
      setMessage(accountAuthError(cause));
    } finally {
      pending.current = false;
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <section className="email-auth" data-open={open} aria-label={uiText("Acesso por e-mail")}>
      {!open ? (
        <button
          type="button"
          disabled={!accepted}
          onClick={() => {
            setOpen(true);
            onOpenChange?.(true);
          }}
        >
          {uiText("Entrar ou criar conta com e-mail")}
        </button>
      ) : (
        <>
          {!linkToCurrent && (
            <div className="email-auth__tabs">
              <button
                type="button"
                disabled={busy}
                aria-pressed={mode === "login"}
                onClick={() => change("login")}
              >
                {uiText("Entrar")}
              </button>
              <button
                type="button"
                disabled={busy}
                aria-pressed={mode === "register"}
                onClick={() => change("register")}
              >
                {uiText("Criar conta")}
              </button>
            </div>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {mode === "register" && !linkToCurrent && (
              <label htmlFor={`${id}-name`}>
                {uiText("Seu nome")}
                <input
                  id={`${id}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={80}
                  required
                  disabled={busy}
                />
              </label>
            )}
            <label htmlFor={`${id}-email`}>
              {uiText("E-mail")}
              <input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoCapitalize="none"
                maxLength={254}
                required
                disabled={busy}
              />
            </label>
            {mode !== "reset" && (
              <>
                <label htmlFor={`${id}-password`}>
                  {uiText("Senha")}
                  <input
                    id={`${id}-password`}
                    type={visible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    minLength={mode === "register" ? 12 : 1}
                    maxLength={128}
                    required
                    disabled={busy}
                    aria-describedby={mode === "register" ? `${id}-policy` : undefined}
                  />
                </label>
                {mode === "register" && (
                  <>
                    <div className="email-auth__strength" id={`${id}-policy`}>
                      <meter
                        min={0}
                        max={3}
                        low={1}
                        high={2}
                        optimum={3}
                        value={strength}
                        aria-label={uiText("Força da senha")}
                      />
                      <strong>
                        {uiText(strength < 2 ? "Fraca" : strength === 2 ? "Razoável" : "Forte")}
                      </strong>
                      <span>
                        {uiText("Use 12 caracteres, maiúscula, minúscula, número e símbolo.")}
                      </span>
                    </div>
                    <label htmlFor={`${id}-confirm`}>
                      {uiText("Confirmar senha")}
                      <input
                        id={`${id}-confirm`}
                        type={visible ? "text" : "password"}
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        autoComplete="new-password"
                        maxLength={128}
                        required
                        disabled={busy}
                      />
                    </label>
                  </>
                )}
                <label className="email-auth__show">
                  <input
                    type="checkbox"
                    className="paper-checkbox"
                    checked={visible}
                    onChange={(e) => setVisible(e.target.checked)}
                  />
                  {uiText("Mostrar senha")}
                </label>
              </>
            )}
            <p role="status" aria-live="polite">
              {message}
            </p>
            <button type="submit" disabled={!services || busy || (!accepted && mode !== "reset")}>
              {busy
                ? uiText("Aguarde…")
                : linkToCurrent
                  ? uiText("Adicionar senha à minha conta")
                  : mode === "register"
                    ? uiText("Criar conta com e-mail")
                    : mode === "reset"
                      ? uiText("Enviar recuperação")
                      : uiText("Entrar com e-mail")}
            </button>
          </form>
          {!linkToCurrent && (
            <div className="email-auth__navigation">
              {mode !== "reset" && (
                <button
                  type="button"
                  className="email-auth__link"
                  disabled={busy}
                  onClick={() => change("reset")}
                >
                  {uiText("Esqueci minha senha")}
                </button>
              )}
              <button
                type="button"
                className="email-auth__link"
                disabled={busy}
                onClick={() => {
                  setOpen(false);
                  onOpenChange?.(false);
                  setPassword("");
                  setConfirmation("");
                }}
              >
                {uiText("Outros métodos de acesso")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
