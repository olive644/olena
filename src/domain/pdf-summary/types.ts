// Resumo automático: tipos compartilhados. Tudo aqui roda no aparelho, sem rede e sem IA.

export type Language = "pt" | "en";

/** Um pedaço de texto de uma página, como o leitor de PDF o entrega (coordenadas em pontos). */
export type PdfTextItem = {
  text: string;
  x: number;
  y: number;
  width: number;
  /** Tamanho da letra. */
  size: number;
  /** Identificador da fonte (o nome vem genérico em muitos PDFs, então só serve para comparar). */
  font: string;
  endsLine: boolean;
};

export type PdfPageText = {
  page: number;
  width: number;
  height: number;
  items: readonly PdfTextItem[];
};

/** Uma linha de texto já montada, na ordem de leitura. */
export type TextLine = {
  page: number;
  x: number;
  right: number;
  y: number;
  size: number;
  font: string;
  text: string;
  /** Altura da página, para reconhecer cabeçalho e rodapé. */
  pageHeight: number;
  /** Células, quando a linha tem pedaços separados por vãos grandes (candidata a linha de tabela). */
  cells?: { x: number; right: number; text: string }[];
};

export type DocumentBlock =
  | { kind: "heading"; level: 1 | 2 | 3; text: string; page: number }
  | {
      kind: "paragraph";
      text: string;
      page: number;
      item?: boolean;
      /** Tabela do arquivo (primeira linha é o cabeçalho); `text` é o conteúdo corrido dela. */
      table?: string[][];
    };

export type StructuredDocument = {
  title: string;
  language: Language;
  pages: number;
  blocks: DocumentBlock[];
  /** Linhas do PDF na ordem de leitura, sem cabeçalho e rodapé e antes de virarem parágrafos e títulos. Prova usa estas. */
  lines?: { text: string; page: number }[];
  characters: number;
};

export type SummaryStats = {
  pages: number;
  sections: number;
  sentences: number;
  selectedSentences: number;
  wordsIn: number;
  wordsOut: number;
  /** Quanto do texto original aparece no resumo, de 0 a 1 (em palavras). */
  ratio: number;
};

export type SummaryResult = {
  title: string;
  markdown: string;
  stats: SummaryStats;
};

/** Quanto do arquivo o resumo mostra: curto, médio (padrão) ou longo. */
export type SummaryDetail = "short" | "medium" | "long";

export type SummaryOptions = {
  detail?: SummaryDetail;
  /** Chamado de vez em quando com o que já foi feito (0 a 1) e a etapa em curso. */
  onProgress?: (fraction: number, stage: SummaryStage) => void;
  signal?: AbortSignal;
};

export type SummaryStage = "reading" | "structuring" | "ranking" | "composing";
