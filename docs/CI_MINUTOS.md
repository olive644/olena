# CI e minutos do GitHub Actions

## Navegadores vigentes, decisão de 25/10/2026

Por solicitação explícita do proprietário, Playwright usa somente Chromium nos projetos desktop e mobile, inclusive no preview isolado da Olena. Removida a seleção/instalação de WebKit da matriz. O mobile conserva as dimensões, escala, toque e emulação já existentes, mas não valida o motor Safari. Mantidos os dois shards móveis, workers, seleção de escopo, checks obrigatórios e seus nomes, gates e timeouts. Nenhum teste foi removido ou pulado para fazer a mudança passar.

Evidência mais recente: Application CI 40242294622, head 17de88a, shard móvel 2 iniciou 22:54:04 UTC e foi cancelado às 23:19:21 pelo limite de 25 minutos. O navegador e dependências ficaram prontos somente às 23:08:57; os 134 testes começaram às 23:09:04. A referência de instalação de 22 a 44 segundos em 18/10 não descreve esse incidente. Não foi feito rerun para contornar o cancelamento, nem aumentado limite. A economia de tempo da troca para Chromium ainda não foi medida em CI; não tratar a medição histórica abaixo como previsão atual.

Validação da seleção: scripts/ci-scope.test.mjs exige Chromium em todas as entradas; playwright-browser-config.test.ts confere desktop/mobile e herança do preview, mantendo viewport/toque. Rollback possível revertendo a configuração e a matriz, sem alteração de dados do usuário ou dependências.

Este documento é para quem for mexer no CI, seja pessoa ou IA. Ele explica o que o CI custa, o que já foi medido, o que foi decidido e por quê, e como decidir o próximo passo sem repetir os erros de raciocínio já corrigidos. Leia a seção "Regras" antes de editar qualquer arquivo em `.github/workflows/`.

## Por que isso importa

O repositório deve ficar privado quando o app tiver planos pagos. Em repositório privado o plano gratuito do GitHub Actions tem um teto mensal de minutos (os sites de comparação consultados indicam cerca de 2.000 por mês; o valor oficial não foi confirmado na página do GitHub). Em repositório público os minutos de runner padrão são ilimitados. Portanto, hoje o CI não custa nada, e depois de privar ele passa a competir por um orçamento.

## Medição de referência

Execução completa de uma pull request com código, em 18/10/2026 (run `39087926523`, commit `4cc3285`). O GitHub arredonda cada job para cima, então os minutos faturáveis abaixo são a duração do job arredondada.

| Job                             | Duração  | Faturável  | Observação                                                        |
| ------------------------------- | -------- | ---------- | ----------------------------------------------------------------- |
| e2e desktop (Chromium)          | 602 s    | 11 min     | testes 553 s, instalar navegador 22 s, instalar dependências 10 s |
| e2e mobile 1/2 (WebKit)         | 785 s    | 14 min     | testes 718 s, instalar navegador 41 s                             |
| e2e mobile 2/2 (WebKit)         | 715 s    | 12 min     | testes 648 s, instalar navegador 44 s                             |
| Lint, teste, build e desempenho | 169 s    | 3 min      | `npm run verify` 155 s                                            |
| Análise estática (Semgrep)      | 72 s     | 2 min      | instalar Semgrep 30 s, varrer 37 s                                |
| Auditoria de dependências       | 15 s     | 1 min      |                                                                   |
| Secret scan (gitleaks)          | 9 s      | 1 min      |                                                                   |
| Decide e2e scope                | 8 s      | 1 min      |                                                                   |
| Dois gates de resultado         | 7 s cada | 2 min      |                                                                   |
| **Total**                       |          | **47 min** |                                                                   |

Leituras que decidem o que fazer:

- Os três e2e somam 32 de 47 minutos, cerca de 68% do custo. Só o mobile (WebKit) soma 26 de 47, cerca de 55%.
- Instalar os navegadores custa de 22 a 44 s por job, menos de 2 minutos no total. **Cache de navegador ou imagem pronta do Playwright economizaria no máximo cerca de 2 minutos por execução e foi descartado.** A hipótese inicial de que a instalação custava vários minutos por job estava errada.
- Os testes em si são o custo. Dividir em mais partes (shards) não reduz minutos faturáveis, só o tempo de relógio.
- O CodeQL roda em fluxo separado e custa pouco (cerca de 1 a 2 minutos).

## Política atual

O escopo do e2e é decidido por `scripts/ci-scope.mjs` (testado em `scripts/ci-scope.test.mjs`) e usado pelo job `Decide e2e scope` em `.github/workflows/application.yml`.

| Situação                                                                                                                                                                                       | e2e                        | Custo aproximado |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------- |
| Pull request que mexe em interface ou em qualquer coisa fora das listas abaixo                                                                                                                 | desktop e mobile completos | 47 min           |
| Pull request só de backend (`api/`, `src/backend/`, `firebase-room.rules.json`, teste das regras, `scripts/discord-commands.json` e `scripts/register-discord-commands.mjs`) mais documentação | só desktop                 | 21 min           |
| Pull request só de documentação (`docs/`, `*.md`, `LICENSE`, `.gitignore`, `.gitleaksignore`, `public/.well-known/*.txt` e `*.json`)                                                           | nenhum                     | 10 min           |
| Push na `main`                                                                                                                                                                                 | só desktop                 | 21 min           |
| Execução semanal (segunda, 6h UTC) e execução manual                                                                                                                                           | completo                   | 47 min           |

Lint, testes, build, auditoria de dependências, varredura de segredos e análise estática rodam sempre.

Por que backend roda só o desktop: o mobile Chromium difere do desktop em layout e toque, e o backend roda igual nos dois. A execução semanal e o push na `main` (desktop) continuam cobrindo o resto. Por que o push na `main` roda só o desktop: o mesmo código já passou completo na pull request. Os custos da tabela são a referência histórica, ainda sem nova medição após a troca do navegador.

Estimativas por mês, com 2.000 minutos: cerca de 42 execuções completas, ou cerca de 95 só de backend, ou cerca de 200 só de documentação. A execução semanal consome cerca de 200 minutos por mês. Esses números são aritmética sobre a medição acima, não consumo medido do mês.

## Checks obrigatórios e o gate

Os nomes dos checks não podem mudar, porque a proteção da branch `main` pode exigi-los: `Desktop and mobile smoke tests`, `Desktop and mobile smoke tests (mobile)`, e os de cada parte do e2e. Os dois primeiros são jobs de resultado (gates) que sempre rodam e chamam `node scripts/ci-scope.mjs gate`.

Regra que não pode quebrar: **um e2e pulado nunca pode fazer um check obrigatório passar por engano.** O gate só aceita e2e pulado quando o escopo é "só documentação" e a decisão de escopo deu certo. Se o job `Decide e2e scope` falhar, o gate falha. Em caso de dúvida (não conseguir listar os arquivos, evento desconhecido, nenhum arquivo, checkout raso), o escopo é completo.

Falhas de gate em execuções antigas aparecem como "failure" quando o e2e foi cancelado por um push novo (a PR tem cancelamento automático de execução anterior). Isso é esperado e não é falha real: confira sempre o commit atual da PR, não eventos de commits anteriores.

## Medição de 01 a 07/11/2026, com o repositório indo para privado

Em 07/11/2026 a API do GitHub passou a mostrar `olive644/olena` como **privado**. Até então o CI era gratuito e ilimitado, e a API mostrava 0 minutos cobrados em todas as execuções. Os números abaixo **não são leitura da cobrança**: foram calculados pelos horários de início e fim de cada job de 101 execuções do `application.yml` e 100 do `codeql.yml`, arredondando cada job para cima, como o GitHub faz. Para refazer: `gh api repos/{dono}/{repo}/actions/workflows/application.yml/runs?created=>=AAAA-MM-DD`, depois `.../actions/runs/{id}/jobs` de cada uma (sem `--paginate`, que o proxy da sessão bloqueia: pagine com `&page=N`).

| Job                                            | Minutos   | Jobs | Parte do total |
| ---------------------------------------------- | --------- | ---- | -------------- |
| e2e desktop                                    | 1.721     | 100  | 33%            |
| e2e mobile, partes 1/2 e 2/2                   | 1.823     | 124  | 35%            |
| Lint, teste, build e desempenho                | 538       | 101  | 10%            |
| CodeQL (dois idiomas)                          | 379       | 200  | 7%             |
| Auditoria, Semgrep, secret scan, escopo, gates | 710       | 604  | 14%            |
| **Total**                                      | **5.168** |      |                |

| Evento                                  | Execuções | Minutos | Observação                                      |
| --------------------------------------- | --------- | ------- | ----------------------------------------------- |
| Pull request                            | 63        | 3.605   | 70%; execução completa com sucesso custa 61 min |
| Push na `main`                          | 37        | 1.130   | 22%; só o e2e desktop dele custa 667 min        |
| Semanal                                 | 1         | 58      | e2e completo de segunda                         |
| Dependabot (já contado em pull request) | 2         | 140     | cerca de 70 min por PR de dependências          |

Leituras que decidem o que fazer:

- **O ritmo é o problema, mais do que cada execução.** Foram 63 execuções de pull request em 39 branches em 7 dias. Projetado para 30 dias são cerca de **22.000 minutos**. Com 2.000 minutos por mês (valor de sites de comparação, não confirmado) cabem **cerca de 33 execuções completas por mês**.
- A execução completa de PR passou de 47 min (medição de 18/10) para **61 min**: o desktop sozinho leva 17 a 18 min e cada parte mobile 16 a 17 min, porque a suíte cresceu.
- Os jobs pequenos (auditoria, Semgrep, secret scan, escopo e os dois gates) somam 14% porque cada um é cobrado como no mínimo 1 minuto e há 7 por execução.
- O job `e2e` depende só de `changes`, **não** de `quality`: o e2e roda em paralelo com o lint e continua mesmo quando o lint falha. Em 4 execuções com `quality` vermelho foram gastos 210 min de e2e.

Cenários, calculados sobre os mesmos 7 dias (estimativas; cada um é independente, a última linha combina):

| Corte                                                                                                             | Economia por semana | Perde proteção?                                                                                            |
| ----------------------------------------------------------------------------------------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- |
| e2e só depois do `quality` passar (`needs: [changes, quality]`)                                                   | 210 min             | não; atrasa cerca de 6 min o início do e2e. O gate já falha com e2e pulado fora de `none`                  |
| Não rodar o e2e no push na `main`                                                                                 | 667 min             | pouca: a pull request já rodou o código. Deixa de pegar a `main` que mudou depois da última execução da PR |
| Mobile fora da pull request (semanal ou por etiqueta)                                                             | 1.794 min           | **sim**: layout móvel sem teste por PR. O `AGENTS.md` exige larguras móveis, então é decisão da dona       |
| CodeQL só quando o repositório for público (`if: !github.event.repository.private`)                               | 379 min             | sim, mas ver abaixo: em privado ele costuma exigir plano pago e pode falhar                                |
| Dependabot mensal em vez de semanal                                                                               | cerca de 100 min    | não                                                                                                        |
| Todos os de cima                                                                                                  | cerca de 3.150 min  | veja cada linha; sobram cerca de 2.000 min por semana, ou 8.600 por mês                                    |
| Radical: sem e2e em pull request nem no push na `main` (só semanal e local), CodeQL desligado e Dependabot mensal | cerca de 3.980 min  | **sim**: nenhum e2e automático por mudança; sobram cerca de 1.190 min por semana, ou 5.100 por mês         |

Conclusão da medição: **nenhum corte sozinho cabe em 2.000 minutos por mês** com o ritmo atual. Mesmo somando todos, sobram cerca de 8.600, e o corte radical ainda deixa cerca de 5.100, mais que o dobro do teto. As saídas reais são pagar minutos, rodar o e2e fora do GitHub (máquina própria ou localmente antes de abrir a PR) ou reduzir muito o número de execuções por semana. Preço do minuto pago e regras de runner próprio **não foram verificados**; ver a tela de cobrança do GitHub (Settings, Billing and plans) antes de decidir.

## Como medir de novo

1. Liste as execuções do fluxo `application.yml` (API do GitHub: `GET /repos/{dono}/{repo}/actions/workflows/application.yml/runs`).
2. Para uma execução, liste os jobs e as etapas (`GET /repos/{dono}/{repo}/actions/runs/{id}/jobs`). Calcule a duração de cada job e arredonde para cima.
3. Some. Confira com a tela de cobrança (Settings, Billing) depois de privar.
4. No CI, o Playwright agora imprime no log os 10 arquivos de teste mais lentos (`reportSlowTests` em `playwright.config.ts`). Use essa lista para decidir o que otimizar ou dividir.

## Alternativas consideradas e descartadas

| Ideia                                      | Decisão            | Motivo                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tirar o GitHub Actions                     | descartada         | perde lint, testes, secret scan e auditoria. O `AGENTS.md` exige `npm run verify` e e2e, e quem garante isso na prática é o CI                                                                                                       |
| Cache de navegador ou imagem do Playwright | descartada         | economiza no máximo cerca de 2 minutos de 47 (medido)                                                                                                                                                                                |
| Mais shards                                | descartada         | não reduz minutos faturáveis                                                                                                                                                                                                         |
| GitLab CI                                  | descartada por ora | cerca de 400 minutos gratuitos segundo sites de comparação, menos de um quinto, e exige mover o repositório                                                                                                                          |
| Bitbucket Pipelines                        | descartada         | cerca de 50 minutos gratuitos segundo sites de comparação                                                                                                                                                                            |
| CircleCI                                   | não testada        | conta por créditos (cerca de 30.000 por mês segundo sites de comparação). Não se sabe quantos créditos o e2e gastaria. Só um teste em repositório pequeno responderia                                                                |
| Runner próprio (self-hosted)               | adiada             | evita o teto de minutos, mas exige manter e proteger uma máquina. O GitHub anunciou uma taxa de US$ 0,002 por minuto para runner próprio em repositório privado a partir de março de 2026, e as fontes divergem sobre estar em vigor |
| Pular CI em pull request rascunho          | não aplicada       | o projeto não usa rascunhos. Se passar a usar, adicionar `ready_for_review` aos tipos do gatilho e tratar rascunho como escopo próprio, sem deixar check obrigatório passar                                                          |

## Práticas que gastam minutos sem necessidade

- Cada push em uma pull request reinicia o CI. Atualizar a branch com a `main` a cada conflito de documentação gera execuções inteiras (foi a maior parte das execuções de 17 e 18 de outubro). Junte atualizações e evite atualizar a branch sem necessidade.
- Rodar `npm run verify` localmente antes de subir evita execuções que falham.
- O Playwright repete testes que falham até 2 vezes no CI (`retries`), então um teste instável multiplica minutos. Se aparecer teste instável, corrija a causa em vez de aumentar tentativas.
- Cada mescla na `main` dispara o CI de novo (hoje só desktop).

## Próximas alavancas, em ordem de risco

1. Ler o relatório dos testes mais lentos e otimizar ou dividir os piores.
2. Rodar o mobile completo só à noite ou por etiqueta, e no PR só o desktop. Corta cerca de 26 dos 47 minutos, mas reduz a proteção de layout móvel por pull request. O `AGENTS.md` exige funcionamento em larguras móveis, então só faça isso com decisão da dona do projeto.
3. Cache do Semgrep (cerca de 30 s).
4. Fila de mesclagem (merge queue), que roda o CI uma vez por lote.

## Não verificado (confirmar antes de confiar)

- O teto gratuito de minutos para repositório privado (cerca de 2.000 por mês) vem de sites de comparação.
- O comportamento quando os minutos acabam. Pelo que se sabe, o CI deixa de rodar até o mês virar, a menos que haja gasto configurado. Confirme na documentação de cobrança do GitHub.
- A situação da taxa de runner próprio.
- O consumo real por mês. As estimativas acima são aritmética, não leitura da cobrança.

## Regras

1. Antes de propor uma economia, **meça**. Já houve hipótese errada (instalar navegador) que a medição desfez.
2. Corte o que mais pesa e o que menos reduz a segurança. Nunca remova o secret scan, a auditoria de dependências nem o lint, porque são baratos.
3. Não mude os nomes dos checks obrigatórios.
4. Nenhuma mudança pode deixar um check obrigatório passar sem o teste ter rodado quando ele era necessário. A decisão que falha vira escopo completo.
5. Toda mudança de escopo tem teste em `scripts/ci-scope.test.mjs`, e o caminho real de pull request (commit de mesclagem) deve ser simulado.
6. Registre a decisão em `docs/CURRENT_STATE_AUDIT.md` e atualize este documento.
7. Não esconda falha. Se um gate falhar, descubra se é execução antiga cancelada ou falha real antes de agir.

## Histórico

- 18/10/2026, #472: escopo do e2e por tipo de mudança, execução semanal e gates seguros.
- 18/10/2026: medição de referência, escopo "só backend roda só o desktop" e relatório de testes lentos no log.

- 26/10/2026: os dois arquivos do bot do Discord em `scripts/` entram na lista de só backend, por caminho exato. Antes, um PR só com esses arquivos, o backend e a documentação rodava o mobile à toa (cerca de 26 minutos a mais) porque `scripts/` conta como interface. Qualquer outro arquivo de `scripts/` continua pedindo o e2e completo.

- 31/10/2026: por autorização explícita do proprietário, teto total de JavaScript passa de 1608 para 1616 KiB na entrega ACCOUNT. Entrada inicial, limites opcionais, escopo e gates do CI preservados. Primeira medição 1608,7 KiB; reduções já prontas mantidas e textos equivalentes comprovados.

- Integração PR553 com main c1ea388: preservado o teto maior já vigente de 1632 KiB, sem reduzir para 1616. Medição combinada 1631,6 KiB, entrada 220,6 KiB; nenhum workflow, timeout ou teste alterado.

- 01/11/2026: revisão Oliver offline mede1669,3KiB totais e220,6KiB iniciais. Pela orientação da proprietária de ampliar o teto em vez de reduzir a implementação, limite total e absoluto1680KiB. Mantidos entrada inicial, opcionais, testes, workflows e gates; nenhuma economia alegada.

- 07/11/2026: `public/.well-known/*.txt` e `*.json` (um nível) entram na lista de só documentação: são `security.txt` e `assetlinks.json`, estáticos, cobertos por `src/security-txt.test.ts` e `src/android-twa.test.ts` e não importados pelo app. Arquivos em subpastas ou de outro tipo continuam pedindo o e2e completo. Teste novo em `scripts/ci-scope.test.mjs`.
- 07/11/2026: com o repositório privado, o workflow `CodeQL` ganha `if: !github.event.repository.private` no job. Medido na PR #591: o passo "Perform CodeQL analysis" falhava com "Code scanning is not enabled for this repository" (o recurso é pago em repositório privado, não verificado o preço). O check passa a aparecer como pulado, nome inalterado. Nada de segurança é perdido, pois a varredura já não rodava; Secret scan, Static analysis e Dependency audit seguem ativos. Reverter se a dona contratar o code scanning.
- 07/11/2026: repositório passa a privado. Medição de 01 a 07/11 (cerca de 5.168 min em 7 dias, 22.000 por mês projetados), cenários de corte e o que depende da dona decidir, na seção acima. Nenhum workflow foi alterado nesta entrada.

- 07/11/2026: o e2e desktop passa a rodar em duas partes (`desktop shard 1/2` e `2/2`, 2 workers cada), como o mobile. Medido: o desktop em um job só levava 17 a 20 min e estourou o limite de 20 do passo em runners lentos (PRs #592 e #594 e o push da #590 na `main`), sem falha de teste. Cada parte deve levar cerca da metade (não verificado até a primeira execução). O total de minutos fica quase igual: uma instalação de dependências e navegador a mais (cerca de 1 min) por execução. O check histórico `Desktop and mobile smoke tests (desktop)` continua existindo como gate (`desktop-result`, `gate --job=desktop`), no mesmo padrão do `(mobile)`, então a proteção da branch não muda. Testes em `scripts/ci-scope.test.mjs`. Nenhum teste removido nem pulado.
