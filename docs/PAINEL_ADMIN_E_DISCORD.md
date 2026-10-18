# Painel admin e ponte com o Discord: plano de execução

Este documento organiza como será feito o painel admin do OlenaStudy: um chat do aluno com o time dentro do app, ligado ao Discord, mais avisos automáticos de eventos. É escrito para o segundo dev executar em pull requests pequenas, e para qualquer IA que for ajudar. Ele é um **plano**, não código: nada aqui está implementado, e tudo que for pago ou externo depende de decisão da dona do projeto.

Leia antes: `AGENTS.md` (regras de trabalho, segurança e custos), `docs/OPERACAO_E_CUSTOS.md` e `docs/SOCIAL_REALTIME_SECURITY.md` (o padrão de avisos em tempo real que este plano reaproveita).

## 1. O que se quer

1. **Chat do aluno com o time.** O aluno escreve dentro do app. A mensagem chega no Discord e qualquer um dos três do time responde. A resposta aparece no app do aluno.
2. **Avisos no Discord** (um bot): usuário novo, login, volta depois de um tempo offline, tag nova, invicto em algo, exclusão ou saída da conta, meta de nível ou conquistas, carta ganha (qualquer raridade).
3. **Números:** quantos online agora, total de contas, offline.
4. **Políticas:** aviso quando alguém infringir uma política do app.

## 2. Decisões que precisam da dona antes de começar

Nada abaixo deve ser codado antes destas respostas. Cada uma muda a arquitetura.

| #   | Decisão                                                    | Recomendação                                                                                                                                                                                            |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Quem recebe os avisos e responde: um servidor Discord novo | Criar um servidor só do time, com canais separados (ver seção 5). Não misturar com comunidade.                                                                                                          |
| D2  | Aviso por evento identifica a pessoa?                      | Mostrar só o @ do app e um código curto da conta, nunca e-mail, nome do Google nem UID. Ver seção 7.                                                                                                    |
| D3  | O aluno é avisado de que escreve para pessoas?             | Sim, na tela do chat e na Política de Privacidade (o Discord vira um terceiro que recebe dados). É exigência do `AGENTS.md` (conteúdo a serviço externo exige consentimento claro e fluxo documentado). |
| D4  | Quanto tempo guardar as conversas                          | Sugestão: 90 dias, apagadas junto com a conta. Decidir e registrar.                                                                                                                                     |
| D5  | O que conta como "infringir política"                      | Hoje não há lista fechada. Definir uma lista curta (seção 8) antes de implementar a detecção.                                                                                                           |
| D6  | Painel web, além do Discord                                | Não no primeiro momento. O Discord já é o painel (comandos e botões). Uma página `/admin` só depois, se precisar de busca ou histórico.                                                                 |
| D7  | Quem são os 3 administradores                              | Lista fixa de IDs do Discord e de UIDs do Firebase, em variável de ambiente da Vercel. Nunca no repositório.                                                                                            |
| D8  | Custo                                                      | O plano inicial não usa serviço pago novo. Vercel Hobby é gratuito mas limita o uso comercial (não verificado, conferir os termos). O Discord é gratuito. Se algo exigir plano pago, parar e perguntar. |

## 3. Visão geral da arquitetura

```
 App (aluno)  ──HTTPS + token Firebase──►  /api/support  (Vercel)
      ▲                                        │
      │ SSE (aviso de mensagem nova)           ├─► Firebase Realtime Database (conversas, só pelo servidor)
      │                                        │
      └──────────── /api/support?stream=1 ◄────┘
                                               │
                         bot do Discord  ◄─────┘  (saída: o servidor chama a API REST do Discord)
                              │
                       Discord (time)  ──►  /api/discord-interactions  (Vercel)
                                            (entrada: comando /responder, botão Responder)
```

Princípios que vêm do repositório e devem ser mantidos:

- O navegador **nunca** lê nem escreve as conversas direto no Firebase. As regras negam tudo (como `privateProfileSocial`), e só o servidor acessa.
- A identidade do aluno vem do **token Firebase verificado**, nunca de campo enviado no corpo (como `identifyProfileAccount`).
- Todo recurso que gasta tem **limite por quem chama e teto global** (como `checkRateLimit`, `speech-quota`).
- Segredos só em variáveis da Vercel, sem prefixo `VITE_`. Nunca no repositório.

## 4. Chat entre o aluno e o time

### 4.1 Caminho de ida (aluno para o Discord)

1. O aluno logado (não anônimo) envia a mensagem para `POST /api/support`.
2. O servidor valida: token, origem permitida, tamanho (sugestão: até 1.000 caracteres), cota (sugestão: 10 mensagens por hora e 50 por dia por conta, teto global diário), e se a conta existe.
3. Grava a mensagem na conversa da conta e posta no Discord.
4. No Discord, **uma conversa por aluno = uma thread** (fio) em um canal `#suporte`. A primeira mensagem cria a thread, nomeada com o código curto da conta, nunca com nome. As seguintes entram na mesma thread. O mapa `conta para thread` fica no banco.

### 4.2 Caminho de volta (time para o aluno)

Discord permite duas formas, e a diferença importa para o custo:

| Opção                                                         | Como funciona                                                                                                                         | Custo e risco                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Interações por HTTP (recomendada)**                      | Um comando `/responder` ou um botão "Responder" na mensagem do aluno abre um formulário. O Discord chama `/api/discord-interactions`. | Funciona em função serverless da Vercel, sem processo ligado. Exige verificar a assinatura Ed25519 de cada pedido e responder em poucos segundos (não verificado, conferir na documentação do Discord).                                  |
| **B. Bot ligado ao Gateway (responder escrevendo na thread)** | Um processo fica conectado ao Discord e lê as mensagens da thread.                                                                    | Mais natural para o time (basta escrever), mas exige um processo sempre ligado, que não roda na Vercel. Hospedar custa, e o plano gratuito de hospedagem sempre ligada é incerto. Exige também a permissão de ler conteúdo de mensagens. |

**Recomendação:** começar pela A. Se o time achar o comando trabalhoso, reavaliar a B com custo medido, e decidir com a dona.

Cada resposta do time grava `autor = time` (nunca o nome do Discord de quem respondeu, a não ser que a dona decida mostrar um apelido) e chega ao app do aluno.

### 4.3 Entrega no app

Reaproveitar o padrão de `docs/SOCIAL_REALTIME_SECURITY.md`: um fluxo SSE autenticado `GET /api/support?stream=1` que avisa só "mudou", e o app busca a conversa. Mesmos limites (conexão curta, cota por conta, teto global, sem token na URL). Polling lento como recuperação.

### 4.4 Interface no app

- Entrada do chat no Perfil ou no menu de Configurações, com o texto: "Você está falando com pessoas do time da Olena. Elas leem o que você escrever." (D3).
- Estado honesto: "enviando", "enviada", "o time ainda não respondeu". Sem login: "Entre na sua conta para falar com o time." Sem conexão: dizer que o envio está pendente, sem fingir que foi (regra de produto do `AGENTS.md`).
- Funciona com teclado, toque e larguras móveis. Sem hover obrigatório. Seguir `docs/DESIGN_SYSTEM.md` (foco em papel, sem contorno automático).
- Loading usa `HelenaLoading`.

### 4.5 Dados

- Nova folha no banco, sugestão `private-support/<sha256(uid)>`, com `.read` e `.write` falsos nas regras. Atualizar `firebase-room.rules.json` e `src/firebase-user-rules.test.ts`, e **a dona publica as regras** (ação fora do repositório).
- Mensagens guardam: id, autor (`aluno` ou `time`), texto, data. Nada de e-mail, nome ou UID.
- Retenção (D4) e **exclusão junto com a conta**: ligar ao fluxo de `src/data/account-deletion.ts` e à limpeza no servidor, com teste.

## 5. Estrutura sugerida no Discord

| Canal         | O que recebe                                              | Frequência                     |
| ------------- | --------------------------------------------------------- | ------------------------------ |
| `#suporte`    | uma thread por aluno (chat)                               | por mensagem                   |
| `#contas`     | novo cadastro, saída ou exclusão, volta depois de offline | resumo ou por evento (seção 6) |
| `#conquistas` | tags, nível, conquistas, invicto, cartas                  | em lote (seção 6)              |
| `#numeros`    | online, total, offline                                    | resumo periódico               |
| `#politicas`  | possíveis infrações                                       | imediato                       |
| `#bot-erros`  | falhas do próprio bot (envio falhou, cota estourada)      | por evento                     |

Canais separados deixam cada pessoa silenciar o que não é da sua função.

## 6. Avisos automáticos de eventos

### 6.1 O ponto técnico mais importante

**O servidor não vê a maior parte desses eventos.** Progresso, tags, cartas e conquistas vivem no `localStorage` do aluno e sincronizam direto com o Firebase pelas chaves de `users/$uid`. Não há gatilho no servidor. Gatilhos automáticos do Firebase (funções) exigem o plano pago, e o projeto não tem verba para isso agora.

Por isso, a única forma viável sem custo é o **app enviar um evento mínimo para `/api/admin-events`** quando algo acontece. Consequências:

- O evento é **informativo, nunca autoridade**. Um aluno malicioso pode forjar um evento. Ele só faria aparecer uma linha falsa no Discord. Por isso o evento **não concede nada** (nenhuma recompensa, nenhum status) e o servidor aplica cota por conta e teto global.
- O consentimento (D3) cobre isso, e a Política de Privacidade precisa citar o Discord e o que é enviado.
- Eventos que **o servidor já vê de verdade** (cadastro, exclusão de conta, reserva de @, bloqueio por limite) devem ser emitidos **no servidor**, sem confiar no app.

### 6.2 Lista de eventos e de onde cada um nasce

| Evento                              | Quem emite                                     | Observação                                                                                            |
| ----------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Usuário novo                        | servidor (no primeiro login ou reserva de @)   | confiável                                                                                             |
| Exclusão ou saída da conta          | servidor (fluxo de exclusão)                   | confiável. Saída (logout) é do app: informativo                                                       |
| Login                               | app                                            | muito frequente: agrupar (seção 6.3)                                                                  |
| Voltou depois de um período offline | app (compara a última visita)                  | definir o período, sugestão: 7 dias                                                                   |
| Tag nova                            | app                                            | informativo                                                                                           |
| Invicto em algo                     | app (sequência já existe em `profile-streaks`) | definir o que é "invicto" e o mínimo para avisar                                                      |
| Meta de nível ou de conquistas      | app                                            | enviar só o marco (por exemplo "nível 10"), não cada ponto                                            |
| Carta ganha (qualquer raridade)     | app                                            | muito frequente: agrupar. Mostrar raridade e nome da carta, nunca dados da conta além do código curto |
| Possível infração de política       | servidor                                       | ver seção 8                                                                                           |

### 6.3 Controle de volume

O Discord limita a velocidade de envio (valores de memória, não verificados: conferir na documentação). Evite um aviso por login. Regras:

- **Imediato:** chat, infração de política, exclusão de conta, erro do bot.
- **Em lote a cada N minutos** (sugestão 10): logins, cartas, tags, níveis, conquistas, volta depois de offline. Uma mensagem só, tipo "12 logins, 4 cartas (1 rara), 2 níveis".
- **Resumo periódico** em `#numeros` (sugestão: a cada hora e um resumo diário).
- Cada evento tem **id único** para não duplicar quando o app reenviar.
- O modo "silencioso" por tipo de evento (desligar via variável) evita redeploy.

## 7. Privacidade e segurança (obrigatório)

- **Minimização:** o aviso leva só `@`, um código curto da conta e o dado do evento. Nunca e-mail, nome do Google, UID, token, foto, IP nem o conteúdo de estudos. Mensagens do chat são a exceção, porque o aluno escolheu escrever para o time.
- **Texto do aluno é não confiável.** Antes de postar no Discord: limitar tamanho, escapar markdown, bloquear menções (`allowed_mentions` vazio, para que `@everyone` do aluno não notifique o servidor inteiro) e remover links automáticos se o time preferir.
- **Segredos:** token do bot, chave pública e ids do Discord ficam só na Vercel (`DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_*_CHANNEL_ID`, `ADMIN_DISCORD_IDS`). Entram no `.env.example` **sem valor**. Se um token vazar, revogar e gerar outro no painel do Discord.
- **Entrada do Discord:** verificar a assinatura de cada chamada em `/api/discord-interactions` e recusar o que não bater. Só os IDs de `ADMIN_DISCORD_IDS` podem responder.
- **App Check e origem:** `/api/support` e `/api/admin-events` seguem o guarda de `room-guard.ts`.
- **Contas anônimas não usam o chat** nem enviam eventos.
- **Menores:** a Política de Privacidade trata o uso por menores com autorização de responsável. O chat deve avisar para não enviar dados pessoais sensíveis.
- **Registro de decisões:** modelo de ameaça curto em `docs/` e entrada em `docs/CURRENT_STATE_AUDIT.md`, como pede o `AGENTS.md` (IA, autenticação e armazenamento remoto entram em PR própria, com modelo de ameaça e testes).

## 8. Política e infração

Hoje o app não tem uma lista fechada de políticas. Definir primeiro (D5). Sugestão de lista inicial, **só o que o servidor consegue observar de verdade**:

| Possível infração                                  | Sinal observável                                              |
| -------------------------------------------------- | ------------------------------------------------------------- |
| Abuso de limite                                    | muitos bloqueios por cota seguidos na mesma conta ou endereço |
| @ ofensivo ou reservado                            | recusa da reserva de @ por regra de conteúdo (`text-review`)  |
| Spam ou ofensa no chat do time                     | mensagem barrada por tamanho, repetição ou lista de termos    |
| Tentativa de forjar evento ou de chamar rota admin | pedido recusado por assinatura ou autorização                 |

O aviso diz **o tipo e a conta (código curto)**, nunca acusa, e a decisão de agir é humana. **Banir ou silenciar não faz parte da primeira versão**: é uma ação com risco de injustiça e precisa de regra clara, apelação e registro.

## 9. Presença: online, total e offline

O app não tem presença hoje (`docs/PROFILE_SOCIAL.md`). Contar "online" é custo recorrente de escrita.

- **Total de contas:** um contador atualizado no servidor no cadastro e na exclusão. Barato.
- **Online agora:** o app manda um sinal de vida a cada 2 a 5 minutos enquanto a aba está visível. O servidor guarda por faixa de tempo e conta as contas distintas da última faixa. **Cada sinal é uma escrita**, então precisa de cota por conta e de teto global, e o consumo no Realtime Database precisa ser medido antes de ligar em produção (o plano Spark tem limite de download e escrita, e já houve estouro de download).
- **Offline:** total menos online. É aproximação, e o texto deve dizer "aproximado".
- Se o custo não couber, entregar só "total" e "ativos hoje" (um contador diário), sem presença em tempo real.

## 10. Como dividir em pull requests (para o Leo)

Cada PR tem teste que falha sem a mudança e passa o `npm run verify`. Mudança de fluxo principal passa também pelo `npm run test:e2e`. Não misturar etapas.

| PR  | Escopo                                                                                                                                     | Depende de                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| 0   | Decisões D1 a D8 respondidas e registradas em `docs/CURRENT_STATE_AUDIT.md`. Servidor e bot do Discord criados pela dona.                  | dona                              |
| 1   | Contrato e modelo de ameaça em `docs/`. Esquema de dados, regras do Firebase e teste de regras. Sem código de tela.                        | PR 0                              |
| 2   | `/api/support`: enviar e ler conversa, cotas, exclusão com a conta. Sem Discord ainda. Testes de autorização e de isolamento entre contas. | PR 1                              |
| 3   | Saída para o Discord: criar a thread e postar a mensagem. Escape de texto e `allowed_mentions` vazio, com teste.                           | PR 2                              |
| 4   | Entrada do Discord: `/api/discord-interactions`, verificação de assinatura, `/responder`, lista de administradores.                        | PR 3                              |
| 5   | Tela do chat no app, SSE de aviso, estados honestos, teclado e mobile, e2e.                                                                | PR 2 e 4                          |
| 6   | Política de Privacidade e tela de aviso de consentimento (D3).                                                                             | antes de ligar a PR 5 em produção |
| 7   | `/api/admin-events`: eventos do servidor (cadastro, exclusão), lote e resumo.                                                              | PR 1                              |
| 8   | Eventos do app (login, volta, tag, invicto, nível, carta) com consentimento, cota e id único.                                              | PR 7 e 6                          |
| 9   | Contagens: total, ativos hoje e, se o custo couber, online.                                                                                | PR 7                              |
| 10  | Infrações de política (seção 8), só avisos.                                                                                                | PR 7                              |
| 11  | Opcional: página `/admin` somente leitura, se o Discord não bastar.                                                                        | PR 9                              |

A ordem permite entregar **o chat primeiro** (PR 1 a 6), que é o que dá mais valor, e deixar os avisos para depois.

## 11. Critérios de pronto de cada etapa

- Nenhum segredo no repositório, no log nem na resposta da API.
- Cada rota nova tem teste de: sem login (recusa), anônimo (recusa), conta de outra pessoa (não vê), cota estourada (429) e corpo gigante (413).
- Texto do aluno com `@everyone`, markdown e link não vira menção nem formatação no Discord.
- Excluir a conta apaga a conversa e os registros ligados a ela.
- Sem conexão ou sem login, a tela diz a verdade (não finge envio).
- `docs/CURRENT_STATE_AUDIT.md` e `docs/SECOND_BRAIN.md` atualizados na mesma PR.
- Sem travessões em textos, documentação ou comentários.

## 12. O que não foi verificado

- Limites de envio e regras de assinatura do Discord (vieram de memória, conferir na documentação oficial).
- Custo do Realtime Database com presença e chat. Medir antes de ligar.
- Se o plano Hobby da Vercel permite esse uso comercial.
- Se o time prefere comando, botão ou escrever direto na thread (define A ou B da seção 4.2).
