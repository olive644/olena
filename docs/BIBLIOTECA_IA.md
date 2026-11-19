# Biblioteca com a Olena (IA): modelo de ameaça e limites

Decisão da proprietária em 19/11/2026: resumo, flashcards, quiz e simulado das pastas da Biblioteca passam a ser feitos **só pela Olena (IA)**, sem as opções gratuitas no aparelho, e cada tipo fica limitado a **2 usos por dia por pessoa**. Este documento descreve o fluxo, o que pode dar errado e o que protege cada ponto. Separa o que foi verificado do que não foi.

## Fluxo

1. A pessoa seleciona até 3 fontes e clica em **Gerar com a Olena**. O aviso na tela diz que o texto das fontes é enviado a ela e que a IA erra.
2. No aparelho, o app lê o texto (texto direto, OCR em português para imagem, PDF com OCR nas páginas só imagem) e escolhe o que enviar: até 30.000 caracteres, em trechos de até 8.000, espaçados do começo ao fim do documento.
3. O pedido vai a `/api/helena` com o token da conta. O servidor exige conta de verdade (não anônima), confere a origem, o formato e o consentimento, e aplica os limites.
4. O servidor chama o modelo na Cloudflare (Workers AI, `OLENA_TEACHER_MODEL`, padrão `@cf/meta/llama-3.1-8b-instruct-fp8-fast`). Resumo vai por fluxo; flashcards, quiz e simulado voltam em JSON.
5. O servidor valida o JSON, refaz uma vez se vier fora do formato e devolve. A tela valida de novo antes de guardar. Se tudo falhar, o uso do dia é devolvido.
6. O resultado é guardado na pasta (resumo, baralho, quiz ou simulado) e sincroniza com a conta como o resto do espaço de trabalho.

## Limites (todos em `src/backend/helena-quota.ts`)

| Limite                               | Valor                                       | Observação                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Por pessoa e por tipo                | 2 por dia                                   | Resumo, flashcards, quiz e simulado contam separados (até 8 por dia no total). Janela de 00:00 UTC, 21h em Brasília.                                                                  |
| Global por tipo                      | 40 por dia                                  | Um tipo não esgota a cota dos outros.                                                                                                                                                 |
| Global da Olena                      | 100 por dia                                 | Estimado a partir de 10.000 neurons por dia na Cloudflare e de um pedido de cerca de 8.000 tokens de entrada e 1.500 de saída. **Não verificado no painel**: ajuste com o uso medido. |
| Por pessoa, por minuto               | 5                                           | Já existia.                                                                                                                                                                           |
| Por pessoa, por dia, qualquer pedido | 30                                          | Já existia.                                                                                                                                                                           |
| Por endereço, por dia                | 250                                         | Era 100; subiu porque uma turma atrás do mesmo endereço pode chegar a 8 pedidos por aluno.                                                                                            |
| Texto enviado                        | 30.000 caracteres                           | Contrato `helena-contract.ts`.                                                                                                                                                        |
| Resposta                             | 12.000 caracteres                           | Lista cortada para caber.                                                                                                                                                             |
| Tokens de saída                      | 1.600 (flashcards), 2.600 (quiz e simulado) | Limita o custo de cada pedido.                                                                                                                                                        |

A conversa, o plano de estudo e a explicação seguem **desligados** (`HELENA_CHAT_ENABLED`). Só os quatro pedidos da Biblioteca são atendidos.

**Devolução do uso:** se o modelo falha, passa do tempo ou responde fora do formato duas vezes, o servidor devolve os contadores que o pedido gastou (`refundRateLimit`), para a pessoa não perder um dos 2 usos por culpa nossa. É melhor esforço: se a gravação disputada falhar, o uso fica gasto.

## Ameaças e proteções

| Ameaça                                              | Proteção                                                                                                                                                                                            | Verificado                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pedido sem conta ou com conta anônima gastar a cota | `identifyClient` recusa anônimo e sem login (401); a tela orienta a entrar e não lê nem envia nada                                                                                                  | teste de unidade e e2e                                                                                                             |
| Uma pessoa esgotar a cota de todas                  | 2 por dia por tipo e por pessoa, teto global por tipo e teto global da Olena, mais teto por endereço                                                                                                | testes do handler e do runtime                                                                                                     |
| Várias contas atrás de um endereço                  | teto por endereço antes do global                                                                                                                                                                   | teste do runtime                                                                                                                   |
| Prompt injection pelas fontes ("ignore tudo...")    | as fontes entram como dados, a política do sistema manda ignorar instruções delas, e a saída só é aceita se for JSON no formato esperado                                                            | teste de unidade (a política) e de validação. **Não verificado** contra o modelo real: um modelo pequeno pode obedecer mesmo assim |
| Texto livre da tela controlar o modelo ou o custo   | do pedido só valem números limitados (`count`, `options`, `difficulty`); as instruções são do servidor                                                                                              | teste de unidade                                                                                                                   |
| Saída do modelo inválida, enorme ou maliciosa       | validação estrita no servidor e na tela (`study-output.ts`): tamanho dos textos, número de alternativas, resposta dentro da lista, sem repetição; renderização como texto, nunca HTML               | testes de unidade                                                                                                                  |
| IA inventar fato ou resposta de prova               | aviso na tela ("a IA erra", "confira com o gabarito oficial"); as explicações pedem apoio nas fontes. **Não há como garantir**: simulado de prova sem gabarito terá respostas decididas pelo modelo | limite conhecido                                                                                                                   |
| Vazamento do conteúdo das fontes                    | só segue o que a pessoa selecionou e consentiu; `retention: none` no contrato; nada é gravado no servidor além dos contadores (que guardam um hash da identidade)                                   | contrato testado. **Não verificado**: a política de retenção da Cloudflare Workers AI, que deve ser conferida na página oficial    |
| Custo escapar do controle                           | limites por quem chama e global, tokens de saída limitados, falha devolve o uso mas não o gasto já feito no provedor                                                                                | testes; custo real não medido                                                                                                      |
| Arquivo malicioso enviado                           | o arquivo é lido só como texto, imagem ou PDF pelo leitor do navegador, dentro do aparelho; o servidor nunca recebe o arquivo, só texto                                                             | já era assim                                                                                                                       |

## O que a pessoa perde com a mudança

- Sem conta conectada ou sem rede, não há mais resumo, flashcards, quiz nem simulado novos. Os já criados continuam abrindo.
- Depois dos 2 usos do dia em um tipo, só no dia seguinte (21h em Brasília). Cota global esgotada vale para todos.
- Qualidade: o modelo é pequeno (8 bilhões de parâmetros) e o português dele é irregular. A leitura de uma prova real, que as regras fazem com 35 de 35 questões, passa a depender do modelo e pode errar. **Não medido**: rode a prova da PUC e compare antes de confiar.

## Pendente para a proprietária

- **Política de Privacidade** (`public/politica-de-privacidade.html`): cita a voz por IA, mas não diz que o texto das fontes da Biblioteca vai à Olena (Cloudflare Workers AI). Precisa de um parágrafo. Não alterei, por ser texto legal.
- **Conferir no painel da Cloudflare** o consumo real de neurons por pedido e ajustar `STUDY_GLOBAL_DAILY_LIMIT` e `GLOBAL_DAILY_LIMIT`.
- **Decidir o destino do código gratuito**: as telas deixaram de usá-lo, mas os motores (`src/domain/pdf-summary/*`, `flashcard-quality`, `source-quiz.ts` em parte) continuam no repositório. Podem ser removidos em uma PR de limpeza ou mantidos como base de um futuro modo sem rede.
