# Agenda do aluno

## Fluxo

`/planejador` abre o planejamento do dia atual. O ícone de calendário abre e recolhe
o mês, com seletor de mês sem setas, destaque roxo e contagens compactas. Selecionar
uma data atualiza o planejamento logo abaixo, no computador e celular. Recolher o
calendário preserva a data escolhida. As abas Hoje/Semana/Mês foram substituídas.
O seletor de mês é um painel próprio com 12 botões de papel e ano editável,
sem calendário nativo do navegador. Escape e clique fora fecham o painel.
Adicionar reúne tarefa, compromisso, sessão de estudo, matéria e meta de foco.
Editar permite reagendar pela data e excluir com confirmação. Pendências podem ser
movidas para hoje, sem alterar conclusão ou criar cópias.

Rotinas semanais são um único evento com ocorrências calculadas, não cópias materializadas.
O fim opcional é inclusivo. Editar ou excluir uma rotina afeta a série inteira;
o histórico de Foco permanece preservado. Cada ocorrência guarda sua conclusão separada.

## Estudo e histórico

Começar prepara o cronômetro de Foco, com matéria, ocorrência e meta em minutos.
O aluno inicia o contador. Abrir o Foco não registra minutos nem conclui o estudo.
Sessões já iniciadas ou parcialmente realizadas não são substituídas silenciosamente.
Encerrar e registrar soma minutos completos efetivamente contados; sessões planejadas
com menos de um minuto não podem ser registradas. Ao atingir a duração planejada, a
ocorrência fica concluída. Registros parciais continuam visíveis na Agenda.

Agenda e Espaço do aluno usam a mesma seleção de ocorrências, inclusive rotinas semanais.
Google Agenda permanece separado e identificado: leitura dos próximos 14 dias, link
para editar no Google, sem importar cópias nem fingir edição local. Tarefas de aula,
matérias e metas existentes continuam disponíveis.

## Lembretes e Helena

Com a Agenda aberta, horários a até 15 minutos são destacados e recalculados a cada
30 segundos. Não há push, notificação com aplicativo fechado ou serviço pago.
Planejar com Helena abre um rascunho com semana local e até oito pendências. Não
envia por si só: o aluno revisa e confirma no chat. O professor existente responde
em streaming, sujeito à autenticação e quotas já configuradas. Não altera a Agenda
automaticamente e não recebe eventos do Google por esse atalho. Conversas não entram
no treinamento. Nenhum provedor ou serviço novo foi acrescentado.

## Compatibilidade e conta

Campos opcionais adicionados aos eventos: kind, durationMinutes, recurrence,
recurrenceUntil e completedDates. Registros antigos sem esses campos continuam
compromissos únicos. Registros de Foco recebem agendaEventId e agendaDate opcionais.
O leitor valida metadados e mantém a versão 7, sem migração destrutiva ou mudança
de regras de nuvem. IndexedDB, espelho local e sincronização por conta reaproveitam
o workspace existente. O merge por ID preserva itens independentes; edições concorrentes
do mesmo item continuam sujeitas à política de conflito existente (local prevalece).

Rollback: reverter os componentes e seletores, preservando os dados. Leitores antigos
aceitam campos extras e reducers existentes conservam os metadados ao atualizar itens.
Nenhuma rotina é expandida no armazenamento e nenhum histórico é apagado no rollback.
O contador em andamento continua local ao dispositivo, como já era no Foco.

## Verificação

- `npx vitest run src/domain/agenda.test.ts src/domain/focus-session.test.ts src/components/helena-chat.test.tsx`
- `npx playwright test e2e/agenda.spec.ts`
- `npm run verify`

Sem dependências novas. Interface e CSS do calendário são carregados na rota da Agenda.
JS inicial medido: 277,9 KiB (antes 276,3). JS total: 1215,2 KiB (antes 1203,6).
Orçamentos normais passam a 280/1217 KiB, com pequena margem de plataforma; tetos
absolutos de 400/1500 KiB permanecem inalterados.
