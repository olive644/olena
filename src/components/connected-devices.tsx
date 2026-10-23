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
      setError(uiText(2760));
    } finally {
      setLoading(false);
    }
  };
  return (
    <section className="profile-card connected-devices" aria-labelledby="devices-title">
      <div className="connected-devices__heading">
        <SettingsIcon name="security" />
        <h2 id="devices-title">{uiText(2755)}</h2>
      </div>
      <p>{uiText(2756)}</p>
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
          <p className="connected-devices__note">{uiText(2759)}</p>
          {loading && <HelenaLoading />}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button type="button" className="secondary-button" onClick={() => void load()}>
                {uiText(498)}
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
                      {device.system === "Other" ? uiText(2761) : device.system}
                    </h3>
                    <span>{uiText(2762)}</span>
                    <time dateTime={new Date(device.lastSeen).toISOString()}>
                      {new Intl.DateTimeFormat(uiLocale(), {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(device.lastSeen)}
                    </time>
                  </div>
                  {device.id === result.currentId && (
                    <span className="connected-devices__current">{uiText(2763)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!loading && result?.devices.length === 0 && <p>{uiText(2764)}</p>}
        </div>
      )}
    </section>
  );
}
