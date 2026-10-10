# Arquitetura atual

```text
Views React
  -> dispatch de ações tipadas
  -> workspaceReducer
  -> WorkspaceState versionado
  -> localStorage + conta Firebase sincronizada

Plano de aula
  -> dados validados do formulário
  -> gerador determinístico
  -> visualização local

Futura Helena inteligente
  -> seleção explícita de fontes + consentimento
  -> cliente same-origin /api/helena
  -> handler e adaptador de provedor no servidor
  -> resposta limitada e validada
```

`WorkspaceState` é a fonte única para matérias, tarefas, compromissos, hábitos, anotações, sessões
de foco, materiais, flashcards, metas e resultados de questionários. Os módulos não mantêm bancos
paralelos. O Espaço do aluno e o módulo Aprender derivam seus resumos desse estado compartilhado.

`src/product/module-catalog.ts` registra o estado dos módulos sem acoplar planejamento a uma
promessa visível. Somente módulos `available` podem fornecer atalhos executáveis. Módulos
`foundation` possuem apenas uma base técnica; módulos `planned` existem no mapa e no roadmap.

O armazenamento possui uma versão explícita e rejeita conteúdo inválido. A versão 3 migra os
estados das versões 1 e 2 sem apagar tarefas, notas ou materiais. Digitalizações e desenhos são
reduzidos no navegador, limitados a 1 MB por imagem e vinculados à anotação. A implementação local
continua oferecendo resposta imediata e a conta Google replica o estado no Realtime Database. A
nuvem é a fonte oficial quando já existe conteúdo para o usuário; uma conta vazia recebe o estado
local do primeiro dispositivo. Alterações remotas atualizam a interface sem exigir novo login.

Além do workspace, a conta sincroniza tema, respostas do onboarding, avatar oficial escolhido,
progresso das trilhas e o cache auxiliar de dificuldade. Cada usuário só pode ler e gravar
`users/<uid>` pelas regras do Firebase. A URL usa `VITE_FIREBASE_DATABASE_URL` quando definida e,
caso contrário, o endereço padrão derivado de `VITE_FIREBASE_PROJECT_ID`.

O envio mantém alterações locais como pendentes até a confirmação do Realtime Database. Uma falha
de rede não avança a revisão confirmada; o próximo ciclo ou a ação manual no Perfil tenta novamente.
O Perfil expõe carregando, sincronizando, sincronizado ou aguardando conexão, além do horário da
última confirmação. O logout explícito encerra a sessão persistida e remove deste dispositivo as
chaves sincronizadas da conta anterior.

Biblioteca, Praticar e o planejador de aulas são carregados sob demanda. As ferramentas de
captura do Caderno também usam um chunk separado. O manifesto do Vite
permite medir separadamente o JavaScript inicial e o total assíncrono. O orçamento atual está em
`scripts/check-performance-budget.mjs`: 278 KiB para a entrada e 1190 KiB para o conjunto, com tetos
absolutos de 400 KiB e 1500 KiB. Subir um orçamento exige justificativa registrada no próprio script.

O gerador de planos continua independente da interface e da central de estudos. Uma futura IA
poderá implementar outra estratégia sem substituir o fluxo determinístico existente.

A fronteira da futura IA está descrita em [`AI_BACKEND.md`](AI_BACKEND.md). O contrato rejeita
campos desconhecidos e não aceita o workspace completo. A chave do provedor pertence exclusivamente
ao ambiente do servidor. O handler usa `Request` e `Response` web para continuar independente do
runtime de hospedagem; os adaptadores de provedor, identificação e rate limit ainda precisam ser
escolhidos antes da ativação.

## Servidor e Modo Sala

O aplicativo é uma SPA estática na Vercel, mais funções em `api/` (Node ESM):

| Função                   | Papel                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `api/local-room.ts`      | autoridade do Modo Sala: criar, entrar, iniciar, responder, remover, fechar, bingo |
| `api/room-recording.ts`  | falas gravadas pelo professor para a Escuta Coletiva                               |
| `api/speech.ts`          | voz natural do quiz (Cloudflare Workers AI), com cache e limites                   |
| `api/notebook-collab.ts` | colaboração e leitura de cadernos compartilhados                                   |
| `api/google-calendar.ts` | leitura do Google Agenda, com sessão cifrada                                       |
| `api/olena.ts`           | Olena API v1: catálogo de Praticar e desafio de Matemática, sem IA                 |
| `api/room-cleanup.ts`    | limpeza diária (cron) de salas e dados vencidos, protegida por `CRON_SECRET`       |

Cada função é um handler web (`Request` e `Response`) em `src/backend`, independente do runtime da
Vercel e testável sem rede.

No Modo Sala, o servidor é a única autoridade. O estado completo, com o token do anfitrião e as
respostas certas, fica em `/private-rooms/<código>` e ninguém o lê pelo navegador. A projeção
pública, sem segredos, vai para `/rooms/<código>` no Firebase Realtime Database, e cada navegador a
recebe por Server-Sent Events (`EventSource`) em `src/hooks/use-local-room.ts`, sem o SDK do
Firebase. O armazenamento passa pela abstração `KvStore` (`src/backend/kv-store.ts`), com
concorrência otimista por versão (ETag): conflitos são repetidos, nunca sobrescritos. Cada
requisição passa por `room-guard` (validação, limite de pedidos por origem e verificação do App
Check, quando ativado). A sala tem prazo absoluto de 4 horas e, depois de encerrada, deixa de ser
pública em 30 minutos. As regras do Firebase estão em `firebase-room.rules.json`, e a configuração
completa em [`ROOM_SETUP.md`](ROOM_SETUP.md).

## Limites

- `src/domain`: regras, modelos do workspace e gerador de plano de aula;
- `src/ai`: contrato compartilhado e limites da futura integração;
- `src/backend`: handlers HTTP portáveis usados por `api/` (sala, voz, agenda, cadernos, Olena, IA);
- `api`: funções da Vercel, finas, que apenas montam as dependências dos handlers;
- `services/tts`: serviço de voz próprio (Kokoro e Piper), mantido fora de uso em produção;
- `firebase-room.rules.json`: regras do Realtime Database publicadas no console do Firebase;
- `src/data`: persistência e validação da fronteira local;
- `src/hooks`: ligação entre React e o domínio;
- `src/components`: componentes visuais reutilizáveis;
- `src/product`: catálogo tipado e decisões de composição do produto;
- `src/views`: experiências do Espaço do aluno, Agenda, Foco, Hábitos, Cadernos, Praticar, Modo Sala e
  planos de aula;
- `src/app.tsx`: roteamento local e composição da aplicação;
- `src/styles.css`: tokens e layout responsivo;
- `e2e`: contratos visíveis ao usuário.
