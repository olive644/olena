# Atendimento privado: modelo de ameaça e validação

## Escopo da branch em desenvolvimento

Uma conversa por conta verificada em `/api/olena?action=support`, com fila restrita à equipe.
Firebase autentica o usuário; o servidor verifica token e consulta a conta atual. Papel de
atendente depende de hash de UID em lista exclusiva do servidor, não de @, e-mail informado
pelo cliente ou visibilidade do botão. Apenas a identidade autorizada pela proprietária está
na lista. Não registrar o UID original, tokens ou conteúdo de mensagens em logs.

## Controles

- Identidade anônima, não verificada ou ausente é recusada. Consulta a outra conversa e fila
  por usuário comum retorna 403. A mesma restrição vale para leitura e escrita.
- Origem validada, JSON estrito, query com lista permitida, texto até 2.000 caracteres e
  corpo até 12.000 bytes. Conteúdo é renderizado como texto, não HTML.
- POST repetido usa requestId para não duplicar a mensagem. Escrita CAS evita perda de
  mensagens concorrentes, com cinco tentativas. Índice e conversa não são transação única:
  uma falha pode deixar referência temporária sem mensagem, mas não confirma gravação inexistente.
- Por conta: 30 leituras/minuto, 10 escritas/minuto e 60 escritas/dia. Global: 1.000
  solicitações/minuto e 2.000 escritas/dia. Teto de 500 conversas indexadas e 100 mensagens
  por conversa. Esses são limites de proteção, não consumo medido nem garantia de custo zero.
- Histórico com expiração lógica de 30 dias de inatividade no armazenamento existente.
  Não há limpeza física agendada. Exclusão da conta remove conversa e referência na fila.
- Cliente confirma UID antes e após cada requisição, ignora respostas de outra geração e
  limpa conversa/draft ao receber troca de conta. Atualiza a cada 20 segundos apenas com
  tela aberta e visível; não representa push nem atendimento 24 horas.
- Nenhuma chamada ao Discord. Preparação futura em SUPPORT_DISCORD_PLAN.md.

## Riscos residuais e critérios de publicação

Não oferece anexos, remoção individual de mensagens, encerramento/reabertura ou pesquisa de
conversas antigas. Ao atingir o limite de mensagens, informar o bloqueio sem prometer que o
time possui um botão de encerramento que ainda não existe. Exportação dos estudos não inclui
conversas remotas e isso é informado na interface.

Antes de publicar o atendimento: conferir negação de acesso direto ao caminho privateSupport
pelas regras publicadas, atualizar informação de privacidade para o fluxo de atendimento,
verificar remoção de dados com conta real e testar envio/resposta entre usuário e equipe.
Nenhum teste com mock equivale a validação publicada de Firebase ou permissões de produção.
Não alterar regras ou variáveis de infraestrutura automaticamente.

## Testes

- support-handler.test.ts: isolamento, papel fixo da equipe, origem, anônimo, conta não
  verificada, quota, campos de impersonação, replay e remoção de conversa/índice.
- support.test.ts: credencial somente no header, resposta obsoleta após troca de conta,
  ausência de login e payload inválido.
- support-chat.test.tsx: falha preserva rascunho e troca de conta remove conteúdo anterior.
- support-integration.test.ts: contrato futuro desativado, chave estável e prevenção de eco.

Testes unitários não substituem revisão de segurança nem teste entre contas reais.
