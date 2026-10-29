import type { CSSProperties } from "react";
import type { NotebookTab } from "../domain/workspace";
import { uiText } from "../i18n/runtime";
import { PaperMoonMark } from "./paper-moon-mark";
import type { TabSide } from "./notebook-tab-stack";

/**
 * Variáveis de estilo de uma aba. `--tab-h` é a distância do marcador até a lombada, em fração da
 * largura do caderno: é a mesma na folha, vire ela para o lado que virar, então o marcador não
 * "pula" quando a folha muda de pilha. Na folha da direita (índice ímpar) a posição é medida a
 * partir da lombada; na da esquerda (índice par), a partir da borda de fora.
 */
export function tabStyle(tab: NotebookTab, pageIndex: number, side: TabSide): CSSProperties {
  const hinge = pageIndex % 2 ? 0.07 + tab.position * 0.36 : 0.43 - tab.position * 0.36;
  return {
    "--tab-color": tab.color,
    "--tab-text": ["#FACC15", "#5887C9"].includes(tab.color.toUpperCase()) ? "#17151C" : "#FFF9EF",
    "--tab-position": tab.position,
    "--tab-side": side === "left" ? 0 : 1,
    "--tab-h": hinge,
  } as CSSProperties;
}

/** Desenho da aba, sem interação: o mesmo da camada fixa, usado na folha que está virando. */
export function NotebookTabFace({
  tab,
  pageIndex,
  side,
  back = false,
  left,
}: {
  tab: NotebookTab;
  pageIndex: number;
  side: TabSide;
  back?: boolean;
  /** Posição horizontal já resolvida (marcador na folha que vira); sem ela vale a regra da camada fixa. */
  left?: string;
}) {
  return (
    <span
      className={`notebook-attached-tab notebook-ride-tab is-${tab.kind} is-${side}${back ? " is-back" : ""}`}
      style={{ ...tabStyle(tab, pageIndex, side), ...(left ? { left } : {}) }}
    >
      {tab.kind === "divider" ? (
        <span>{tab.label || uiText(705)}</span>
      ) : (
        <PaperMoonMark className="notebook-attached-tab__moon" motif={tab.motif} />
      )}
    </span>
  );
}

/**
 * Aba que viaja na folha que vira. Fica presa à folha: a frente a mostra saindo pela borda livre e
 * o verso, depois de a folha passar dos 90 graus, mostra a mesma aba do outro lado, de costas.
 */
export function NotebookRidingTab({
  tab,
  pageIndex,
  side,
  left,
}: {
  tab: NotebookTab;
  pageIndex: number;
  side: TabSide;
  left?: string;
}) {
  return (
    <span className="notebook-ride" aria-hidden="true">
      <NotebookTabFace tab={tab} pageIndex={pageIndex} side={side} {...(left ? { left } : {})} />
      <NotebookTabFace
        tab={tab}
        pageIndex={pageIndex}
        side={side === "left" ? "right" : "left"}
        back
        {...(left ? { left } : {})}
      />
    </span>
  );
}
