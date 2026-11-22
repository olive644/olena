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

## Atualização de 22/11/2026 (integração e verificação)

Branch integrada com a main atual e com as verificações automáticas corrigidas (ver `docs/CURRENT_STATE_AUDIT.md`, seção "PR #697"). O catálogo agora vem por `fetch`. Restam: autorização para o teto de JavaScript (1963,8 KiB medidos contra 1914), `npm run test:e2e`, verificação visual, e as duas frentes editoriais acima (análises A a E e estatísticas), que são de produção de conteúdo em lote e não foram iniciadas nesta rodada.

## Lote 2026 dia 1, questões 67 a 90 (22/11/2026)

Publicadas 24 resoluções com cinco justificativas A a E (`scripts/publish-enem-solutions.py`, chave oficial conferida). A tela é a mesma de 2022 (Resolução da questão e Análise das alternativas), sem mudança de desenho. Limites: a q68 depende de um primeiro texto e a q86 e a q90 de figuras que a extração de texto do PDF não traz; as justificativas dessas três usam só o texto visível e devem ser conferidas contra as imagens. Falta, para igualar 2022: 2003 resoluções e 1235 estatísticas (`docs/research/enem-review-coverage.json`). 2025 e 2026 seguem sem estatísticas, por falta de microdados publicados.

## Etapa 2: mapeamento só para estatísticas (22/11/2026)

Causa das lacunas de estatística nos anos 2011, 2013, 2017, 2018 e 2019: `build-enem-tri.py` exige parâmetros da TRI e descarta as provas da lista `provas_desconsideradas.csv` (excluídas da calibração, não do exame). O caderno certo existia, com 100% das respostas iguais ao gabarito oficial, mas era recusado. Em Linguagens de 2017 havia um segundo erro: os microdados trazem inglês nas posições 1 a 5, espanhol nas 6 a 10 e as comuns nas 11 a 50, e o script contava espanhol e comuns deslocados em cinco.

`scripts/build-enem-statistics-map.py` mapeia por ordem de itens, sem parâmetros da TRI e sem a lista de desconsideradas, aceitando só caderno com todas as respostas iguais ao gabarito conferido e um único candidato; não toca no que a TRI já mapeia. Resultado em `public/enem/stat-map/audit.json`: 8 áreas novas mapeadas (2011 dia 1 CN, 2013 dia 2 MT, 2017 dia 1 LC e CH, 2017 dia 2 CN e MT, 2018 dia 2 CN, 2019 dia 2 MT). Continuam sem mapeamento: 2010 (gabarito do PDF não extraído) e 2026 (sem microdados). `build-enem-question-statistics.py` lê esse diretório (`--map-dir`) e `complete-enem-statistics.py` ganhou `--years` e `--force`.

**Executado em 22/11/2026** (no computador da proprietária; o acesso do ambiente de desenvolvimento ao Zenodo foi bloqueado como tráfego incomum): `py scripts/complete-enem-statistics.py --years 2017,2018,2019,2020,2021 --force`, depois de 2011 e 2013. Resultado: 185 questões com estatística em cada um desses sete anos.

Segundo erro encontrado nessa execução: a partir de 2017 o campo `TX_RESPOSTAS_LC` dos participantes tem 50 caracteres (inglês nas posições 1 a 5, espanhol nas 6 a 10, comuns nas 11 a 50, idioma não escolhido com `9`) e o agregador só aceitava 45, então Linguagens era recusada. `language_vector` em `build-enem-question-statistics.py` lê os dois formatos e recusa o registro se o bloco do outro idioma tiver letras. Teste em `scripts/test_enem_statistics_map.py`.

**Alvos corretos de cobertura:** de 2017 em diante o dia 1 tem 95 questões (Linguagens e Humanas) e o dia 2 tem 90; de 2010 a 2016 o dia 1 tem 90 (Humanas e Natureza) e o dia 2 tem 95 (Linguagens e Matemática). `enem-review-coverage.json` foi recalculado com as contagens atuais.

**Conferência de sanidade (não substitui validação independente):** a alternativa certa é a mais marcada em 67% a 74% das questões do dia 1 dos anos novos (81% a 83% em 2022 e 2024), e as somas por alternativa fecham com a população em todas as questões. No dia 2 os anos novos ficam em 13 a 22 de 45 em Natureza e 16 a 20 de 45 em Matemática, dentro do intervalo dos anos já existentes (15 a 28 e 23 a 26).

**Ainda incompletos:** 2016 dia 2 (45 de 95) e 2012 dia 2 (45 de 95) e 2015 dia 2 (90 de 95), todos em Linguagens, provavelmente pelo mesmo formato de 50 caracteres; basta reprocessar com `--years 2012,2015,2016 --force`. 2010 (gabarito do PDF não extraído), 2025 (sem base de participantes validada) e 2026 (sem microdados) seguem sem estatística.
