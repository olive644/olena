# Agenda do aluno

## Regra de sincronização pela conta

A publicação das regras `stateV2` descrita em docs/ACCOUNT_SYNC_SETUP.md é
pré-requisito da sincronização nova. Chaves locais com pontos são codificadas
somente no transporte; o caminho legado fica intacto para não afetar abas antigas.

Agenda, minutos registrados de Cronômetro/Pomodoro, sequências e recuperação da
sessão em andamento usam a conta autenticada. Não existe um modo de sincronização
local. LocalStorage e IndexedDB são cache e recuperação offline: uma atualização
da página não pode substituir histórico concluído por uma cópia antiga ou vazia.
O primeiro carregamento conserva registros de Foco por ID, sem duplicar minutos,
une os dias de Pomodoro e mantém a sessão válida mais recente. Mudanças recebidas
da conta também atualizam IndexedDB; leituras antigas não substituem edições ou
troca de conta. Histórico concluído é aditivo; remoção de dados pessoais continua
no fluxo explícito de exclusão da conta.

O contador grava recuperação no dispositivo e compartilha snapshots a cada 30
segundos, nas mudanças de controles e ao sair da tela. Isso evita enviar o workspace
inteiro a cada segundo. Atualizar no mesmo aparelho mantém início/prazo; em outro,
a sessão aparece pausada e só passa a ser controlada ali após uma ação do usuário.
Abrir o Foco vazio não grava um snapshot zero sobre um contador existente na conta.
Snapshots não contam como minutos registrados, nem recriam sessões concluídas.
Ao sair da conta, sessão e identificador do aparelho são limpos. Voltar à conexão
repete a carga inicial que falhou e envia alterações pendentes automaticamente.
Sem rede, informar envio pendente; sem login/configuração, não afirmar salvamento
na conta. Novos registros não recuperam dados já apagados de todos os backups.

Barra da Agenda usa ícones facetados com textos visíveis e rótulos acessíveis, botões creme e base
amarela para a visualização ativa. Setas duplicadas e ação manual de sincronização
foram retiradas. Navegação de datas permanece no seletor do calendário. Exportar
inicia download sem o aviso textual anterior. Erros de importação/notificações
continuam explícitos; os limites de .ics e lembretes continuam documentados abaixo.

## Fluxo

`/planejador` abre o planejamento do dia atual. Calendário e categorias ficam
sempre visíveis. O ícone abre o seletor de mês, com destaque roxo e contagens
compactas. Selecionar uma data atualiza planejamento e gráficos logo abaixo,
no computador e celular. A agenda oferece Dia, Semana, Mês e Lista.
O seletor de mês é um painel próprio com 12 botões de papel e ano editável,
sem calendário nativo do navegador. Escape e clique fora fecham o painel.
Arrastar com mouse/toque seleciona um intervalo inclusivo; o botão Selecionar
intervalo oferece início/fim por clique ou teclado. Shift + clique estende a
seleção. A seleção é temporária, não cria ou modifica eventos. O dia final mostra
o planejamento e os registros de Foco desse dia. Limpar retorna ao resumo mensal.

Faixas turquesa marcam dias com minutos reais de Foco. Seu ritmo agrega minutos,
dias estudados e maior sequência dentro do mês ou intervalo escolhido. Os horários
da linha do tempo são de conclusão (`completedAt`), não de início: o formato atual
não guarda início, pausas ou intervalos exatos. Não há tempos inventados. As datas
usam o fuso local do dispositivo. O histórico usa os registros já sincronizados do
workspace, sem alterar esquema, conta ou persistência. X coloridos usam arte
vermelha facetada sem placa; os X monocromáticos permanecem intactos.
Adicionar reúne tarefa, compromisso, sessão de estudo, matéria e meta de foco.
Editar permite reagendar pela data e excluir com confirmação. Pendências podem ser
movidas para hoje, sem alterar conclusão ou criar cópias.

Rotinas são um único evento com ocorrências calculadas, não cópias materializadas.
O fim opcional é inclusivo. Há repetição diária, semanal com dias escolhidos, mensal
e anual, com intervalo. Datas inexistentes, como 31 em fevereiro, são puladas.
Editar ou excluir permite escolher só a ocorrência, esta e seguintes ou toda a série.
Registros antigos de Foco não são apagados nem transferidos para outra data.

## Agenda interna completa, primeira etapa

A grade do dia e da semana permite criar por horário, arrastar para reagendar e
redimensionar a duração. Toda alteração abre o editor para confirmação antes de
gravar. Teclado oferece Mover e escolha de horário. Busca e filtros limitam eventos
por texto, matéria e tipo. Compromissos aceitam dia inteiro, múltiplos dias, fuso IANA,
descrição, local, links http/https, participantes e lembretes. Estudos mantêm o
limite de 180 minutos do Foco. Datas de dia inteiro são flutuantes; horários são
projetados no fuso brasileiro da conta, sem mudar o instante armazenado. Não há
seletor de fuso por evento. helena.agendaTimeZone.v1 sincroniza a escolha automática
inicial: fuso IANA brasileiro do dispositivo, ou America/Sao_Paulo se o dispositivo
não estiver no Brasil. O cadastro atual tem apenas nome/foto, sem cidade/estado;
não se presume uma localização ausente nem se solicita geolocalização. Fusos
brasileiros aceitos seguem a [tabela IANA](https://data.iana.org/time-zones/tzdb/zone1970.tab).
Eventos importados preservam seu instante; o editor converte para o fuso da conta.
Após implantar esta etapa, atualizar as abas em todos os dispositivos. Clientes
anteriores desconhecem a nova preferência de fuso, portanto não garantem a mesma
projeção brasileira compartilhada enquanto permanecerem abertos.

Duração abre um relógio com ponteiros arrastáveis, teclado e entradas alternativas.
Local, Links e Participantes só exibem entrada após abrir seus painéis; resumo
preenchido permanece no formulário. Lembrar antes usa RoomStepSlider da Escuta
coletiva, com aviso na hora por padrão e opção de antecipação sem botões avulsos.

Até três imagens ou PDFs de 300 KB podem ser anexados por evento. São dados privados
do workspace e podem entrar na sincronização existente da conta. Não são enviados
a novos serviços e não entram no arquivo .ics. Participantes são metadados, sem
convites automáticos. Compartilhar gera um .ics, não oferece edição colaborativa.
Arrastar ou selecionar arquivos utiliza a mesma validação e limite. Fotos aparecem
como imagens reais no formulário, nos cartões e nas quatro visualizações; anexos
de PDF continuam disponíveis para baixar. Blocos com foto têm altura visual mínima
maior para que a prévia não fique cortada, sem mudar sua duração real.

Importação .ics limita arquivos a 2 MB e 1000 eventos, usa UID para evitar duplicatas
e não substitui eventos existentes. Suporta recorrências básicas e EXDATE; séries
com exceções RECURRENCE-ID ou regras não suportadas são ignoradas e contabilizadas.
Exportação inclui datas, fuso, detalhes, participantes e alarmes, sem histórico.

Lembretes funcionam enquanto o aplicativo estiver aberto. Alertas internos não
dependem de permissão; notificações do navegador exigem autorização explícita.
Adiar guarda uma fila local por conta. Não há push com o aplicativo fechado nem
garantia de execução pontual em abas suspensas pelo navegador.

A agenda reutiliza a sincronização do workspace. Eventos e tarefas mesclam campos
independentes; conflitos no mesmo campo continuam no fluxo de reconciliação do
Perfil. Conclusões e exclusões de ocorrências são mescladas por data. Não há nova
integração Google nesta etapa. O formato v7 mantém campos antigos compatíveis e
metadados opcionais; duração completa usa calendarDurationMinutes e campos de fim,
com durationMinutes limitado a 180 para leitores antigos. Clientes antigos devem
ser atualizados antes de editar recursos avançados.

## Estudo e histórico

Começar prepara o cronômetro de Foco, com matéria, ocorrência e meta em minutos.
O aluno inicia o contador. Abrir o Foco não registra minutos nem conclui o estudo.
Sessões já iniciadas ou parcialmente realizadas não são substituídas silenciosamente.
Encerrar e registrar soma minutos completos efetivamente contados; sessões planejadas
com menos de um minuto não podem ser registradas. Ao atingir a duração planejada, a
ocorrência fica concluída. Registros parciais continuam visíveis na Agenda.

Agenda e Espaço do aluno usam a mesma seleção de ocorrências, inclusive rotinas semanais.
Google Agenda e Listas de estudo não aparecem mais nesta tela. A conexão e os dados
existentes permanecem salvos, sem exclusão ou alteração da sincronização.

Meu estudo agrega Foco por dia, nunca pela matéria padrão não escolhida.
Caderno conta criações datadas na estante, separando cadernos, pastas e Notes
na pizza e exibindo seus nomes. Não duplica as páginas internas da Note.
Praticar mostra somente ilhas com respostas no período; navegar pela prévia
filtra também os gráficos da ilha exibida. Datas vazias têm explicação,
sem gráficos fictícios. Flores e tomates mantêm a exceção visual do Foco.

Retomar com calma aparece apenas para tarefas realmente vencidas, com data
válida e não concluídas. Matérias e metas não têm widget duplicado na Agenda;
os dados existentes permanecem salvos. O widget Uma semana possível foi removido.
Em telas a partir de 1200px, calendário/painel do dia e Meu estudo ficam lado a lado
em um conjunto de até 1600px. Em telas menores, ficam empilhados em até 860px.
As sete flores/tomates e as três ações do dia ficam em uma linha, inclusive no celular.
Textos auxiliares da semana e do dia vazio foram removidos; status acessíveis permanecem.
O título da data usa números comuns, sem alterar os números da grade.
Controles e ícones não entram na seleção de texto; informações e campos
editáveis continuam selecionáveis.

## Lembretes e Helena

Com a Agenda aberta, horários a até 15 minutos são destacados e recalculados a cada
30 segundos. Não há push, notificação com aplicativo fechado ou serviço pago.
O atalho Planejar com Helena foi removido junto com o widget semanal. O chat
existente continua disponível e não altera a Agenda automaticamente. Conversas
não entram no treinamento. Nenhum provedor ou serviço novo foi acrescentado.

## Compatibilidade e conta

Campos opcionais de eventos incluem kind, durationMinutes, recurrence,
recurrenceUntil, completedDates, recurrenceFrequency, recurrenceInterval,
recurrenceDays, excludedDates, endDate, endTime, allDay, timeZone, description,
location, links, guests, reminders, attachments e calendarDurationMinutes.
Registros antigos sem esses campos continuam
compromissos únicos. Registros de Foco recebem agendaEventId e agendaDate opcionais.
O leitor valida metadados e mantém a versão 7, sem migração destrutiva ou mudança
de regras de nuvem. IndexedDB, espelho local e sincronização por conta reaproveitam
o workspace existente. O merge por ID preserva itens independentes; eventos e tarefas
mesclam campos independentes. Edições concorrentes do mesmo campo continuam sujeitas
à política de conflito existente (local prevalece com conflito informado).

Rollback: reverter os componentes e seletores, preservando os dados. Leitores antigos
aceitam campos extras e reducers existentes conservam os metadados ao atualizar itens.
Nenhuma rotina é expandida no armazenamento e nenhum histórico é apagado no rollback.
O contador em andamento continua local ao dispositivo, como já era no Foco.

## Verificação

Clique/toque/Enter em um dia abre a folha contextual com ações para
tarefa, estudo e compromisso. O calendário permanece acessível para filtros e
intervalos. O formulário preenche a data selecionada, aceita horário/duração e
persiste nas mesmas coleções sincronizadas do workspace. Voltar não altera dados.
Feriados nacionais têm marcador e nome do dia. Datas móveis usam o Computus;
Carnaval/Corpus Christi são pontos facultativos, não feriados nacionais nesta lista.
Feriados estaduais/municipais não são inferidos sem localização.

O botão Adicionar do topo foi removido. Formulário usa seletores/painéis de papel
para tipo, matérias do catálogo de ilhas, calendário e horário, sem widgets
nativos azuis. Repetição é escolhida por dois ícones com nomes acessíveis.
Novo ID de matéria é estável, adicionado só ao salvar e não duplicado no merge.
Matérias antigas personalizadas são preservadas na edição. Check amarelo/grafite
e seleção/gráficos/painéis animados respeitam movimento reduzido. Ver DESIGN_SYSTEM.md
para a exceção dos X monocromáticos e o fechamento colorido sem placa.

O calendário permanece visível e o ícone de papel abre somente o seletor de mês.
Gráficos filtram o dia selecionado ou o intervalo, incluindo dias com zero registros.
Em Praticar, dias/intervalos sem respostas positivas não exibem gráficos nem
prévias. Progresso acumulado sem data fica somente em Matemática. A prévia compacta
tem arte centralizada de 80px. Sem registros, uma mensagem explica a ausência de
atividade datada. Textos de sequência e instrução visual da ilha foram removidos.
A legenda mostra respostas/acertos do filtro, com setas roxas, teclado e arraste. Flores e
tomates semanais continuam visíveis no Foco mesmo sem minutos, como exceção visual.
Praticar recebe `practiceActivities` opcional no workspace 7. Cada atividade contém
ID, identificação/nome da ilha, data de conclusão, respostas e acertos. Novas ilhas
devem despachar `practice/recorded` após avaliação confirmada, com ID estável para
retries. Não inventar duração nem converter progresso acumulado sem data em diário.
Leitores anteriores aceitam o campo extra e o merge trata ausência como coleção
desconhecida, não como exclusão; rollback não altera os dados existentes.

- `npx vitest run src/domain/agenda.test.ts src/domain/focus-session.test.ts src/components/helena-chat.test.tsx`
- `npx playwright test e2e/agenda.spec.ts`
- `npm run verify`

Sem dependências novas. Interface e CSS do calendário são carregados na rota da Agenda.
JS inicial medido: 277,9 KiB (antes 276,3). JS total: 1215,2 KiB (antes 1203,6).
Orçamentos normais passam a 280/1217 KiB, com pequena margem de plataforma; tetos
absolutos de 400/1500 KiB permanecem inalterados.
