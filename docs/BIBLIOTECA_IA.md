# Biblioteca com a Olena (IA): modelo de ameaça e limites

Decisão da proprietária em 19/11/2026: resumo, flashcards, quiz e simulado das pastas da Biblioteca passam a ser feitos **só pela Olena (IA)**, sem as opções gratuitas no aparelho, e o uso é medido em **créditos** (neurons da Cloudflare), pelo tamanho do texto e da resposta, não por número de usos (atualizado em 19/11/2026). Este documento descreve o fluxo, o que pode dar errado e o que protege cada ponto. Separa o que foi verificado do que não foi.

## Fluxo

1. A pessoa seleciona até 3 fontes e clica em **Gerar com a Olena**. O aviso na tela diz que o texto das fontes é enviado a ela e que a IA erra.
2. No aparelho, o app lê o texto (texto direto, OCR em português para imagem, PDF com OCR nas páginas só imagem) e escolhe o que enviar: até 36.000 caracteres, em trechos de até 8.000, espaçados do começo ao fim do documento.
3. O pedido vai a `/api/helena` com o token da conta. O servidor exige conta de verdade (não anônima), confere a origem, o formato e o consentimento, e aplica os limites.
4. O servidor chama o modelo na Cloudflare (Workers AI, `OLENA_TEACHER_MODEL`, padrão `@cf/meta/llama-3.1-8b-instruct-fp8-fast`). Resumo vai por fluxo; flashcards, quiz e simulado voltam em JSON.
5. O servidor valida o JSON, refaz uma vez se vier fora do formato e devolve. A tela valida de novo antes de guardar. Se tudo falhar, o uso do dia é devolvido.
6. O resultado é guardado na pasta (resumo, baralho, quiz ou simulado) e sincroniza com a conta como o resto do espaço de trabalho.

## Créditos e limites (`helena-budget.ts`, `neuron-budget.ts`, `helena-quota.ts`, `helena-runtime.ts`)

O servidor estima o custo de cada pedido antes de chamar o modelo, reserva esse valor e, quando o pedido termina, acerta a conta com os tokens que o provedor informou de verdade (`usage`). A tela chama de **crédito** o neuron da Cloudflare, arredondado para cima. A fórmula é a mesma no servidor e no app (`src/ai/helena-cost.ts`).

- Custo = entrada (texto, mais 700 tokens de política e instruções, a 3 caracteres por token) + saída máxima do tipo, tudo pelo preço por milhão de tokens. A reserva cobre a entrada e 70% da saída máxima, com 20% de folga. Texto curto custa pouco; texto longo custa mais.
- Preço padrão: 4.090 neurons por milhão de tokens de entrada e 34.870 por milhão de saída (modelo `llama-3.1-8b-instruct-fp8-fast`, página oficial da Cloudflare em 16/11/2026, **não conferido de novo**). Se trocar o modelo, ajuste `OLENA_NEURONS_IN_PER_M` e `OLENA_NEURONS_OUT_PER_M`.
- Saída máxima: 1.600 tokens (resumo e flashcards); quiz e simulado, 500 + 190 por questão (teto de 3.800); outros 700.

| Limite                 | Valor                           | Observação                                                                                                                                                           |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conta toda (global)    | 8.000 créditos por dia          | 80% da cota gratuita de 10.000 neurons por dia; o resto cobre o erro da estimativa. **Não verificado no painel da Cloudflare.**                                      |
| Por pessoa             | de 250 a 1.000 créditos por dia | Parte justa de 12% do que ainda resta no dia, entre o piso de 250 e o teto de 1.000. Com o dia vazio quem usa muito vai longe; com o dia cheio todos voltam ao piso. |
| Um pedido              | 300 créditos no máximo          | Um texto gigante não esvazia o dia. Acima disso, o servidor responde 413.                                                                                            |
| Por endereço, por dia  | 2.500 créditos e 400 pedidos    | Uma turma atrás do mesmo endereço.                                                                                                                                   |
| Por pessoa, por minuto | 5 pedidos                       | Já existia.                                                                                                                                                          |
| Por pessoa, por dia    | 60 pedidos                      | Já existia, mais alto porque o custo agora é contado em créditos.                                                                                                    |
| Pedidos ao mesmo tempo | 1 por pessoa                    | Trava com validade de 75 segundos, para um pedido que morreu não prender a pessoa.                                                                                   |
| Texto enviado          | 36.000 caracteres               | Contrato `helena-contract.ts`.                                                                                                                                       |
| Janela                 | 00:00 UTC (21h em Brasília)     | A tela mostra quanto resta e quando volta.                                                                                                                           |

Conta de ordem de grandeza (**não medida em uso real**): um resumo de 8.000 caracteres custa algo como 60 a 80 créditos; flashcards e quiz curtos custam menos que isso. Então 8.000 créditos por dia rendem da ordem de uma centena de pedidos grandes para todo mundo, e bem mais pedidos pequenos. O orçamento só **redistribui** a cota gratuita; não a aumenta. Se a cota acabar antes do teto interno, a Cloudflare responde 429 e a tela avisa que a Olena atingiu o limite do dia.

**Acerto da conta:** pedido que termina bem paga o gasto real (ou uma estimativa pelo tamanho da resposta, quando o provedor não informa tokens). Pedido que falha ou passa do tempo não cobra nada da pessoa e cobra da conta global só a entrada. Se a pessoa cancela no meio do resumo, paga o que já saiu. É melhor esforço: se a gravação disputada do contador falhar, o valor reservado fica gasto.

**Consulta do saldo:** `GET /api/helena?usage=1` (com a conta) devolve créditos usados, limite, saldo, custo máximo de um pedido e segundos até zerar. A tela de gerar mostra "Créditos de hoje". Não conta como pedido.

A conversa, o plano de estudo e a explicação seguem **desligados** (`HELENA_CHAT_ENABLED`). Só os quatro pedidos da Biblioteca são atendidos.

## Segurança do pedido

- **Texto limpo no servidor:** as fontes passam por `sanitizeSourceText` (normaliza Unicode, tira caracteres de controle e de direção de texto, que escondem instruções, corta repetições enormes de um mesmo caractere e espaços repetidos). Texto que não parece texto (lixo de PDF) é recusado com 400 antes de gastar crédito.
- **Pedido repetido:** o app envia `Idempotency-Key` único por tentativa; sem ela, o servidor usa o hash do corpo. O mesmo pedido em 15 minutos responde 409 e não cobra de novo.
- **Um por vez:** uma trava por pessoa recusa o segundo pedido enquanto o primeiro corre (429, "busy").
- **Identidade em hash:** os contadores guardam o hash da conta e do endereço, nunca o valor.
- **Registro:** eventos de segurança (`helena_<evento>`) saem em JSON com identidade em hash, sem o texto das fontes.
- **Não feito (da dona do projeto):** exigir App Check em `/api/helena` (`FIREBASE_APPCHECK_ENFORCE` na Vercel, depois de o app enviar o cabeçalho) e acrescentar à política de privacidade um parágrafo sobre o envio do texto das fontes à Olena e à Cloudflare.

## Ameaças e proteções

| Ameaça                                              | Proteção                                                                                                                                                                                            | Verificado                                                                                                                         |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Pedido sem conta ou com conta anônima gastar a cota | `identifyClient` recusa anônimo e sem login (401); a tela orienta a entrar e não lê nem envia nada                                                                                                  | teste de unidade e e2e                                                                                                             |
| Uma pessoa esgotar a cota de todas                  | crédito por pessoa (elástico), por endereço e global, um pedido por vez e teto por pedido                                                                                                           | testes do handler e do runtime                                                                                                     |
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
- Depois de gastar os créditos do dia, só no dia seguinte (21h em Brasília). Cota global esgotada vale para todos.
- Qualidade: o modelo é pequeno (8 bilhões de parâmetros) e o português dele é irregular. A leitura de uma prova real, que as regras fazem com 35 de 35 questões, passa a depender do modelo e pode errar. **Não medido**: rode a prova da PUC e compare antes de confiar.

## Pendente para a proprietária

- **Política de Privacidade** (`public/politica-de-privacidade.html`): cita a voz por IA, mas não diz que o texto das fontes da Biblioteca vai à Olena (Cloudflare Workers AI). Precisa de um parágrafo. Não alterei, por ser texto legal.
- **Conferir no painel da Cloudflare** o consumo real de neurons por pedido e ajustar `STUDY_GLOBAL_DAILY_LIMIT` e `GLOBAL_DAILY_LIMIT`.
- **Decidir o destino do código gratuito**: as telas deixaram de usá-lo, mas os motores (`src/domain/pdf-summary/*`, `flashcard-quality`, `source-quiz.ts` em parte) continuam no repositório. Podem ser removidos em uma PR de limpeza ou mantidos como base de um futuro modo sem rede.
