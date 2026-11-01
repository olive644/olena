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
