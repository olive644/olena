# ACCOUNT: eventos privados de acesso

## Escopo, 31/10/2026

Implementação por HTTP, sem processo permanente. Não é o login OAuth com Discord nem o atendimento por tickets. Usa o bot existente, não webhook público. Desativada até `DISCORD_ACCOUNT_LOG_ENABLED=true` no servidor. Nenhum segredo foi criado ou publicado.

Destino autorizado pelo proprietário:

- Servidor: `1562664412530085908`.
- Categoria LOG: `1562664695339417672`.
- ACCOUNT: `1562664759017340959`.

Eventos:

- Criação: login autenticado cujo horário de criação consultado no Firebase corresponde ao primeiro acesso. Sem carga de contas históricas.
- Entrada: sessão nova pelo fluxo de login do app, inclusive retorno de redirecionamento. Recarregar uma página não é login novo.
- Saída informada pelo aplicativo: emitida somente após `signOut` concluir. Não comprova revogação de outros dispositivos nem detecta fechamento de aba, navegador encerrado ou sessão expirada.
- Exclusão: emitida após `deleteUser` concluir; servidor confere assinatura do token anterior e exige `USER_NOT_FOUND` na consulta Firebase. Falha de rede não comprova exclusão.

O método vem do token verificado, não do corpo enviado pelo navegador: Google, e-mail/senha ou custom token do fluxo Discord existente. Não identifica todos os métodos vinculados como se tivessem sido usados. Outros provedores e convidados não são publicados. Se outro emissor de custom token for adicionado, separar a identificação antes de habilitá-lo aqui.

## Privacidade e limites

Requer aceite da política 2026-10-31 antes de capturar o token para o evento. Aceite antigo não exporta nada. O Discord recebe evento, método, horário e referência HMAC pseudônima de 16 caracteres. A chave é o token protegido do bot; rotacioná-lo muda a referência. Não enviar nome, e-mail, IP, UID bruto, token, senha ou estudos. A referência ainda permite correlação e não é anonimização.

A equipe deve ter um processo de exclusão dos registros no Discord em até 30 dias antes de ativar a entrega. Não há job automático de limpeza nesta entrega. Exclusão da conta não remove imediatamente essa referência mínima do canal. Nada do histórico é reencaminhado.

O endpoint `POST /api/olena?action=account-log` exige origem aprovada, token assinado não anônimo e conta atual confirmada, exceto exclusão comprovada. Tipos/métodos e horários não vêm do cliente. Limites compartilhados no banco existente: 30 pedidos/minuto por origem, 10.000 pedidos/dia globais antes da consulta de conta, 30 eventos/dia por conta e 2.000 eventos/dia globais. Sem novo nó legível pelo cliente ou chave sincronizada.

Deduplicação por sessão/evento usa CAS e nonce do Discord, com marca enviada por 24 horas. O envelope do banco tem expiração lógica, sem limpeza física agendada; o procedimento operacional também precisa remover registros expirados de privateAccountLog. O corpo limita-se a 512 caracteres após o limite comum do adaptador. Menções ficam desativadas. Falha de permissão ou de conferência do destino bloqueia o envio.

Entrega é de melhor esforço: não existe outbox nem worker de reenvio. Navegador offline, fechamento da página, quota ou serviço indisponível podem perder o aviso. Isso não bloqueia nem reverte autenticação, saída ou exclusão. Não usar o canal como auditoria completa ou prova de presença. Não guardar tokens para tentar depois. Não há login externo real ou mensagem real validada nesta etapa.

## Preparação e ativação pela responsável

1. Bot precisa de Gerenciar canais/permissões para configurar a categoria. Não conceder Administrador. A autenticação usa `DISCORD_BOT_TOKEN` do ambiente protegido, nunca envie esse token pelo chat.
2. No ambiente que já tem o token, executar `node scripts/configure-discord-account-logs.mjs`. Sem argumentos só mostra os IDs planejados, sem alterar o servidor.
3. Executar `node scripts/configure-discord-account-logs.mjs --apply`. A autorização desta alteração veio do pedido para esconder LOG de everyone. O script restringe categoria e todos os filhos atuais, inclusive os não sincronizados. Preserva os outros bits de permissão. Remove concessão de Ver canal de outros cargos/membros e nega esse bit, permite ao próprio bot Ver canal, Enviar mensagens, Inserir links e Ler histórico. Não publica mensagem.
4. Conferir com uma conta comum que categoria e filhos desapareceram. Administradores e proprietário ignoram essas restrições pelo modelo do Discord. Novos canais precisam herdar as permissões privadas. Retirar do bot a permissão de gerenciar canais após configurar, se não houver outro uso.
5. Definir o processo de retenção, publicar código/política e então ativar `DISCORD_ACCOUNT_LOG_ENABLED=true` na Vercel, seguido de novo deploy para carregar a variável. Token do bot continua apenas no servidor. As demais variáveis Firebase já existentes são reutilizadas.
6. Com conta de teste e novo aceite: criar por e-mail, sair, entrar, repetir com Google e Discord e excluir. Confirmar um aviso por ação, método correto, nenhuma credencial ou dado pessoal no canal e nenhuma mensagem ao visitante sem aceite. Conferir falha de permissão sem vazamento em canal público.

O proprietário confirmou que o token já está configurado na Vercel. Sem token no ambiente local desta sessão, o script não foi executado contra o Discord. Alterações de painel/ambiente e retenção continuam pendentes da responsável. Para desligar, remover a flag ou usar `false`; não desfazer as permissões privadas.

Alternativa sem trazer o token para o computador: editar as permissões da categoria no próprio Discord, negar Ver canal a everyone e a concessões de outros membros/cargos, adicionar o próprio membro do bot com Ver canal/Enviar mensagens/Inserir links/Ler histórico e sincronizar todos os filhos. O emissor exige concessão ao membro do bot, não a um cargo compartilhado. Conferir com conta comum antes de ativar a flag.

## Fontes técnicas

- [Consulta autenticada de conta e USER_NOT_FOUND no Firebase](https://firebase.google.com/docs/reference/rest/auth#section-get-account-info).
- [Permissões do Discord](https://github.com/discord/discord-api-docs/blob/main/developers/topics/permissions.mdx).
- [Criação de mensagens, allowed_mentions e nonce](https://github.com/discord/discord-api-docs/blob/main/developers/resources/message.mdx).

As telas do app preservam o design existente. Não há painel novo; validação do acesso continua cobrindo PC/celular, claro/escuro. Política tem versão legível e metadado iguais.

## Teste protegido do ACCOUNT

Em Configurações > Conta, a conta responsável vê Teste do Discord. O clique envia uma mensagem fixa identificada como TESTE, sem simular criação de conta ou alterar dados. O servidor exige token Firebase válido, conta atual não anônima, e-mail verificado igual a CREKS_OWNER_EMAIL e origem aprovada. O selo CREKS do cliente apenas controla visibilidade, nunca autorização.

POST /api/olena?action=account-log-test aceita somente {"confirm":true}. GET consulta disponibilidade sem enviar. O destino permanece fixo e privado; as verificações de categoria, canal e permissões são as mesmas dos logs normais. O token do bot nunca sai da Vercel. Sucesso exige um ID de mensagem confirmado pelo Discord. Erros retornam códigos limitados e o local afetado, sem resposta bruta do serviço.

Limites compartilhados: 30 consultas/minuto por origem, 1000/dia globais; envio 1/minuto e 3/hora por responsável, 10/dia globais. A interface bloqueia reenvio por um minuto. Não há reenvio automático. Esse teste comprova apenas o trecho servidor > Discord, não o evento automático de login.

Validação local: 2452 testes em 381 arquivos e quatro cenários visuais Chromium/Edge (PC/celular, claro/escuro), com identidade e respostas Discord simuladas. Envio real ainda não verificado. Após deploy, entrar como responsável, clicar no botão e conferir o ID no ACCOUNT ou seguir o diagnóstico apresentado.

## Correção de acesso administrativo aos logs, 01/11/2026

O verificador anterior rejeitava qualquer permissão explícita de visualização além do membro do bot. Agora consulta o servidor e seus cargos quando encontra uma entrada adicional, permitindo somente a dona ou Administrator real (bit 8), inclusive membro com esse cargo. Nome de cargo não é autorização. Consultas falhas bloqueiam o envio. Metadados administrativos são mantidos apenas durante a requisição, sem registrar nomes ou IDs em logs. everyone continua explicitamente negado e o membro do bot mantém exigência de Ver canal/Enviar mensagens. Nenhuma permissão Discord ou regra Firebase alterada. Não é necessário habilitar novo provedor Firebase para este erro.

Três regressões administrativas falharam antes e passaram após a correção. Casos negativos incluem cargo apenas chamado Administrador e consulta administrativa recusada. Envio real não verificado. A cota existente de três testes por hora permanece.

## Eventos com nome e ausência, 01/11/2026

O teste manual foi removido da interface e do backend. Os códigos de tradução antigos permanecem sem uso para preservar o catálogo append-only. Mensagens reais incluem nome de exibição consultado na conta Firebase atual; na exclusão confirmada, usam o nome do token assinado capturado antes de apagar a conta. Não usam e-mail como substituto. Sem nome disponível, mostram Nome não informado. Menções continuam desativadas e nomes são limitados a 100 caracteres, sem controles.

Cores: criação verde #57F287; exclusão vermelha #ED4245; entrada, saída e ausência roxas #7839EE. A política foi atualizada para 2026-11-01, incluindo nome de exibição e acompanhamento mínimo de atividade. Aceites antigos não autorizam os eventos novos. Nenhuma conta histórica é importada.

Atividade registrada: visita autenticada visível e eventos de interação no app, com no máximo uma tentativa por conta a cada 30 minutos nesta sessão do navegador. O servidor também limita observações pelas cotas ACCOUNT existentes. Abrir a mesma conta em outro aparelho não inicia nenhum contador. Não há garantia de presença online, nem rastreamento de conteúdo, teclas digitadas, estudos ou IP no registro de atividade. O aviso é Sem atividade registrada há 7 dias, uma vez por período de ausência, com o último método observado. Não significa sessão desconectada. O prazo tem resolução de 30 minutos e verificação diária, podendo atrasar por indisponibilidade ou backlog.

O servidor guarda somente referência HMAC, nome, método, último horário e estado do aviso em privateAccountActivity, inacessível ao cliente. Não guarda UID bruto ou token. O cron GET /api/olena?action=account-inactivity exige CRON_SECRET, método GET e flag existente DISCORD_ACCOUNT_LOG_ENABLED. Limite de uma execução por hora, até 50 registros por execução e teto compartilhado ACCOUNT de 2000 mensagens/dia. CAS reserva a ausência antes de enviar, e confere novamente atividade; reabertura posterior à conferência pode coincidir com um aviso já em envio. Entrega é de melhor esforço: uma falha após reserva pode perder o aviso, sem repetição automática de entrega incerta. Atividade nova rearma o acompanhamento; exclusão confirmada remove o registro; após 30 dias sem atividade, a rotina remove o registro privado. O canal Discord conserva o procedimento manual de retenção de 30 dias.

### Ativação pela responsável

1. Publicar firebase-room.rules.json atualizado, com privateAccountActivity negado para leitura/escrita cliente e índice dueAt. Sem esse índice o cron pode falhar. Não há chave nova de workspace sincronizado.
2. Confirmar CRON_SECRET já usado pela limpeza de salas também configurado no ambiente de produção. Não enviar seu valor no chat.
3. Após merge e deploy, conferir a tarefa diária 0 5 * * * UTC (02:00 em São Paulo) declarada em vercel.json. Nenhum painel foi alterado pelo agente.
4. Aceitar a política 2026-11-01 e validar criação/entrada/saída/exclusão no ACCOUNT. A ausência começa a ser contada somente após atividade com esse aceite; não gera avisos retroativos.
5. Para rollback, desabilitar DISCORD_ACCOUNT_LOG_ENABLED pela responsável e reverter a PR. Isso interrompe todos os logs, não remove mensagens já entregues. A limpeza dos registros privados deve respeitar a retenção descrita.

Entrega real dos novos nomes/cores e cron diário ainda não verificada. A correção administrativa anterior e as permissões atuais são preservadas.
