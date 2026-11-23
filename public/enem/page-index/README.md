# Página de cada questão

Índice dos 34 cadernos padrão exibidos na biblioteca, de 2010 a 2026: 3.145 entradas (90 questões por dia, mais cinco entradas de outro idioma nas provas de Linguagens). Todos os números esperados estão mapeados. O índice usa a identidade e a URL do caderno, não apenas o ano.

O texto interno de alguns PDFs traz cabeçalhos como `Q U ES T Ã O 09`, `QUESTãO 109` ou `Questão 101`. Há também páginas digitalizadas, sem texto pesquisável. O extrator aceita essas variações e usa Tesseract local nas páginas necessárias. OCR serve para localizar cabeçalhos, não para determinar gabaritos ou produzir resoluções.

Regenerar com os PDFs oficiais em `tmp/enem-acervo`:

```sh
node scripts/copy-ocr-assets.mjs
node scripts/build-enem-page-index.mjs
npx vitest run src/data/enem-question-pages.test.ts src/components/library-pdf-reader.test.tsx
```

Requer Poppler (`pdftoppm.exe`) no ambiente de preparação Windows. Não há dependência nova no app. Os arquivos públicos contêm somente números de página, URLs oficiais e auditoria; textos e imagens do OCR ficam no cache temporário. O total do índice é inferior a 100 KB, carregado por caderno.

Em outras versões de caderno, ainda sem índice pré-calculado, o leitor procura os cabeçalhos e faz OCR no aparelho com os arquivos já usados pelo app. Esse caminho tem carregamento e erro com nova tentativa; não chama serviços externos de correção. A cobertura auditada de 3.145 entradas refere-se aos 34 cadernos padrão, não às 479 versões do catálogo.

O índice resolve a abertura da página. Ele não adiciona resoluções comentadas nem estatísticas a questões sem esses conteúdos. A cobertura editorial e estatística continua separada e documentada em `../reviews/README.md`.
