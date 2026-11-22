# Continuidade do módulo Enem

Estado entregue em 22/11/2026. O proprietário pediu a publicação desta PR para o Claude continuar. A produção editorial foi pausada; não apresentar esta entrega como acervo completo.

## Ordem definida pelo proprietário

1. Completar e aprofundar as análises A a E de todas as questões de 2010 a 2026, nos dois dias e dois idiomas. Cada justificativa deve explicar por que a alternativa está certa ou errada, usando evidência do texto, imagem, conceito ou cálculo. Não usar preenchimento genérico nem apenas repetir o gabarito. Preservar as resoluções já existentes quando o trabalho for somente aprofundar alternativas.
2. Completar estatísticas e distribuição de respostas com dados reais, correspondência de caderno e idioma e fontes identificadas internamente. Não inventar taxa de acerto, dificuldade ou distribuição.

O proprietário autorizou produção original com IA no desenvolvimento e agentes em paralelo. Isso não significa revisão humana independente. O conteúdo é salvo em JSON estático; não há geração, chamada de modelo ou gasto de créditos quando o estudante consulta uma questão.

O trecho de conferência, data e referências das resoluções foi removido da interface por pedido explícito. Preservar os metadados internos e a licença dos dados. A referência metodológica das estatísticas permanece separada.

## Cobertura e identificação

`docs/research/enem-review-coverage.json` registra contagens por ano e dia no momento da entrega. O alvo é 3.145 entradas de questões, incluindo as cinco de cada idioma em Linguagens. Contagens de resoluções não comprovam profundidade suficiente das cinco alternativas.

Os cadernos padrão de 2021, 2023, 2024, 2025 e 2026 estão preenchidos. 2020 tem somente o primeiro dia; 2022 tem primeiro dia e parte do segundo. 2010 a 2019 ainda precisam de conteúdo editorial. Há justificativas curtas entre as entradas antigas que precisam ser revisadas, especialmente 2021 e 2023/2025. A revisão aprofundada de 2026 terminou Linguagens e foi até q66 de Humanas; q67 a q90 e parte do segundo dia ainda precisam de ampliação. No segundo dia, q164 a q180 já receberam justificativas desenvolvidas.

O catálogo tem 34 cartões padrão e variantes de outros cadernos. O índice de páginas cobre os 34 cadernos padrão e 3.145 chaves sem ausências. Variantes adicionais usam busca no PDF e OCR, sem auditoria exaustiva. Não reutilizar número de questão de outra cor ou idioma sem correspondência validada.

## Arquivos e comandos

- `public/enem/catalog.json`: variantes, URLs oficiais e gabaritos.
- `public/enem/reviews/<variantId>.json`: resolução, justificativas, fontes e estatísticas por chave.
- `public/enem/page-index/<variantId>.json`: página da questão para o leitor de página única.
- `docs/research/enem-official-key-audit.json`: gabaritos extraídos e conferidos por caderno. 2010 continua vazio e exige investigação antes de publicar conteúdo.
- `scripts/publish-enem-solutions.py`: publica um lote após conferir identidade, página e letra oficial. Não substitui revisão semântica das justificativas.

```sh
py -3.12 scripts/publish-enem-solutions.py LOTE.json --year ANO --day DIA
py -3.12 scripts/test_enem_question_statistics.py
npx vitest run src/data/enem-question-review.test.ts src/components/enem-question-explanation.test.tsx src/data/enem-question-pages.test.ts src/components/library-pdf-reader.test.tsx
npm run verify
npm run test:e2e
```

Lote: array de objetos com `key`, `answer`, `paragraphs` e `alternatives` contendo cinco justificativas A a E. Chaves são `q:46`, `english:1` ou `spanish:1`. Questões anuladas usam `ANULADA`, sem inventar uma alternativa correta.

Os PDFs oficiais podem ser baixados para `tmp/enem-acervo/ANO-DIA.pdf`. O cache local, os lotes intermediários e os microdados individuais não são versionados. Para refazer o índice, ver `scripts/build-enem-page-index.mjs`, com PDF.js e OCR local; os assets do OCR são preparados por `scripts/copy-ocr-assets.mjs` no predev/prebuild.

## Pendências das estatísticas

Há 1.920 distribuições salvas. A agregação atual depende dos mapeamentos de itens do pipeline TRI, o que deixa áreas descobertas mesmo quando os microdados existem. Separar o mapeamento de questões do filtro de parâmetros TRI: estatísticas não dependem dos parâmetros a, b e c. Conferir integralmente cor, área, ordem, idioma e gabarito antes de agregar. Não aceitar candidatos ambíguos.

O importador `scripts/complete-enem-statistics.py` usa o metadado público de `https://zenodo.org/api/records/20130840`, salvo localmente em `tmp/tri-zenodo.json`. A redistribuição licenciada cobre até 2024. Baixa os arquivos com retomada e confere MD5 antes de processar. O script atualmente ignora anos que já têm auditoria; ao ampliar mapeamentos, reprocessar explicitamente os anos afetados, pois existir auditoria não significa cobertura completa.

Investigar especialmente 2010 e 2017, sem mapeamentos, e áreas faltantes das demais edições. Em 2010 os arquivos oficiais com sufixo `com_gab` são provas com respostas incorporadas e o parser de tabela não extraiu as chaves. Não preencher pelo palpite de um modelo.

A base de 2025 precisa ser obtida e validada separadamente. Microdados de 2026 não estavam disponíveis na fonte consultada; manter indisponibilidade explícita até publicação real. Contagens representam participantes elegíveis daquele caderno e idioma, não todos os inscritos nem estudantes do OlenaStudy. Distribuição inclui brancos ou inválidos separadamente. Em questão anulada não calcular acerto ou dificuldade.

## Limites da entrega

Os relatórios de navegador em `docs/research/enem-*-browser-validation.json` documentam verificações anteriores específicas em PC/celular e claro/escuro. Não constituem revisão visual de todas as questões nem validação do conteúdo semântico inteiro. A base da branch antecede alterações mais novas da main; integração e conflitos devem ser conferidos antes do merge. Não habilitar merge automático.
