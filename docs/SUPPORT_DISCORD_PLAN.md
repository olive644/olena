# Atendimento e futura ponte com Discord

## Estado em 18/10/2026

Preparação interna, não integração ativa. `src/backend/support-integration.ts` define um
evento versionado e uma interface de transporte exclusivamente no servidor. A configuração
está desativada. Não existe chamada ao Discord, webhook, bot, canal, token, job, fila de
reenvio em produção ou endpoint de resposta externo. O chat do aplicativo não depende desse
módulo. Nenhum conteúdo de ticket é encaminhado a terceiros por esta preparação.

O atendimento atual em desenvolvimento mantém uma conversa por conta, autorização pelo UID
verificado e respostas da equipe no próprio app. A atualização da tela é periódica, não push.
A equipe autorizada do aplicativo não se torna automaticamente equipe autorizada no Discord.

## Decisões da base

- O banco do aplicativo permanece a fonte do histórico. Discord será canal de atendimento,
  não o único lugar onde a mensagem existe.
- Evento contém somente versão, ticket opaco, mensagem, texto e horário. Não inclui UID,
  e-mail, token de login, cadernos ou histórico de estudos. O texto livre ainda pode conter
  informações pessoais e deve ser tratado como privado.
- Chave estável por ticket e mensagem permite rastrear tentativas. Isso não garante entrega
  única no Discord: a implementação precisará reconciliar falhas de resposta após envio.
- Respostas da equipe não geram novos eventos de saída para evitar ciclos.
- Texto permanece texto. O futuro adaptador deverá impedir menções, escapar formatação e
  não executar HTML nem abrir links enviados pelo usuário.

## Implementação necessária antes de ativar

1. A proprietária cria servidor privado, aplicativo do bot e permissões mínimas. IDs do
   servidor, canal e atendentes são configurados no servidor, não por nomes ou cargos editáveis.
   Segredos ficam em variáveis protegidas, nunca no frontend, Git, ticket ou logs.
2. Aprovar a informação de privacidade para explicar o encaminhamento ao Discord, acesso,
   retenção e exclusão. Não encaminhar tickets históricos automaticamente.
3. Gravar uma outbox na mesma operação atômica da mensagem confirmada, antes de qualquer
   envio externo. Não implementar apenas um fetch após salvar: falhas perderiam a entrega.
   A outbox deve conter referência ao conteúdo, não outra cópia permanente da conversa.
4. Worker com lease/CAS, tentativas limitadas, backoff, estado pendente/enviado/falhou e
   limites por conta e globais. Worker revalida existência/expiração da conversa antes de
   enviar. Cancelar pendências ao excluir a conta. Definir limpeza efetiva no banco e no Discord,
   incluindo expiração, sem confundir TTL lógico com exclusão física agendada.
5. Mapear ticket para conversa privada no Discord e reconciliar IDs externos. Não expor
   hash de ticket como autorização; só identidades verificadas têm acesso.
6. Para responder: validar assinatura de cada interação, timestamp contra replay e IDs de
   servidor/canal/atendente. Validar o vínculo do ticket no servidor, persistir a resposta com
   idempotência pelo ID da interação e registrar o autor para auditoria restrita. Nunca aceitar
   `from: team`, UID ou papel fornecido pelo navegador como prova de autorização.
7. Limitar tamanho, quantidade, frequência e custo. Falha no Discord não apaga mensagem
   salva nem transforma resposta recebida em sucesso sem persistência. Exibir status honesto.
8. Testar respostas duplicadas, concorrência, bot offline, limites do provedor, remoção de
   acesso de atendente, assinatura inválida, conta excluída durante entrega e exclusão do canal.
   Fazer ensaio em servidor de testes antes de habilitar para usuários.

## Modelo de ameaça

Conteúdo e IDs recebidos são não confiáveis. Riscos principais: leitura entre contas,
resposta falsa de atendente, spam de menções, replay, vazamento por canal público ou logs,
entrega duplicada e retenção após exclusão. O contrato preparado não resolve esses riscos
sozinho. A ativação exige os controles e testes acima e uma mudança própria revisada.

Nenhuma infraestrutura deve ser criada ou ativada automaticamente nesta etapa.
