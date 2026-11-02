import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PrivacyNotice, PRIVACY_NOTICE_KEY } from "./privacy-notice";
import { PRIVACY_CONSENT_ITEM, PRIVACY_POLICY_VERSION } from "../domain/privacy-policy";
import { claimDeviceForAccount, clearPersonalData } from "../data/personal-data";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

it("informa serviços reais sem aceitar permissões opcionais e guarda só a leitura", () => {
  const view = render(<PrivacyNotice />);
  expect(screen.queryByRole("checkbox")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Ver detalhes" }));
  expect(screen.getByText(/Este aviso não ativa nenhum deles/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  expect(localStorage.getItem(PRIVACY_NOTICE_KEY)).toBe(PRIVACY_POLICY_VERSION);
  expect(localStorage.getItem(PRIVACY_CONSENT_ITEM)).toBeNull();
  view.unmount();
  render(<PrivacyNotice />);
  expect(screen.queryByRole("region")).toBeNull();
});

it("reapresenta versão nova, permite consultar depois e limpa ao sair ou trocar conta", () => {
  localStorage.setItem(PRIVACY_NOTICE_KEY, "antiga");
  const view = render(<PrivacyNotice />);
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  view.unmount();
  render(<PrivacyNotice embedded />);
  expect(screen.getByRole("region", { name: "Privacidade no OlenaStudy" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Entendi" })).toBeNull();
  claimDeviceForAccount(localStorage, "ana");
  claimDeviceForAccount(localStorage, "bia");
  expect(localStorage.getItem(PRIVACY_NOTICE_KEY)).toBeNull();
  localStorage.setItem(PRIVACY_NOTICE_KEY, PRIVACY_POLICY_VERSION);
  clearPersonalData(localStorage);
  expect(localStorage.getItem(PRIVACY_NOTICE_KEY)).toBeNull();
});

it("continua utilizável com armazenamento bloqueado", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<PrivacyNotice />);
  fireEvent.click(screen.getByRole("button", { name: "Entendi" }));
  expect(screen.queryByRole("region")).toBeNull();
});

it("renova aceite antigo somente por confirmação explícita sem sair da conta", () => {
  localStorage.setItem(PRIVACY_NOTICE_KEY, PRIVACY_POLICY_VERSION);
  localStorage.setItem(
    PRIVACY_CONSENT_ITEM,
    JSON.stringify({ version: "2026-11-01", acceptedAt: "ontem" }),
  );
  localStorage.setItem("helena.profile.v1", JSON.stringify({ name: "Conta preservada" }));
  const view = render(<PrivacyNotice authenticated />);
  expect(screen.getByRole("dialog", { name: "Política de Privacidade atualizada" })).toBeTruthy();
  const confirm = screen.getByRole("button", { name: "Confirmar aceite" });
  expect(confirm.hasAttribute("disabled")).toBe(true);
  expect(JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM)!).version).toBe("2026-11-01");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(confirm);
  expect(JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM)!).version).toBe(
    PRIVACY_POLICY_VERSION,
  );
  expect(JSON.parse(localStorage.getItem("helena.profile.v1")!).name).toBe("Conta preservada");
  expect(screen.queryByRole("dialog")).toBeNull();
  view.unmount();
  render(<PrivacyNotice authenticated />);
  expect(screen.queryByRole("dialog")).toBeNull();
});
it("adiar e troca de sessão não fabricam aceite", () => {
  localStorage.setItem(
    PRIVACY_CONSENT_ITEM,
    JSON.stringify({ version: "antiga", acceptedAt: "ontem" }),
  );
  const view = render(<PrivacyNotice authenticated />);
  fireEvent.click(screen.getByRole("button", { name: "Agora não" }));
  expect(JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM)!).version).toBe("antiga");
  view.unmount();
  const next = render(<PrivacyNotice authenticated />);
  expect(screen.getByRole("dialog")).toBeTruthy();
  next.rerender(<PrivacyNotice authenticated={false} />);
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM)!).version).toBe("antiga");
});

it("falha de gravação mantém o aviso e não anuncia novo aceite", () => {
  localStorage.setItem(
    PRIVACY_CONSENT_ITEM,
    JSON.stringify({ version: "antiga", acceptedAt: "ontem" }),
  );
  const events = vi.fn();
  window.addEventListener("olena:privacy-consent-changed", events);
  const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(<PrivacyNotice authenticated />);
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Confirmar aceite" }));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(events).not.toHaveBeenCalled();
  expect(JSON.parse(localStorage.getItem(PRIVACY_CONSENT_ITEM)!).version).toBe("antiga");
  spy.mockRestore();
  window.removeEventListener("olena:privacy-consent-changed", events);
});
