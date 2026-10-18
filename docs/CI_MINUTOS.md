# CI e minutos do GitHub Actions

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

| Situação                                                                                                            | e2e                        | Custo aproximado |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------- | ---------------- |
| Pull request que mexe em interface ou em qualquer coisa fora das listas abaixo                                      | desktop e mobile completos | 47 min           |
| Pull request só de backend (`api/`, `src/backend/`, `firebase-room.rules.json`, teste das regras) mais documentação | só desktop                 | 21 min           |
| Pull request só de documentação (`docs/`, `*.md`, `LICENSE`, `.gitignore`, `.gitleaksignore`)                       | nenhum                     | 10 min           |
| Push na `main`                                                                                                      | só desktop                 | 21 min           |
| Execução semanal (segunda, 6h UTC) e execução manual                                                                | completo                   | 47 min           |

Lint, testes, build, auditoria de dependências, varredura de segredos e análise estática rodam sempre.

Por que backend roda só o desktop: o mobile (WebKit) difere do desktop em layout e toque, e o backend roda igual nos dois. A execução semanal e o push na `main` (desktop) continuam cobrindo o resto. Por que o push na `main` roda só o desktop: o mesmo código já passou completo na pull request.

Estimativas por mês, com 2.000 minutos: cerca de 42 execuções completas, ou cerca de 95 só de backend, ou cerca de 200 só de documentação. A execução semanal consome cerca de 200 minutos por mês. Esses números são aritmética sobre a medição acima, não consumo medido do mês.

## Checks obrigatórios e o gate

Os nomes dos checks não podem mudar, porque a proteção da branch `main` pode exigi-los: `Desktop and mobile smoke tests`, `Desktop and mobile smoke tests (mobile)`, e os de cada parte do e2e. Os dois primeiros são jobs de resultado (gates) que sempre rodam e chamam `node scripts/ci-scope.mjs gate`.

Regra que não pode quebrar: **um e2e pulado nunca pode fazer um check obrigatório passar por engano.** O gate só aceita e2e pulado quando o escopo é "só documentação" e a decisão de escopo deu certo. Se o job `Decide e2e scope` falhar, o gate falha. Em caso de dúvida (não conseguir listar os arquivos, evento desconhecido, nenhum arquivo, checkout raso), o escopo é completo.

Falhas de gate em execuções antigas aparecem como "failure" quando o e2e foi cancelado por um push novo (a PR tem cancelamento automático de execução anterior). Isso é esperado e não é falha real: confira sempre o commit atual da PR, não eventos de commits anteriores.

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
