import { useState } from "react";
import { requestAccountDevices } from "../data/account-devices";
import { uiLocale, uiText, useLanguage } from "../i18n/runtime";
import { HelenaLoading } from "./helena-loading";
import { SettingsIcon } from "./settings-icon";

export function ConnectedDevices() {
  useLanguage();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof requestAccountDevices>>>();
  const load = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      setResult(await requestAccountDevices());
    } catch {
      setResult(undefined);
      setError(uiText("Não foi possível carregar os dispositivos. Tente novamente."));
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="profile-card connected-devices" aria-labelledby="devices-title">
      <div className="connected-devices__heading">
        <SettingsIcon name="security" />
        <h2 id="devices-title">{uiText("Dispositivos conectados")}</h2>
      </div>
      <p>
        {uiText(
          "Veja os navegadores que acessaram sua conta neste aplicativo nos últimos 90 dias.",
        )}
      </p>
      <button
        type="button"
        className="secondary-button"
        aria-expanded={open}
        aria-controls="connected-device-list"
        onClick={() => (open ? setOpen(false) : void load())}
      >
        {uiText(open ? "Ocultar dispositivos" : "Mostrar dispositivos")}
      </button>
      {open && (
        <div id="connected-device-list" aria-busy={loading}>
          <p className="connected-devices__note">
            {uiText(
              "Aparelhos usados antes desta atualização aparecem quando você acessar o app neles novamente. Último acesso não significa que o aparelho está online.",
            )}
          </p>
          {loading && <HelenaLoading />}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button type="button" className="secondary-button" onClick={() => void load()}>
                {uiText("Tentar novamente")}
              </button>
            </div>
          )}
          {!loading && result && (
            <ul className="connected-devices__list">
              {result.devices.map((device) => (
                <li key={device.id}>
                  <div>
                    <h3>
                      {device.browser === "Browser" ? uiText("Navegador") : device.browser} ·{" "}
                      {device.system === "Other"
                        ? uiText("Sistema não identificado")
                        : device.system}
                    </h3>
                    <span>{uiText("Último acesso ao app")}</span>
                    <time dateTime={new Date(device.lastSeen).toISOString()}>
                      {new Intl.DateTimeFormat(uiLocale(), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(device.lastSeen)}
                    </time>
                  </div>
                  {device.id === result.currentId && (
                    <span className="connected-devices__current">{uiText("Este dispositivo")}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!loading && result?.devices.length === 0 && (
            <p>{uiText("Nenhum dispositivo registrado neste período.")}</p>
          )}
        </div>
      )}
    </section>
  );
}
