import { useSyncExternalStore } from "react";
import { CATALOG_SIZE, CATALOG_VERSION } from "./catalog-version.js";

export type UiLanguage = "pt-BR" | "en-US";
export const LANGUAGE_KEY = "helenastudy.language";
let language: UiLanguage = "pt-BR";
const catalogs = new Map<UiLanguage, readonly string[]>();
const indexes = new Map<UiLanguage, Map<string, number>>();
const templates = new Map<UiLanguage, { id: number; expression: RegExp; order: number[] }[]>();
const listeners = new Set<() => void>();
let revision = 0;
let changing = 0;

export function installUiCatalog(locale: UiLanguage, messages: readonly string[]) {
  catalogs.set(locale, messages);
  const index = new Map<string, number>();
  const patterns: { id: number; expression: RegExp; order: number[] }[] = [];
  messages.forEach((text, id) => {
    if (!index.has(text)) index.set(text, id);
    if (!/\{\d+\}/.test(text) || !/[a-zA-ZÀ-ÿ]{2}/.test(text.replace(/\{\d+\}/g, ""))) return;
    const order: number[] = [];
    const pattern = text
      .split(/(\{\d+\})/)
      .map((part) => {
        if (/^\{\d+\}$/.test(part)) {
          order.push(Number(part.slice(1, -1)));
          return "([\\s\\S]*?)";
        }
        return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      })
      .join("");
    patterns.push({ id, expression: new RegExp(`^${pattern}$`), order });
  });
  indexes.set(locale, index);
  templates.set(locale, patterns);
}
export function uiLocale(): UiLanguage {
  return language;
}
export function uiWeekdays(mondayFirst = false): string[] {
  const formatter = new Intl.DateTimeFormat(language, { weekday: "narrow", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(Date.UTC(2026, 0, 4 + (mondayFirst ? 1 : 0) + index))),
  );
}
export function uiText(id: number | string, values: readonly unknown[] = []): string {
  if (typeof id === "number") {
    const text = catalogs.get(language)?.[id] ?? catalogs.get("pt-BR")?.[id] ?? `[${id}]`;
    return text.replace(/\{(\d+)\}/g, (placeholder, index: string) =>
      Number(index) < values.length ? String(values[Number(index)] ?? "") : placeholder,
    );
  }
  // Somente mensagens de interface passam aqui, nunca conteúdo escrito pelo usuário.
  for (const locale of ["pt-BR", "en-US"] as const) {
    const index = indexes.get(locale)?.get(id);
    if (index !== undefined) return uiText(index, values);
  }
  if (language === "en-US") {
    const index = indexes.get("pt-BR")?.get(id.replace(/\s+/g, " ").trim());
    if (index !== undefined) return uiText(index, values);
  }
  if (id.length <= 4000)
    for (const patterns of templates.values())
      for (const pattern of patterns) {
        const match = pattern.expression.exec(id);
        if (match) {
          const parameters: string[] = [];
          pattern.order.forEach((position, index) => {
            parameters[position] = match[index + 1] ?? "";
          });
          return uiText(pattern.id, parameters);
        }
      }
  return id.replace(/\{(\d+)\}/g, (placeholder, index: string) =>
    Number(index) < values.length ? String(values[Number(index)] ?? "") : placeholder,
  );
}
export function useLanguage() {
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => revision,
  );
  return language;
}
function announce() {
  document.documentElement.lang = language;
  revision++;
  listeners.forEach((listener) => listener());
}
async function load(locale: UiLanguage) {
  if (catalogs.has(locale)) return;
  const response = await fetch(`/locales/${locale}.json?v=${CATALOG_VERSION}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      "Não foi possível carregar o idioma. Tente novamente. / Could not load the language. Try again.",
    );
  const value: unknown = await response.json();
  if (
    !Array.isArray(value) ||
    value.length !== CATALOG_SIZE ||
    value.some((entry) => typeof entry !== "string")
  )
    throw new Error("Invalid language catalog");
  const expected = catalogs.get("pt-BR")?.length;
  if (expected !== undefined && value.length !== expected)
    throw new Error("Incomplete language catalog");
  installUiCatalog(locale, value);
}
export async function initializeLanguage() {
  await load("pt-BR");
  let preferred: UiLanguage = "pt-BR";
  try {
    if (localStorage.getItem(LANGUAGE_KEY) === "en-US") preferred = "en-US";
  } catch {
    /* Usar português sem armazenamento. */
  }
  if (preferred === "en-US") {
    try {
      await load(preferred);
    } catch {
      preferred = "pt-BR";
    }
  }
  language = preferred;
  announce();
}
export async function changeLanguage(next: UiLanguage) {
  const request = ++changing;
  await load(next);
  if (request !== changing) return;
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    /* A troca continua nesta aba sem persistência. */
  }
  language = next;
  announce();
}
/** Rótulos estáticos leem o idioma atual sem recriar ou traduzir dados do usuário. */
export function localizeLabels<T extends object>(read: () => T): T {
  return new Proxy(read(), {
    get(_target, key) {
      const current = read();
      const value: unknown = Reflect.get(current, key);
      return typeof value === "function" ? value.bind(current) : value;
    },
  });
}

/** Apenas catálogos imutáveis do aplicativo. Nunca envolver workspace, perfil ou respostas. */
export function localizeResource<T extends object>(resource: T): T {
  const cache = new WeakMap<object, object>();
  const fields =
    /^(name|title|label|description|purpose|summary|hint|subtitle|detail|actionLabel|heading|help|tagline|subject|topic|topics|tags|materials|steps|goal|supplies|rarity|story|narrative|lore|caption)$/;
  function wrap<V extends object>(value: V, translateItems = false): V {
    const saved = cache.get(value);
    if (saved) return saved as V;
    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        const result: unknown = Reflect.get(target, key, receiver);
        const translate =
          fields.test(String(key)) ||
          (Array.isArray(target) && translateItems && /^\d+$/.test(String(key)));
        if (typeof result === "string" && translate) return uiText(result);
        if (result && typeof result === "object") return wrap(result, translate);
        return result;
      },
    });
    cache.set(value, proxy);
    return proxy;
  }
  return wrap(resource);
}
