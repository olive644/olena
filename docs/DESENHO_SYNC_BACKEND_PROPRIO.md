# Desenho: sincronização da conta em banco próprio (proposta)

Status: **proposta, sem código**. Nada aqui foi implementado, contratado ou publicado. Este documento só prepara a decisão da dona do projeto. Complementa a seção 3 de `docs/OPERACAO_E_CUSTOS.md` ("Trocar de banco de dados"), que hoje diz "não migrar agora".

## 1. Por que o assunto voltou

Em outubro o Realtime Database do Firebase registrou 182 GB de download contra 10 GB gratuitos no plano Spark (ver `docs/OPERACAO_E_CUSTOS.md`, seção 2). A PR #551 reduziu o tráfego da sincronização (leitura só de `updatedAt`, stream só de `updatedAt`, envio por PATCH das chaves alteradas). O efeito dela **ainda não foi medido**.

A causa de fundo é o formato: a conta é guardada como poucos blocos grandes (o espaço de estudos, `helenastudy.workspace.v1`, aceita até 20 milhões de caracteres). Qualquer provedor que cobre por tráfego tornaria esse desenho caro. Por isso a ordem recomendada é: medir, ajustar o formato, e só então decidir se vale trocar de banco.

## 2. O que já existe e pode ser reaproveitado

- **Verificação de token no servidor:** `src/backend/firebase-account-identity.ts` valida o token do Firebase Auth com as chaves públicas do Google (biblioteca `jose`, já dependência do projeto). Uma API de sincronização própria pode usar a mesma função.
- **Funções em `api/`** na Vercel, com limite de uso por quem chama e armazenamento chave-valor com `compareAndSet` (`src/backend/kv-store.ts`).
- **Chaves sincronizadas:** 17 chaves em `SYNCED_STORAGE_KEYS` (`src/data/synced-storage.ts`), sem pontos nos nomes no transporte (`cloudWireName`).
- **Regra de produto (AGENTS.md):** progresso, agenda, histórico de Cronômetro/Pomodoro e sessão de Foco pertencem à conta autenticada. O armazenamento do aparelho é cache e fila offline. Registros concluídos não podem ser sobrescritos por cópias antigas ou vazias. Contas ficam isoladas. Um contador recuperado não inicia sozinho em outro aparelho.

## 3. Opções

| Opção                                  | O que é                                                                                                                 | Prós                                                                           | Contras                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| A. Ficar no Firebase e reformatar      | Blaze com alerta de orçamento, espaço de estudos dividido em partes menores (um caderno por chave), compressão do valor | Menor esforço e risco, mantém o tempo real                                     | Continua dependente do Firebase e do preço por tráfego                     |
| B. Postgres gerenciado e API em `api/` | Tabela de itens por conta, API de sincronização por diferenças, login continua no Firebase Auth                         | Tráfego e custo previsíveis, consultas e backup melhores, formato sob controle | Semanas de trabalho, perde o stream do Firebase, outro serviço para operar |
| C. Servidor próprio (VPS)              | Postgres e API em máquina própria                                                                                       | Maior controle, menor custo fixo                                               | Manutenção, backup, segurança e atualização ficam com a dona               |

Valores de planos e limites mudam. A seção 3 de `OPERACAO_E_CUSTOS.md` registra números do Supabase conferidos em 17/10/2026 (500 MB de banco, 5 GB de egress sem cache e 5 GB com cache por mês, pausa após 7 dias sem uso). Qualquer outro número **não foi verificado** e deve ser conferido nas páginas oficiais antes de decidir.

**Recomendação:** A agora, com a medição do efeito da PR #551. B só se o custo ou o limite continuar um problema depois disso. C não é recomendada.

## 4. Proposta técnica para a opção B

### 4.1 Autenticação

O login e o recadastro continuam no Firebase Auth (a cota do Realtime Database não é consumida por ele). Cada chamada traz `Authorization: Bearer <idToken>`. A função valida o token, extrai o `uid` e **nunca confia em um `uid` vindo do corpo**. Contas anônimas não gravam (mesma regra das regras atuais do Firebase). Sem token válido: `401`, sem corpo útil.

### 4.2 Modelo de dados

```text
sync_items
  uid          text      -- dono, vindo do token
  key          text      -- uma das 17 chaves permitidas
  value        text      -- conteúdo (limite por chave, ver 4.5)
  revision     bigint    -- sobe a cada gravação da chave
  updated_at   timestamptz
  primary key (uid, key)

sync_accounts
  uid          text primary key
  head         bigint    -- maior revision da conta (cursor)
  updated_at   timestamptz
```

Toda consulta filtra por `uid`. Em Postgres, a tabela usa segurança por linha (row level security) como segunda barreira, além do filtro na função.

### 4.3 Contrato da API

- `GET /api/sync?since=<cursor>`: devolve só as chaves com `revision` maior que o cursor, mais o novo cursor. Sem `since`, devolve tudo (carga inicial e "Sincronizar agora").
- `PATCH /api/sync`: corpo `{ "items": { "<chave>": { "value": "...", "baseRevision": 12 } } }`. Se `baseRevision` for menor que a revisão atual da chave, responde `409` com o valor atual, e o app aplica a conciliação por chave que já existe (`mergeItems`). Nunca sobrescreve em silêncio.
- `GET /api/sync/head`: devolve só o cursor (alguns bytes), usado para a conferência leve antes de salvar.
- Sessão de Foco continua gravada sozinha, sem mexer no cursor global, para não obrigar outros aparelhos a baixar nada.

### 4.4 Tempo real

O Firebase oferece stream; Postgres puro não. Duas saídas, a decidir:

1. **Consulta leve periódica** do cursor (`/head`) com intervalo maior quando a aba está em segundo plano. Simples e barata, com atraso de alguns segundos.
2. **Serviço de tempo real gerenciado** (por exemplo, o do próprio provedor de Postgres). Menos atraso, mais uma peça para operar e pagar.

As salas e o restante que usam o Realtime Database (ver seção 3 de `OPERACAO_E_CUSTOS.md`) **não fazem parte desta proposta**. Migrar só a conta deixa o Firebase para o que ele faz melhor.

### 4.5 Limites e custo (regra do projeto)

Todo recurso que gasta dinheiro precisa de limite por quem chama e de teto global:

- Por conta: máximo de gravações por minuto, tamanho máximo por chave e total por conta.
- Global: teto diário de requisições e de bytes transferidos, com alarme antes de chegar nele e resposta `429` ao passar.
- Compressão do valor antes de gravar (a decidir em teste, com medição).
- Alerta de orçamento configurado no provedor **antes** de qualquer uso pago. Isso é ação da dona do projeto.

### 4.6 Migração sem perder dados

1. Fase 0: nenhuma mudança de comportamento. Criar o serviço e a API atrás de uma chave desligada.
2. Fase 1: **escrita dupla**. O app continua lendo do Firebase e grava também na API nova. Compara os dois em segundo plano e registra divergências.
3. Fase 2: leitura pela API nova para um grupo pequeno de contas, com volta imediata ao Firebase se algo divergir.
4. Fase 3: todas as contas. O Firebase fica como cópia somente leitura por um período combinado.
5. Fase 4: desligar a escrita no Firebase. Só depois de a dona confirmar.

Regras que valem em todas as fases: nunca substituir um registro concluído por uma cópia antiga ou vazia; sem conexão, mostrar que o envio à conta está pendente; sem login, orientar a entrar; contas isoladas; contador recuperado não inicia sozinho em outro aparelho.

### 4.7 Modelo de ameaça (resumo)

| Risco                                    | Mitigação                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Uma conta ler ou gravar dados de outra   | `uid` só do token, filtro por `uid` em toda consulta, segurança por linha, teste com duas identidades              |
| Token roubado ou expirado                | Validação de assinatura, emissor, público e validade; sem confiar em cache de sessão                               |
| Conteúdo malicioso nos valores           | Valores tratados como não confiáveis (AGENTS.md), limite de tamanho, nunca executados, validação ao aplicar no app |
| Abuso de custo (laço de gravações, bots) | Limite por conta e por rede, teto global, `429`, alarme                                                            |
| Perda de dados na migração               | Escrita dupla, comparação, volta ao Firebase, Firebase mantido como cópia                                          |
| Vazamento de chaves do servidor          | Variáveis só na Vercel, nunca no repositório (ação da dona)                                                        |

## 5. Testes exigidos (quando for implementar)

- Isolamento entre contas com duas identidades reais (não só mocks).
- Conflito `409` e conciliação por chave, incluindo o caso de registro concluído contra cópia antiga.
- Limites por conta e globais.
- Migração com escrita dupla e com divergência forçada.
- Falha de rede no meio de um PATCH e retomada pela fila do aparelho.
- E2E de Foco, conta e sincronização em desktop e celular, nos modos claro e escuro quando a interface mudar.

## 6. O que fica com a dona do projeto

Escolher a opção, contratar o provedor, criar o banco e as chaves, configurar variáveis na Vercel, definir alerta e teto de orçamento, e autorizar cada fase da migração. O repositório só recebe código depois dessa decisão, em PR própria, com modelo de ameaça e testes.

## 7. Próximos passos sugeridos

1. Medir o uso do Realtime Database nos dias seguintes à #551 (aba Uso do console, ou `firebase database:profile`).
2. Confirmar na aba Rede que o `PATCH` volta com status 200 (não verificado até agora).
3. Se o consumo continuar alto, dividir o espaço de estudos por caderno (opção A) antes de pensar em trocar de banco.
4. Só então reabrir a decisão entre A e B com números reais.
