// O OCR local não pode buscar nada fora do próprio domínio: o CSP de produção
// só libera 'self' e o aluno não deve ter o IP enviado a CDNs de terceiros.
// Por isso o worker, o núcleo WebAssembly e o idioma são servidos de /ocr
// (copiados de node_modules por scripts/copy-ocr-assets.mjs).
// workerBlobURL desligado: o worker é criado direto da URL do mesmo domínio.
// O padrão do tesseract.js cria um worker a partir de um blob, que o CSP
// (worker-src 'self') bloqueia.
export const OCR_WORKER_OPTIONS = {
  workerPath: "/ocr/worker.min.js",
  corePath: "/ocr",
  langPath: "/ocr/lang",
  workerBlobURL: false,
} as const;
