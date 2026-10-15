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
