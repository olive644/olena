# OlenaStudy: documentação completa

Versão do documento: 30 de outubro de 2026. Versão do pacote: `0.1.0-alpha.1`.

Este é o ponto de entrada da documentação. Ele descreve o produto, a arquitetura, os dados, a segurança, a operação e as regras de trabalho, e aponta para o documento detalhado de cada assunto na pasta `docs/`. Onde um fato não foi conferido, ele aparece marcado como "não verificado" e diz como conferir. Em caso de divergência, vale o código, depois o documento específico do assunto, depois este texto.

## 1. O que é o OlenaStudy

O OlenaStudy é o segundo aplicativo da marca Oli: uma central de estudos, foco e rotina. Reúne agenda, tarefas, temporizador de foco, cadernos (com digitalização e escrita à mão), biblioteca, flashcards, quizzes, bingo, jogos de prática, salas ao vivo para professores e planejamento de aulas em um único espaço. A promessa do produto é "Estude, organize e avance com a Olena".

Público inicial: estudantes que querem organizar rotina e matérias, professores de inglês e professores particulares, e pessoas que precisam juntar tarefas, foco e anotações.

Princípios que atravessam todo o projeto:

- **Funciona sem conta.** O workspace fica no dispositivo por padrão. Quem não quer entrar usa o modo convidado.
- **A conta é a dona dos dados de progresso.** Com login, agenda, histórico de foco, progresso e recompensas sincronizam entre aparelhos. O armazenamento do dispositivo é cache e fila de recuperação offline, nunca um "modo de sincronização local".
- **Honestidade nos nomes.** Recurso simulado ou local não é apresentado como IA, sincronização ou nuvem. Sem conexão, o app diz que o envio está pendente. Sem login, orienta a entrar e não finge que salvou na nuvem.
- **Identidade visual de papel recortado**, com paleta própria e regras de acessibilidade (seção 11).
- **Custo controlado.** Todo recurso que gasta dinheiro tem limite por quem chama e teto global (seção 14).

Licença: software proprietário, todos os direitos reservados (arquivo `LICENSE`). Vulnerabilidades devem ser relatadas em privado, conforme `SECURITY.md`.

## 2. Mapa do produto

### 2.1 Abas e endereços

Cada aba tem o seu endereço, definido em `src/domain/app-routes.ts`. Recarregar a página, usar o botão voltar ou abrir um link leva à mesma tela. Novas abas precisam entrar em `VIEW_PATHS` e no `rewrite` do `vercel.json`.

| Aba                 | Endereço                           | Para que serve                                     |
| ------------------- | ---------------------------------- | -------------------------------------------------- |
| Espaço do aluno     | `/`                                | Início: prioridades do dia, progresso, atalhos     |
| Notificações        | `/notificacoes`                    | Avisos de atualização do sistema e avisos sociais  |
| Agenda e planner    | `/planejador`                      | Calendário, tarefas, compromissos, histórico       |
| Foco                | `/foco`                            | Cronômetro e Pomodoro                              |
| Cadernos            | `/cadernos`                        | Estante, cadernos, folhas, escrita à mão           |
| Planos de aula      | `/aulas`                           | Planejador de aulas de inglês                      |
| Praticar            | `/aprender`                        | Ilhas de prática, quizzes, flashcards, recompensas |
| Modo Sala           | `/sala` e `/sala/:codigo/projetor` | Salas ao vivo para professores e alunos            |
| Biblioteca          | `/biblioteca`                      | Acervo pessoal de links, textos e flashcards       |
| Banco de atividades | `/atividades`                      | Atividades reutilizáveis                           |
| Perfil              | `/perfil`                          | Identidade, conta, cartas, conquistas, amigos      |

O endereço antigo `/habitos` abre o Perfil: o módulo de Hábitos foi removido da interface, e o campo `habits` do workspace permanece apenas como leitura legada, sem apagar registros.

### 2.2 Estado de cada módulo

O estado executável fica tipado em `src/product/module-catalog.ts`. Só módulos `available` podem oferecer atalhos executáveis.

| Estado                | Módulos                                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `available` (existe)  | Espaço do aluno, Agenda e planner, Foco, Cadernos, Biblioteca, Revisão e quizzes, Planos de aula, Banco de atividades, Digitalização, Escrita à mão, Bingo de estudos, Modo Sala |
| `foundation` (base)   | Olena inteligente: fronteira de contrato e testes prontos, sem provedor conectado para o fluxo de materiais do aluno (ver seção 9)                                               |
| `planned` (planejado) | Vestibulares e simulados, Banco de questões, Reconhecimento de texto em digitalizações, Documentos, Mapas de conteúdo, Cultura e repertório                                      |

O mapa mental do produto está em `PRODUCT_MIND_MAP.md` e as fases de entrega em `IMPLEMENTATION_ROADMAP.md`. Planejado nunca é apresentado ao usuário como se existisse.

Observação sobre divergência: o `README.md` cita o reconhecimento local opcional de texto (biblioteca `tesseract.js`, com os dados copiados por `scripts/copy-ocr-assets.mjs`), enquanto o catálogo marca "Reconhecimento de texto em digitalizações" como `planned`. Não verificado qual descrição reflete a interface atual. Para conferir, abrir a digitalização de um caderno e procurar a ação de reconhecer texto.

## 3. Os módulos em detalhe

### 3.1 Espaço do aluno

Início da experiência. Deriva seus resumos do `WorkspaceState` compartilhado (nada de bancos paralelos): tarefas e compromissos do dia, minutos de foco, atalho do Pomodoro com o tomate animado e entrada para os demais módulos. Novos módulos devem se integrar a esse workspace compartilhado.

### 3.2 Agenda e planner

Detalhes completos em `AGENDA.md`.

- Quatro visões: Dia, Semana, Mês e Lista. Pesquisa ignora acentos e caixa e lista todas as datas salvas.
- Adicionar reúne tarefa, compromisso, sessão de estudo, matéria e meta de foco. Editar permite reagendar e excluir com confirmação.
- Rotinas são um único evento com ocorrências calculadas: diária, semanal com dias escolhidos, mensal e anual, com intervalo e fim opcional. Datas inexistentes (31 de fevereiro) são puladas. Editar ou excluir permite escolher só a ocorrência, esta e as seguintes, ou a série.
- Seleção de intervalo por arraste (mouse ou toque), por botão ou com Shift. A seleção é temporária e não altera eventos.
- Feriados brasileiros, exportação ICS e histórico de estudo por dia (Foco, cadernos criados, ilhas praticadas).
- Lembretes: com a agenda aberta, horários a até 15 minutos são destacados e recalculados a cada 30 segundos. Não há push nem notificação com o app fechado.
- A integração com o Google Agenda foi removida em 18/10/2026.
- Sincronização: agenda, minutos de Cronômetro e Pomodoro, sequências e a sessão de foco em andamento pertencem à conta autenticada. Uma atualização da página nunca substitui histórico concluído por uma cópia antiga ou vazia. Isso exige a publicação das regras `stateV2` (seção 8.2).

### 3.3 Foco

Cronômetro e Pomodoro. Abrir o Foco não registra minutos: só o contador iniciado pela pessoa conta. Encerrar e registrar soma minutos completos efetivamente contados, e sessões de menos de um minuto não podem ser registradas. Registros concluídos são aditivos por ID e nunca são removidos por cópias antigas. Uma sessão ativa recuperada em outro aparelho aparece pausada até ação explícita, e nunca inicia sozinha. O Foco publica snapshots a cada 30 segundos, mantendo recuperação local mais frequente. Flores e tomates (`focus-flower`, `pomodoro-tomato`) representam o ritmo de estudo.

### 3.4 Cadernos

Estante de capas, cadernos com folhas, pastas e Notes de texto. Guarda em pastas por arraste (com alternativa por teclado). Decisões vigentes (30/10/2026):

- **Caderno 2D é o padrão.** O caderno em 3D (three.js, carregado sob demanda) é opcional e experimental, ligado em Perfil, Aparência e acessibilidade (`notebook3dOptIn`, padrão desligado). Ele tem orçamento próprio e só baixa quando a opção está ligada.
- **Interface do 2D:** ferramentas só com ícone numa barra embaixo, junto do "+" de nova folha. Seta amarela de voltar no canto esquerdo. Setas roxas de Foco para virar as folhas (sem texto, com nome acessível).
- **Divisórias e marcadores acompanham a folha.** O lado de uma aba vem da pilha em que a folha dela está (folhas até a dupla aberta formam a pilha da esquerda, as demais a da direita). Ao virar a folha, as abas que trocam de lado viajam na própria folha e assentam ao pousar. Código em `notebook-tab-stack.ts`, `notebook-tab-art.tsx` e `notebook-turn-leaf.tsx`.
- **Folheio realista:** a folha dobra em 8 fatias, com brilho e sombra calculados do ângulo (propriedades CSS registradas `--turn-angle` e `--cover-angle`). A capa também levanta, escurece e projeta sombra ao abrir e fechar.
- **Contracapa no 2D:** na última dupla a seta de avançar vira "Contracapa" (também pela seta direita do teclado) e abre a jornada espelhada da capa. Só no caderno editável completo. Com movimento reduzido abre sem animação.
- **Escrita à mão:** estúdio com caneta, borracha, régua, curva, formas, texto por teclado na página inteira, camadas, zoom por pinça, modo Só caneta e desfazer. Rascunhos, histórico e cópias de conflito servem de recuperação.
- **Digitalização:** imagens reduzidas no navegador, limitadas a 1 MB por imagem e vinculadas à anotação. Arquivos enviados são sempre tratados como não confiáveis.
- **Compartilhamento:** link de leitura (exige conta não anônima, com cotas por conta e globais) e colaboração por código em sala temporária de até quatro pessoas (convite exige login Google). Detalhes e limites em `NOTEBOOK_SHARING_SECURITY.md`.
- Capa do caderno: `NOTEBOOK_COVER.md` e `NOTEBOOK_COVER_ASSETS.md`.

### 3.5 Biblioteca

Acervo pessoal ligado aos cadernos e ao Foco, não um feed público nem loja. Tela principal com retomada, revisão, coleções e acervo pesquisável. Guarda links, textos, flashcards e PDFs (o leitor de PDF usa `pdfjs-dist`, sob demanda). Flashcards ocultam a resposta até a pessoa revelar. Detalhes em `LIBRARY_DESIGN.md`.

### 3.6 Praticar

Ilhas temáticas de papel, com seis ilhas de IDs estáveis: `languages`, `portuguese`, `chemistry`, `biology`, `mathematics` e `programming`.

- **Idiomas** tem trilha jogável. As outras cinco têm trilhas visuais exploráveis ainda sem exercícios (estado `preview`). Metodologias estão vazias nesta etapa, e isso é uma resposta válida da API, não um erro.
- **Matemática** tem um minigame adaptativo: acertos e rapidez promovem assuntos, e dois erros seguidos recuam um assunto, sem perder pontos nem recorde. Os desafios são calculados e avaliados de forma determinística, sem fornecedor de IA.
- **Quiz de escuta e bingo** usam voz natural (seção 9) com a voz do dispositivo como reserva automática. O bingo de números, que também existe no Modo Sala, tem globo, cartela e pódio.
- Revisão de flashcards e quizzes, com metas acompanhadas.
- Recompensas: ver Poeira Cósmica (seção 5).

### 3.7 Modo Sala

O professor cria uma sala com código de cinco letras e os alunos entram pelo celular. Atividades: Escuta Coletiva e bingo de números. O anfitrião pode remover participantes (`kick`) e fechar a entrada (`lock`). Remover não é banimento: sem conta não há como impedir quem apaga os dados do navegador de voltar, e por isso existe o fechamento da entrada. Convidado pode escolher um apelido (`helena.guest-nickname.v1`), válido só ali.

Na Escuta Coletiva o professor grava cada fala no microfone ou envia um arquivo de até 256 KB, ou usa o catálogo de 100 palavras com áudio estático. As gravações expiram com a sala em até quatro horas, não treinam modelos e não ficam salvas na conta. Há projetor em `/sala/:codigo/projetor`. Arquitetura na seção 7.2 e passo a passo em `ROOM_SETUP.md`.

### 3.8 Planos de aula

Planejador de aulas de inglês, mantido como ferramenta do produto. Gerador determinístico independente da interface, com `src/domain/lesson.ts`. Uma futura IA poderá implementar outra estratégia sem substituir esse fluxo. Estrutura em `LESSON_STRUCTURE_AND_ACTIVITY_BANK_PLAN.md`.

### 3.9 Perfil, amigos e configurações

- Identidade compacta com avatar oficial, `@` exclusivo (`PROFILE_HANDLES.md`), capas de perfil e jornada de apresentação.
- **Amigos:** conexões reais do tipo seguir (seguir de volta cria a relação inversa). Busca por `@` ou nome, visita à ficha, aviso de novo seguidor. Sem mensagens privadas, sem importar agenda, sem recomendações inventadas. Compartilhar perfil gera `/perfil?usuario=<username>`, QR sem serviço externo, cópia de link, compartilhamento nativo e PNG de 720 por 960 px. Detalhes em `PROFILE_SOCIAL.md` e `SOCIAL_REALTIME_SECURITY.md`.
- **Configurações:** idioma (pt-BR e en-US), tema claro e escuro, preferências de acessibilidade (inclui reduzir movimento), segurança e acesso (métodos de login, senha, recuperação), exportação dos dados carregados e das chaves sincronizáveis (sem tokens), exclusão de conta, estado da sincronização com horário da última confirmação, sair da conta.
- **Notificações:** sino no cabeçalho com avisos de atualização do sistema (gerados no build a partir de PRs mescladas, sem token nem dado do aluno, `SYSTEM_UPDATES.md`) e avisos sociais em tempo real.

### 3.10 Onboarding

Conversa com a Olena (`src/views/onboarding-view.tsx`): balões de papel, respostas rápidas e transição até o login. O roteiro é local e fixo. Coleta modalidades, organização, ritmo e interesse em programação, que são preferências editáveis e não um diagnóstico (`STUDY_PREFERENCES_ROADMAP.md`). A preparação das respostas é calculada pela API sem chamar modelo (`OLENA_API.md`).

## 4. Arcano: cartas, Poeira Cósmica e conquistas

### 4.1 O baralho

O Arcano é o baralho do app: **78 cartas**, 22 arcanos maiores e 56 menores em quatro naipes de 14 cartas. Os naipes têm elementos: Paus (Fogo), Copas (Água), Espadas (Ar) e Ouros (Terra). Convenção editorial: Força é VIII, Justiça é XI, O Louco é 0. As figuras usam P (Pajem), C (Cavaleiro), Q (Rainha) e K (Rei), sempre com o nome completo acessível. Cada um dos 15 personagens oficiais do Olena aparece em pelo menos um arcano maior. As associações são escolhas simbólicas da proposta visual, não biografias nem atributos reais.

- Catálogo servido sob demanda em `public/arcana/catalog.json` (validado antes do uso). `ARCANA_IDS` guarda só as identidades, sem incluir arte nem texto no JavaScript principal.
- Design vigente (aprovado em 28/10/2026), em `ARCANA_CARD_DESIGN.md`: fundo preto, personagem central, só preto `#17151c`, amarelo `#facc15` e roxos `#6d28d9` e `#8b5cf6` nas faces. Moldura, número e título são código (`ArcanaCardPrototype`, `PaperDigits`, `PaperCardTitle`), nunca desenhados no raster. Todas as cartas compartilham o mesmo verso simétrico (luas roxas, estrela amarela e losango).
- Raridades por identidade: comum (arcanos menores), épica (arcanos maiores) e lendária (somente A Estrela). Cada raridade tem nome, cor e brilho próprios, e a cor nunca é a única informação.
- Significados: resumo curto em português do catálogo Olena mais o texto clássico de A. E. Waite, _The Pictorial Key to the Tarot_ (1910), traduzido na íntegra para o português do Brasil (`public/arcana/tarot-ptbr.json`), com a fonte visível na carta. O app não consulta serviço externo para isso. A estrutura histórica do baralho citada nos documentos vem de acervos de museus (Metropolitan Museum of Art e V&A). Os significados são conteúdo cultural e de estudo: não há poderes, ataques, custos ou estatísticas de jogo nas cartas.
- Inspeção em 3D da carta, com setas e Home no teclado, e ação de compartilhar (PNG de 1080 por 1350 px, só com nome do perfil, raridade e data, sem identificadores de servidor).

Detalhes: `ARCANA_CATALOG.md`, `ARCANA_INTEGRATION.md` e `ARCANA_CARD_DESIGN.md`.

### 4.2 Poeira Cósmica (como ganhar)

Não existem mais baús: o recipiente visual único é a **Poeira Cósmica**. Regras vigentes (`math-place-rewards.ts`, `CHEST_REWARDS.md`, `MATH_REWARDS_SYNC.md`):

- Uma partida de Matemática com **100 pontos ou mais** pode render uma Poeira, se houver espaço (até **3 pendentes** ao mesmo tempo).
- O prazo é de **10 segundos** a partir do ganho, sem precisar destrancar.
- O sorteio acontece uma vez por recibo: **5%** de A Estrela (lendária) e, nos outros 95%, **80%** de uma carta e **20%** de duas. Repetidas contam como cópias. Os toques são apresentação, não mudam as chances, e o resultado é salvo antes da animação (sem novo sorteio por recarga ou fechamento).
- Quatro toques revelam a raridade (a estrela passa de verde a azul, roxo e dourado) e depois a carta, que pode ser inspecionada em 360 graus e guardada na coleção.
- O ledger histórico (`helena.mathPlaceRewards.v1`) continua válido e sincroniza com a conta. Os campos `kind` e `arcana` são legados de conteúdo, não dois recipientes na interface. Esta é uma coleção pessoal, não uma economia competitiva: sorteio e pontuação do cliente não são protegidos contra adulteração.

### 4.3 Destaques do perfil

A pessoa escolhe até **3 cartas** favoritas (únicas e obtidas) para o topo do perfil, por arraste da estrela, teclado ou toque, e pode remover ou substituir. Quem visita o perfil vê somente esses destaques, com datas comprovadas, e nunca o inventário. Bloqueio entre contas oculta esses metadados. Contrato em `PROFILE_REWARDS_CONTRACT.md`.

### 4.4 Conquistas

Há **113 conquistas**: 57 de Matemática (artes aprovadas, com o personagem Oliver) e 56 gerais, em famílias com quatro níveis (bronze, prata, ouro e esmeralda) e oito conquistas especiais. As gerais derivam de registros reais do workspace e contagens da própria conta (ofensiva, Pomodoro, cadernos, páginas, tarefas, quizzes, seguir pessoas e outras), e metas obtidas ficam no histórico sincronizado mesmo depois de excluir uma página. O perfil destaca até três conquistas escolhidas. O aviso de desbloqueio é central e não modal, com som próprio por raridade, respeitando mute, gesto inicial e redução de movimento. Contrato em `ACHIEVEMENT_DESIGN.md`.

## 5. Arquitetura

### 5.1 Visão geral

```text
Views React
  -> ações tipadas (dispatch)
  -> workspaceReducer
  -> WorkspaceState versionado
  -> cache no dispositivo (localStorage, IndexedDB)
  -> conta Firebase sincronizada (Realtime Database)

Aplicativo (SPA estática)  <->  funções em api/ (Vercel, Node ESM)
                                     |
                                     v
                       handlers web em src/backend (Request/Response)
                                     |
                                     v
                  Firebase Realtime Database  |  Cloudflare Workers AI
```

### 5.2 Tecnologias

- React 19, TypeScript estrito (sem `any`, `@ts-ignore` ou `@ts-expect-error`; opções estritas do compilador não são desativadas), Vite 8.
- CSS próprio, mobile-first. Fontes Manrope e Nunito servidas pelo próprio domínio (`public/fonts`, licença OFL), sem chamadas ao Google Fonts.
- Dependências de produção: `firebase`, `jose`, `jsqr`, `lucide-react`, `pdfjs-dist`, `qrcode-generator`, `react`, `react-dom`, `tesseract.js` e `three`. Dependência nova exige justificativa, auditoria e medição do impacto no pacote.
- Testes: Vitest e Testing Library (unidade e componente) e Playwright (ponta a ponta).
- Hospedagem: Vercel (SPA estática mais funções em `api/`), cron diário de limpeza.

### 5.3 Estrutura de pastas

| Pasta                      | Conteúdo                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/domain`               | Regras, modelos do workspace, agenda, foco, matemática, conquistas, rotas, gerador de plano de aula     |
| `src/data`                 | Persistência e validação da fronteira local, catálogo do Arcano, recompensas, sons                      |
| `src/hooks`                | Ligação entre React e o domínio (workspace, nuvem, perfil, sala, tema, mobile)                          |
| `src/components`           | Componentes visuais (cerca de 400 arquivos): cadernos, perfil, cartas, navegação, ícones de papel       |
| `src/views`                | Uma view por aba: Espaço, Agenda, Foco, Cadernos, Praticar, Sala, Biblioteca, Perfil, Aulas, onboarding |
| `src/product`              | Catálogo tipado de módulos                                                                              |
| `src/backend`              | Handlers HTTP portáveis usados por `api/` (sala, voz, cadernos, Olena, perfil, atendimento, Discord)    |
| `src/ai`                   | Contrato compartilhado e limites da integração de IA                                                    |
| `src/i18n`                 | Catálogos e runtime de idioma                                                                           |
| `api`                      | Funções da Vercel, finas, que só montam as dependências dos handlers                                    |
| `public`                   | Artes, fontes, catálogos de idioma, cartas, conquistas, áudio, termos de uso                            |
| `e2e`                      | Contratos visíveis ao usuário (Playwright, cerca de 110 arquivos)                                       |
| `scripts`                  | Orçamento de desempenho, escopo do CI, idiomas, avisos de sistema, treinamento da Olena                 |
| `services/tts`             | Serviço de voz próprio (Kokoro e Piper), mantido fora de uso em produção                                |
| `firebase-room.rules.json` | Regras do Realtime Database, publicadas no console do Firebase                                          |

### 5.4 O workspace

`WorkspaceState` é a fonte única para matérias, tarefas, compromissos, anotações, sessões de foco, materiais, flashcards, metas e resultados de quizzes. Os módulos não mantêm bancos paralelos. O armazenamento é versionado e rejeita conteúdo inválido (a versão atual migra as anteriores sem apagar tarefas, notas ou materiais). Imagens de digitalização e desenhos são reduzidos no navegador, limitados a 1 MB por imagem e ligados à anotação.

### 5.5 Carregamento sob demanda

Biblioteca, Praticar, planejador de aulas, ferramentas de captura do Caderno, leitor de PDF, cena do caderno 3D e a Poeira Cósmica carregam em chunks separados. O manifesto do Vite permite medir separadamente o JavaScript inicial, o total da aplicação e os blocos opcionais (seção 12).

## 6. Dados e sincronização

- **Primeira conta sem dados** recebe o conteúdo local do dispositivo. **Conta que já tem dados** usa a nuvem como fonte inicial naquele dispositivo. Mudanças durante a busca inicial são mescladas.
- Mudanças são enviadas após uma pausa curta e recebidas por stream autenticado. O envio mantém alterações locais como pendentes até a confirmação do Realtime Database. Falha de rede não avança a revisão confirmada: o próximo ciclo ou a ação manual no Perfil tenta de novo. O Perfil mostra carregando, sincronizando, sincronizado ou aguardando conexão.
- O que sincroniza: workspace, tema, respostas do onboarding, avatar oficial, perfil (inclui cartas favoritas), progresso das trilhas, cache auxiliar de dificuldade, recompensas da Matemática (`helena.mathPlaceRewards.v1`) e a sessão de foco.
- **Merge:** o estado principal da conta prevalece sobre backup antigo para itens mutáveis. Registros concluídos de Foco são aditivos por ID, dias de Pomodoro são unidos, o ledger de recompensas une recibos e preserva a menor data conhecida de obtenção. Cópias antigas ou vazias nunca removem registros concluídos.
- **Isolamento:** cada pessoa lê e grava apenas `users/<uid>`. O logout explícito encerra a sessão e remove do dispositivo as chaves sincronizadas da conta anterior (um cache mínimo por UID, como o aceite de associação, é preservado). Um relógio de sessão ativa de outro aparelho nunca inicia sozinho.
- **Convidado:** marca `helena.guest.v1`, estudos só neste aparelho, sem sincronização. O Perfil oferece entrar depois.
- Transporte e regras: `ACCOUNT_SYNC_SETUP.md`. O formato `stateV2` codifica chaves locais com pontos só no transporte e tem guardas que impedem abas antigas de apagar progresso novo.

## 7. Servidor

### 7.1 Funções em `api/`

| Função                   | Papel                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `api/local-room.ts`      | Autoridade do Modo Sala: criar, entrar, retomar, iniciar, responder, remover, fechar entrada, bingo                                             |
| `api/room-recording.ts`  | Falas gravadas pelo professor para a Escuta Coletiva                                                                                            |
| `api/speech.ts`          | Voz natural do quiz (Cloudflare Workers AI), com cache e limites                                                                                |
| `api/notebook-collab.ts` | Colaboração e links de leitura de cadernos                                                                                                      |
| `api/olena.ts`           | Olena API v1 (catálogo de Praticar, desafio de Matemática, preparação do onboarding, sem IA) e o fluxo de login Discord (`action=account-auth`) |
| `api/helena.ts`          | Chat da Olena (tutora), atrás de autenticação, consentimento e quotas                                                                           |
| `api/olena-learning.ts`  | Geração agendada de exemplos públicos para o candidato de treinamento                                                                           |
| `api/profile-handle.ts`  | Reserva e consulta do `@` exclusivo                                                                                                             |
| `api/profile-social.ts`  | Seguir, perfil público, destaques e eventos sociais                                                                                             |
| `api/account-devices.ts` | Registro e lista dos dispositivos da conta, com limite e prazo de retenção                                                                      |
| `api/room-cleanup.ts`    | Limpeza diária (cron `0 4 * * *`) de salas e dados vencidos, protegida por `CRON_SECRET`                                                        |

Cada função é um handler web (`Request` e `Response`) em `src/backend`, independente do runtime da Vercel e testável sem rede. O `npm run api:check` confere que os arquivos de `api/` carregam como ESM de Node.

### 7.2 Modo Sala

O servidor é a única autoridade. O estado completo (token do anfitrião e respostas certas) fica em `/private-rooms/<código>` e ninguém o lê pelo navegador. A projeção pública, sem segredos, vai para `/rooms/<identificador secreto>` e cada navegador a recebe por Server-Sent Events (`EventSource`) em `src/hooks/use-local-room.ts`, sem o SDK do Firebase. O armazenamento passa pela abstração `KvStore` com concorrência otimista por versão (ETag): conflitos são repetidos, nunca sobrescritos. Cada requisição passa pelo `room-guard` (validação, limite por origem e App Check quando ativado). A sala tem prazo absoluto de 4 horas e, depois de encerrada, deixa de ser pública em 30 minutos. Credenciais temporárias ficam em `sessionStorage`, permitindo retomar a atividade após recarregar a aba sem duplicar participantes.

## 8. Acesso, segurança e privacidade

### 8.1 Login

Firebase Authentication é a identidade da conta e o único serviço que recebe senhas. Métodos: Google, Discord e e-mail e senha (senha de pelo menos 12 caracteres, sem aparar nem registrar). Apple foi retirado da entrada e associação, restando só a compatibilidade com vínculos antigos na reautenticação e exclusão. Discord usa authorization code no servidor e pede somente `identify`: não pede e-mail, lista de servidores nem mensagens. Não há associação automática por e-mail, nome ou IP, e uma identidade Discord não pode migrar para outro UID.

Associar um método dá acesso permanente à conta, então exige login recente (menos de 240 segundos), a mesma exigência da desvinculação, com a confirmação "Confirme que é você". A recuperação de senha dá a mesma mensagem para e-mail desconhecido e cadastrado e tem espera de 60 segundos por conta no aparelho. O app nunca afirma que um e-mail foi entregue, porque o SDK não permite verificar isso. Detalhes em `AUTHENTICATION.md` e `GOOGLE_LOGIN.md`.

### 8.2 Regras do Firebase

As regras do Realtime Database estão em `firebase-room.rules.json` e **são publicadas à mão pela dona do projeto no console**. Principais garantias: cada conta só acessa o próprio `users/<uid>`, apenas as chaves sincronizáveis são aceitas, com limite de tamanho por item, contas anônimas não escrevem, e a validação `stateV2` impede que clientes antigos apaguem chaves novas. Qualquer mudança de regra precisa ser publicada antes do cliente que depende dela, e sem substituir as regras de produção sem comparar as diferenças.

### 8.3 Proteções de borda e abuso

- Cabeçalhos no `vercel.json`: Content-Security-Policy restritiva, HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy` (câmera só do próprio site, sem microfone nem geolocalização). A CSP ainda lista `tarotapi.dev` em `connect-src`, embora o app não consulte mais esse serviço (remover é decisão separada).
- Limites por quem chama e tetos globais: voz (30 por minuto e 600 por dia por endereço, 6.000 por dia no total), links de leitura de caderno (5 por hora e 10 por dia por conta, 300 por dia global), consultas de métodos (30 por UID por hora), IPv6 agrupado por /64, corpo de requisição limitado a 4,5 MB. Detalhes na tabela de auditoria de `OPERACAO_E_CUSTOS.md`.
- App Check: o guard avisa uma vez por instância quando `FIREBASE_APPCHECK_ENFORCE` não é `true`. Conferir esse valor na Vercel é decisão da dona.
- Segredos: nunca no repositório. Nenhuma chave de servidor usa o prefixo `VITE_` nem vai ao navegador. Há varredura de segredos no CI.
- Arquivos enviados pelo usuário são sempre tratados como não confiáveis.

### 8.4 Privacidade

Política de Privacidade e Termos de Uso são páginas públicas (`public/termos-de-uso.html`, com a versão em `src/domain/terms-of-use.ts` conferida por teste). O app não envia conteúdo a serviços externos sem consentimento claro e fluxo documentado. A voz natural do quiz individual depende do aceite `helena.listening.online.v1`, e sem ele o app usa a voz do dispositivo. Conversas e gravações não entram em treinamento. O estado dos Termos e o que falta (contato, foro, revisão jurídica, aceite no app) está em `TERMOS_DE_USO.md`. O atendimento privado e a futura ponte com o Discord têm modelo de ameaça em `SUPPORT_SECURITY.md` e `SUPPORT_DISCORD_PLAN.md` (preparação, sem integração ativa de produção; não verificado o estado atual do bot, pois depende de configuração externa).

## 9. Voz e Olena (IA)

Estado honesto das coisas que parecem IA:

- **Voz natural do quiz e do bingo:** Cloudflare Workers AI (modelo MeloTTS) por função segura de servidor, com cache por texto e velocidade e reserva imediata para a voz do dispositivo. O token fica só no ambiente do servidor.
- **Escuta Coletiva:** usa somente a gravação enviada pelo professor, sem MeloTTS nem voz do aparelho.
- **Matemática da Olena:** calculadora exata no servidor (`src/backend/math/calculator.ts`, parser limitado, sem `eval`, frações com BigInt) e 17 tópicos de referência originais. Teoria e conversa usam o professor Cloudflare, atrás de autenticação, consentimento e quotas (`HELENA_MATH_KNOWLEDGE.md`, `OLENA_LEARNING.md`). Sem credenciais, a API falha de forma honesta, sem inventar resposta.
- **Aprendizado candidato:** um workflow agendado gera exemplos públicos (40 exercícios de adição e multiplicação, no máximo duas chamadas por dia, em Workers Free) e treina adaptadores candidatos em CPU. Salvar exemplos não altera pesos, e o chat continua com o professor Cloudflare. Não é aprendizado ilimitado.
- **Olena inteligente com materiais do aluno:** apenas fronteira de contrato e testes (`AI_BACKEND.md`). O contrato rejeita campos desconhecidos e não aceita o workspace completo. Provedor, rate limit e identificação ainda precisam ser escolhidos antes da ativação.
- **Olena API v1** (`OLENA_API.md`): somente leitura e cálculo determinístico. `GET /api/olena?version=1&action=catalog|islands|methodologies`, mais `POST` do minigame de Matemática e da preparação do onboarding. Não há voz nem geração de texto nessa API.

Nenhum recurso local ou simulado é apresentado como IA.

## 10. Idiomas

Português brasileiro e inglês americano, com catálogos locais em `public/locales/pt-BR.json` e `en-US.json`, sem serviço de tradução. A troca de idioma não recarrega o app. Os catálogos são arrays com **índices estáveis**: acrescente entradas só no final dos dois arquivos, nunca reordene, preserve `{0}`, `{1}` etc., rode `node scripts/check-ui-language.mjs --version` e atualize `src/i18n/catalog-version.ts`. O guard `npm run i18n:check` faz parte da verificação e confere tamanho, parâmetros, manifesto e uso nos componentes. Títulos e textos escritos pela pessoa nunca são traduzidos. Um teste impede "?" no lugar de letras acentuadas nos textos em português. Detalhes em `I18N.md`.

## 11. Design system

Identidade oficial em `DESIGN_SYSTEM.md`. Regras que valem para toda interface nova ou alterada:

- **Papel recortado:** formas angulares e facetas amplas. Olena, ícones e novos elementos usam o padrão aprovado. Loadings usam `HelenaLoading`.
- **Foco e seleção:** proibidas molduras por `outline` e contornos automáticos roxos ou pretos. Usa-se a regra compartilhada de foco em papel: sublinhado e destaque amarelo, sem ocultar a indicação de navegação por teclado.
- **Um único X:** todo botão de fechar ou remover usa `PaperCloseIcon` (ou `PaperCloseGlyph` ao lado de texto), sem placa, fundo ou sombra de botão, com área de toque preservada.
- **Interação:** componentes interativos funcionam com teclado, toque e larguras móveis. Nenhuma ação essencial depende só de hover.
- **Temas e movimento:** validar claro e escuro, PC e celular, conferindo contraste, foco, erro, carregamento e rolagem. Movimento reduzido remove animações automáticas, sem perder informação.
- **Texto:** é proibido usar travessões em textos da interface, documentação, comentários ou qualquer conteúdo do repositório.

## 12. Desempenho

O orçamento é medido por `npm run performance:check` (`scripts/check-performance-budget.mjs`), a partir do manifesto do Vite:

| Medida                          | Limite               | Observação                       |
| ------------------------------- | -------------------- | -------------------------------- |
| JavaScript inicial              | 286,5 KiB (teto 400) | Entrada do aplicativo            |
| JavaScript total da aplicação   | 1630 KiB (teto 1630) | Sem os blocos opcionais abaixo   |
| Leitor de PDF e worker          | 1800 KiB             | Só baixa ao abrir um PDF         |
| Cena do caderno 3D              | 600 KiB              | Só baixa com o caderno 3D ligado |
| Voz TTS própria (worker e WASM) | 2,25 MiB e 22 MiB    | Serviço fora de uso em produção  |

Subir um orçamento exige justificativa registrada no próprio script, e o teto absoluto não sobe sem decisão da dona do projeto. Os tetos de JavaScript total foram subindo ao longo do tempo por decisão da dona (1500, 1600, 1602, 1608 e 1630 KiB), sempre com o crescimento carregado sob demanda e sem tocar na entrada inicial.

## 13. Qualidade, testes e CI

### 13.1 Comandos

| Comando                         | O que faz                                                               |
| ------------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                   | Servidor de desenvolvimento do Vite (não executa as funções de `api/`)  |
| `npm run build`                 | Typecheck e build de produção                                           |
| `npm test`                      | Testes unitários e de componente (Vitest)                               |
| `npm run test:e2e`              | Testes de ponta a ponta (Playwright, projetos desktop e mobile)         |
| `npm run lint` e `format:check` | ESLint e Prettier                                                       |
| `npm run api:check`             | Confere que as funções de `api/` carregam como ESM de Node              |
| `npm run i18n:check`            | Confere os catálogos de idioma                                          |
| `npm run performance:check`     | Confere os orçamentos de JavaScript                                     |
| `npm run verify`                | lint, formatação, API, idiomas, testes, build e orçamento, em sequência |

`npm run verify` deve passar antes de publicar uma branch, e mudanças de fluxo principal também passam por `npm run test:e2e`. Em 30/10/2026 o conjunto tinha cerca de 375 arquivos de teste unitário e 2.412 testes, mais cerca de 110 arquivos e2e. Requer Node.js 24 ou superior. Observação: `src/data/listening-audio.test.ts` falha localmente em ambientes com Node 22.

### 13.2 CI

Workflows em `.github/workflows`: `application.yml` (qualidade, auditoria de dependências e SBOM, varredura de segredos, análise estática, e2e), `codeql.yml` e `olena-learning.yml` (candidato de treinamento diário). O escopo do e2e é decidido por `scripts/ci-scope.mjs`:

| Situação                                    | e2e                        |
| ------------------------------------------- | -------------------------- |
| PR que mexe em interface ou em outras áreas | desktop e mobile completos |
| PR só de backend mais documentação          | só desktop                 |
| PR só de documentação                       | nenhum                     |
| Push na `main`                              | só desktop                 |
| Execução semanal e manual                   | completo                   |

Playwright usa só Chromium, com viewport e emulação móvel, sem cobertura do motor Safari. Os nomes dos checks obrigatórios não mudam, e **um e2e pulado nunca pode fazer um check obrigatório passar por engano**: na dúvida, o escopo é completo. Medições e alternativas descartadas em `CI_MINUTOS.md`.

### 13.3 Regras de teste

Toda correção deve ter um teste que falhe sem ela quando isso for tecnicamente viável. Nenhum teste é pulado, desativado ou enfraquecido para o CI passar.

## 14. Operação e custos

Documento de referência: `OPERACAO_E_CUSTOS.md` (escrito para quem assumir o projeto, pessoa ou IA, separando o verificado do não verificado). Pontos principais:

- O Realtime Database do Firebase está no plano gratuito, e o consumo e a troca de banco estão analisados no documento. Preços e limites de terceiros mudam, e os marcados como "não verificado" devem ser reconferidos antes de decidir.
- **Ações fora do repositório pertencem à dona do projeto** e devem ser descritas e conferidas, sem fazer sozinho: publicar regras do Firebase, variáveis da Vercel, tornar o repositório privado, planos pagos. Hoje continuam com a dona: publicar as regras e conferir `FIREBASE_APPCHECK_ENFORCE`, tornar o repositório privado, pagar ou não os planos Blaze e Vercel para uso comercial, contato e política do `SECURITY.md`, tamanho do código de sala e rodar o mobile completo só à noite.
- Todo recurso que gasta dinheiro precisa de limite por quem chama e de teto global.
- Não ler nem versionar `docs/CONTRATO_SOCIETARIO.md`. O `.gitleaksignore` depende de um commit específico do histórico, por isso os merges usam commit de mesclagem (sem squash).

## 15. Como rodar e configurar

```bash
npm ci
npm run dev
```

Sem nenhuma variável de ambiente o app abre e funciona: o workspace fica no dispositivo e o modo convidado está disponível. Login com Google, sincronização, Modo Sala e voz natural dependem de configuração no ambiente seguro da Vercel. Para testar sala ou voz localmente, use `vercel dev` com as variáveis ou o preview da Vercel de uma PR.

| Variável                                                                 | Onde              | Para quê                                                  |
| ------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`, `_AUTH_DOMAIN`, `_PROJECT_ID`, `_APP_ID`        | Navegador         | Identificam o projeto Firebase (públicas por definição)   |
| `VITE_FIREBASE_DATABASE_URL`                                             | Navegador         | URL do Realtime Database, quando não é a padrão           |
| `VITE_FIREBASE_APPCHECK_SITE_KEY`                                        | Navegador         | App Check                                                 |
| `FIREBASE_DATABASE_URL`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Servidor          | Conta de serviço usada pelas funções                      |
| `FIREBASE_APP_ID`, `FIREBASE_APPCHECK_ENFORCE`                           | Servidor          | App Check no servidor (`true` exige o token)              |
| `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`                          | Servidor          | Voz natural e professor da Olena                          |
| `OLENA_TEACHER_MODEL`, `HELENA_ALLOWED_ORIGINS`                          | Servidor          | Modelo do professor e origens permitidas do chat          |
| `OLENA_LEARNING_SERVICE_TOKEN`, `OLENA_LEARNING_FREE_CONFIRMED`          | Servidor e GitHub | Aprendizado candidato diário                              |
| `CRON_SECRET`                                                            | Servidor          | Protege a limpeza diária                                  |
| `DISCORD_*` e `AUTH_PUBLIC_ORIGIN`                                       | Servidor          | Login Discord e comandos; origem pública para os retornos |

Nunca use o prefixo `VITE_` em segredo de servidor. Passo a passo: `ACCOUNT_SYNC_SETUP.md` (login e sincronização), `ROOM_SETUP.md` (Modo Sala, conta de serviço, App Check, limpeza) e `OPERACAO_E_CUSTOS.md`. Não verificado: o conjunto exato de variáveis exigidas em cada ambiente da Vercel (o levantamento acima vem de uma busca no código). Para conferir, rode `grep -r "process.env" api src/backend` e compare com o painel da Vercel.

## 16. Fluxo de trabalho do repositório

Regras do `AGENTS.md`:

- Nunca desenvolver direto na `main`. Branch curta e descritiva por mudança, entrega por pull request, sem merge automático.
- Não mesclar sem autorização explícita da dona. Merge com **commit de mesclagem** (não squash), com CI verde e revisão concluída.
- Não misturar atualização de dependência com mudança de produto sem necessidade comprovada.
- Antes de publicar, rodar `npm run verify`.
- Registrar decisões e mudanças de estado em `docs/CURRENT_STATE_AUDIT.md` (histórico cronológico, não substitui o estado atual) e atualizar `docs/SECOND_BRAIN.md` quando fluxo, arquitetura ou comandos mudarem.
- Meça antes de propor economia, registre o que foi descartado e por quê, e marque como "não verificado" o que não foi conferido.

## 17. Índice dos documentos

| Tema                  | Documentos                                                                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visão e roadmap       | `PRODUCT_MIND_MAP`, `IMPLEMENTATION_ROADMAP`, `STUDY_PREFERENCES_ROADMAP`, `SECOND_BRAIN`, `CURRENT_STATE_AUDIT`                                            |
| Arquitetura           | `ARCHITECTURE`, `AI_BACKEND`, `OLENA_API`, `OLENA_LEARNING`, `OLENA_TRAINING_RESULTS`, `HELENA_MATH_KNOWLEDGE`                                              |
| Conta e segurança     | `AUTHENTICATION`, `GOOGLE_LOGIN`, `ACCOUNT_SYNC_SETUP`, `NOTEBOOK_SHARING_SECURITY`, `SOCIAL_REALTIME_SECURITY`, `SUPPORT_SECURITY`, `SUPPORT_DISCORD_PLAN` |
| Operação e custos     | `OPERACAO_E_CUSTOS`, `CI_MINUTOS`, `TERMOS_DE_USO`, `TERMOS_DE_USO_RASCUNHO`                                                                                |
| Agenda, foco e estudo | `AGENDA`, `LIBRARY_DESIGN`, `LESSON_STRUCTURE_AND_ACTIVITY_BANK_PLAN`, `MATH_BANK_IMPLEMENTATION_PLAN`                                                      |
| Cadernos              | `NOTEBOOK_COVER`, `NOTEBOOK_COVER_ASSETS`, `HANDWRITING_ROADMAP`                                                                                            |
| Praticar e Matemática | `PRACTICE_ISLAND_ART`, `PRACTICE_TRAILS_ART`, `OLIVER_MATH_ART`, `MATH_REWARDS_SYNC`, `CHEST_REWARDS`                                                       |
| Arcano e conquistas   | `ARCANA_CATALOG`, `ARCANA_INTEGRATION`, `ARCANA_CARD_DESIGN`, `ACHIEVEMENT_DESIGN`, `PROFILE_REWARDS_CONTRACT`                                              |
| Perfil e social       | `PROFILE_SOCIAL`, `PROFILE_HANDLES`, `PROFILE_COMPLETION_API`, `PROFILE_AVATAR_CUTOUTS`, `PROFILE_COVER_ART`, `PROFILE_JOURNEY_ART`, `SYSTEM_UPDATES`       |
| Modo Sala             | `ROOM_SETUP`, `ROOM_ART`, `ROOM_PANORAMA_ART`, `BINGO_POLIANA_ART`                                                                                          |
| Design e idiomas      | `DESIGN_SYSTEM`, `I18N`                                                                                                                                     |

## 18. Limites conhecidos e itens não verificados

- O `SECOND_BRAIN.md` e o `CURRENT_STATE_AUDIT.md` são históricos longos: partes antigas descrevem estados já substituídos (por exemplo mobile no WebKit, baús, Hábitos). Para o estado atual, valem este documento e o código.
- Reconhecimento local de texto em digitalizações: divergência entre README e catálogo (seção 2.2).
- Estado real do bot do Discord e do atendimento em produção: depende de configuração externa que o repositório não prova.
- Modo escuro no celular e aparelho físico: as validações visuais registradas usam Chromium com viewport e emulação móvel, nunca um aparelho real nem o motor Safari.
- Disponibilidade e nomes de variáveis em cada ambiente da Vercel: conferir no painel.
- Números de custo de terceiros: reconferir antes de decidir.

## 19. Glossário

- **Workspace:** estado único e versionado do estudo da pessoa (tarefas, notas, materiais, foco).
- **Arcano maior e menor:** 22 cartas com figuras e 56 cartas dos quatro naipes.
- **Poeira Cósmica:** recipiente de recompensa que entrega cartas após partidas de Matemática de 100 pontos ou mais.
- **Destaques:** até três cartas ou conquistas escolhidas para o perfil.
- **Papel recortado:** estilo visual do app, de formas angulares e facetadas.
- **`stateV2`:** formato de transporte da sincronização, com regras de validação no Firebase.
- **Convidado:** uso sem conta, só no aparelho.
- **Gate (CI):** check de resultado que sempre roda e decide se o e2e necessário foi executado.
