# Resoluções salvas e estatísticas do Enem

Cobertura em 22/11/2026 (2022 dia 2 com 80 de 90):

- 1.195 resoluções salvas com justificativas A a E. Os cadernos padrão de 2021, 2023, 2024, 2025 e 2026 têm 185 entradas por edição, contando os dois idiomas. Há cobertura parcial de 2020 e 2022. O objetivo de 3.145 entradas ainda não foi atingido. A contagem não significa que todas as justificativas já receberam o aprofundamento pedido.
- Estatísticas de 2.960 itens, agregadas dos microdados de 2010 a 2025 (2025 direto do Inep; os demais anos pela redistribuição CC BY 4.0). Algumas áreas ainda não têm correspondência validada; não extrapolar a cobertura para todas as questões ou edições.
- Edições, cadernos e questões fora dessa cobertura continuam explicitamente indisponíveis. Não há geração de explicações em tempo de execução.

## Conteúdo editorial

A partir da autorização explícita de 22/11/2026, o acervo também contém resoluções originais produzidas com IA durante o desenvolvimento, salvas estaticamente e identificadas por `verification: ai-authored-official-key-checked`. Esse estado significa leitura do enunciado e conferência da letra com o gabarito oficial, não revisão humana independente. Por pedido do proprietário, o trecho de conferência, data e referências das resoluções foi removido da interface; os metadados internos permanecem. O usuário pediu justificativas contextualizadas completas para cada alternativa; a revisão de profundidade das entradas curtas continua pendente. Ver `docs/ENEM_CONTINUACAO.md`.

Para publicar um lote original após ler as páginas oficiais, usar `py -3.12 scripts/publish-enem-solutions.py CAMINHO_DO_LOTE.json --year ANO --day DIA`. O publicador verifica identidade da questão, página indexada, gabarito e presença de cinco justificativas. Essas verificações estruturais não substituem a revisão semântica. Não há cobrança, chamada de IA nem geração durante a consulta pelo estudante.

Os comentários são resumos curtos em palavras próprias, conferidos contra resoluções publicadas e contra o gabarito oficial do caderno. Cada entrada registra referências e data da conferência. Isso não significa que os professores citados revisaram ou endossaram o OlenaStudy; não existe assinatura de revisão humana independente nesta base.

Referências consultadas:

- Adir Ferreira: https://inglesdoadir.com.br/enem-2026-prova-de-ingles-corrigida-azul-com-traducao-e-audio/
- Adir Ferreira: https://inglesdoadir.com.br/enem-2022-prova-de-ingles/ (textos em outra ordem de caderno, mapeados individualmente).
- Plataforma Assaad: https://plataformaassaad.com.br/questao-01-caderno-azul-do-enem-2023-ingles/ (a página identifica a questão como de 2022, apesar do slug).

Não se reproduzem provas, traduções integrais ou comentários completos de terceiros nesta base editorial. Não inferir uma autorização para importar bancos inteiros a partir dessas referências públicas.

Para incluir uma resolução, adicionar `solution` à questão do arquivo do caderno: `paragraphs`, cinco justificativas em `alternatives`, `sources`, `checkedAt` e `verification: published-solution-and-official-key`. Conferir o enunciado e as alternativas no PDF correto, além da letra do gabarito. Uma letra coincidente sozinha não identifica uma questão. Não reutilizar apenas o número entre cores, anos ou idiomas diferentes.

O carregador verifica caderno e URL da prova. O conteúdo só aparece quando a resposta salva coincide com o gabarito oficial carregado. Sem correspondência, não existe alternativa de IA ou conteúdo de outro caderno.

## Estatísticas reproduzíveis

Fonte: INEP / Pedro Otavio Mantovani, redistribuição dos participantes, CC BY 4.0: https://doi.org/10.5281/zenodo.20130840. A redistribuição é tratada e não equivale a uma captura de respostas de usuários do OlenaStudy. Não foram alterados os registros usados; foram agregadas contagens.

Com `PARTICIPANTES_2022.zip` disponível fora dos arquivos públicos:

```sh
py -3.12 scripts/build-enem-question-statistics.py CAMINHO/PARTICIPANTES_2022.zip --year 2022
py -3.12 scripts/test_enem_question_statistics.py
npx vitest run src/data/enem-question-review.test.ts src/components/enem-question-explanation.test.tsx
```

O script aceita apenas códigos de caderno mapeados pelo pipeline TRI, cujos gabaritos foram integralmente conferidos. Lê 2.341.913 registros da redistribuição de 2022. Para cada área, exige nota e vetor de 45 respostas. Não mistura as cinco questões de língua estrangeira; as demais questões de Linguagens consideram ambos os idiomas. O denominador é a população elegível do caderno, incluindo respostas em branco ou inválidas. Estas aparecem separadas das barras A a E. O arquivo de auditoria registra o processamento.

Publicam-se apenas contagens e metadados, nunca registros de participantes. O script preserva comentários editoriais existentes e rejeita conflitos de gabarito. A dificuldade observada usa faixas explicitadas na tela: fácil a partir de 65% de acerto, média entre 35% e menos de 65%, difícil abaixo de 35%. Essas faixas editoriais não representam o parâmetro de dificuldade da TRI nem uma classificação oficial do Inep.

Uma segunda leitura independente do arquivo de 2022 conferiu a distribuição da primeira questão de cada área e de cada idioma: 575.800 participantes no caderno do primeiro dia (333.698 inglês e 242.102 espanhol) e 575.504 no segundo dia. Não extrapolar essas populações para todos os inscritos no Enem.
