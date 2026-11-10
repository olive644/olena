# Personalização do perfil e contador online

## Identidade visual

O seletor único possui quatro categorias: Avatares, Molduras, Headers e Fundo do perfil. Reutiliza os personagens existentes, botões facetados, seleção amarela, X de papel sem placa e variáveis de superfície do aplicativo. A prévia combina as escolhas antes de salvar. Cancelar não grava. Salvar altera somente os campos escolhidos, preservando edições concorrentes de nome, bio e outros dados.

As molduras são anéis octogonais SVG transparentes, sem cobrir rosto ou badge de nível. As cores das bandeiras são preservadas também no modo escuro. Orgulho LGBT, lésbica, gay, bi, trans, pan, não binárie, assexual, arromântica, agênero, gênero fluido e intersexo são escolhas livres. Não inferir identidade de gênero ou orientação a partir de avatar, nome ou qualquer outra informação. A seleção é opcional e fica visível quando a pessoa compartilha seu perfil.

O exclusivo Guardião dos números requer a conquista islands-1 (uma ilha completa). O header Horizonte dos números requer correct-100 (100 acertos). Não conceder XP ou progresso ao selecionar a decoração. A validação do desbloqueio utiliza o progresso existente no aparelho sincronizado; é uma recompensa cosmética, não uma autorização financeira ou prova antifraude no servidor.

Fundo do perfil personaliza a superfície abaixo do header: papel original, as mesmas doze bandeiras das molduras e headers, e Matemática. Céu de papel e caderno geométrico continuam compatíveis com escolhas anteriores. O fundo matemático requer correct-100 (100 acertos), conferido ao escolher e novamente ao salvar. O padrão usa contraste discreto, sem prejudicar textos, controles ou redes sociais. Campos frame/background são opcionais na chave existente helena.profile.v1. Perfis antigos usam none/paper. A projeção social aceita apenas IDs conhecidos, sem URLs arbitrárias, e publica esses campos junto dos demais detalhes de apresentação. Não cria nova chave sincronizada.

## Consistência das superfícies

Perfil próprio, inspeção de outro usuário, prévia de compartilhamento e PNG devem combinar o header, o fundo e a moldura escolhidos. O card próprio usa as escolhas atuais de helena.profile.v1 mesmo antes de a projeção social retornar atualizada. Visitas usam somente os dados publicados daquele perfil, sem herdar escolhas do visitante. IDs desconhecidos continuam caindo em none/paper.

Fundos de bandeiras preenchem toda a superfície abaixo do header, de ponta a ponta, com todas as faixas na ordem original e facetas discretas de papel. Não limitar a decoração às margens nem deixar o centro sem tema. SVGs têm base opaca e preserveAspectRatio=none, para preencher perfis largos e verticais sem letterbox. As faixas começam abaixo do header, sem esconder parte da bandeira atrás dele. Tinta clara no SVG e composição multiplicada no modo escuro mantêm leitura dos textos e cores do tema. O fundo de Matemática também preenche toda a área com malha, sólidos e operadores originais. A exportação mantém papel creme e desenha as mesmas artes locais de fundo e moldura, com margem para o nome e nível acima da moldura. Não desenhar fundos opacos sobre textos nem exportar somente o header.

## Matemática

A frase da questão na revisão usa fluxo inline normal, mantendo palavras e dígitos na mesma linha quando há espaço. Não distribuir fragmentos de texto como itens flex. No celular, título da conta usa escala de 17 a 21 px e alinhamento à esquerda. Números continuam PaperDigits, sem trocar a tipografia aprovada.

## Presença no Olena

Destino fixo: servidor 1562664412530085908, canal de voz 1566649923099689070. Nome publicado: Online no Olena: N. O código não cria canal, altera permissões ou envia mensagem. Confere servidor e tipo de canal antes de renomear. O bot precisa de Ver canal e Gerenciar canais nesse destino. Não precisa de conectar ou falar.

Após aceitar a política 2026-11-02, contas autenticadas não anônimas enviam sinal por minuto enquanto o documento estiver visível. Uma referência SHA-256 por UID guarda apenas o horário no nó privado privateOnlinePresence. Múltiplas abas ou dispositivos não duplicam a conta. O sinal expira após 150 segundos sem renovação. Sair ou fechar não garante envio final; a expiração resolve desconexão abrupta. Nunca chamar isso de estudo ativo.

Contagem consulta somente valores recentes, com índice .value e limite de 2001. Acima de 2000 contas simultâneas, falha explicitamente, sem publicar uma contagem truncada. A atualização remove até 20 entradas expiradas por lote, com ETag e exclusão condicional para não apagar um sinal renovado enquanto a limpeza ocorre. Sem agendamento, entradas antigas podem permanecer armazenadas até a próxima atualização, embora não entrem na contagem. Não há nomes, e-mails, conteúdo de estudo, UID bruto ou tokens nesses registros. Discord recebe somente N.

CAS compartilhado limita renomeações a uma tentativa a cada cinco minutos, ignora totais iguais e respeita Retry-After do Discord. Falha de transporte não marca sucesso. Limites por conta: 2 sinais/minuto; endereço: 120/minuto; global: 60000/dia. Cron: uma execução a cada 300 segundos. Nenhuma dependência nova ou alteração de workflow.

## Ativação pela responsável

1. Publicar o arquivo firebase-room.rules.json vigente, cuja única adição de regra desta mudança é privateOnlinePresence com leitura/escrita de cliente negadas e índice .value. Fazer backup das regras publicadas antes.
2. Confirmar permissões do bot no canal informado. O token já existente continua somente no servidor.
3. Configurar DISCORD_ONLINE_COUNT_ENABLED=true na Vercel e fazer novo deploy. A flag fica desligada por padrão. Quando desligada, o cliente interrompe o heartbeat após a primeira resposta, sem continuar consultando.
4. Configurar um agendador para GET /api/olena?action=online-presence a cada cinco minutos, com Authorization: Bearer CRON_SECRET. Não publicar esse segredo no repositório, terminal ou screenshots. O plano Hobby da Vercel permite cron diário, portanto não adicionar um cron de cinco minutos ao vercel.json nesse plano. Usar um agendador existente autorizado pela responsável ou um plano com essa capacidade. Nenhuma contratação foi realizada.
5. Sem esse agendamento, o contador se atualiza enquanto há pessoas usando o app, mas pode ficar mostrando o último número quando todos saem. Não apresentar essa configuração incompleta como tempo real validado.
6. Conferir duas contas reais em janelas visíveis, duas abas da mesma conta, expiração após fechar tudo e publicação de zero pelo agendamento. Testes locais não validam permissões, token, renomeação real, quotas reais ou entrega em produção.

Fontes verificadas: https://github.com/discord/discord-api-docs/blob/main/developers/resources/channel.mdx e https://github.com/discord/discord-api-docs/blob/main/developers/topics/rate-limits.mdx; https://vercel.com/docs/cron-jobs/usage-and-pricing.

## Rollback e validação

Desligar DISCORD_ONLINE_COUNT_ENABLED interrompe a coleta no próximo carregamento. Remover o agendamento e limpar privateOnlinePresence pela operação da responsável. Preservar helena.profile.v1: campos novos são aditivos. Um rollback visual pode ignorar frame/background sem apagar o perfil ou o progresso.

Toda alteração visual exige PC e celular, claro e escuro, teclado, toque, ausência de overflow, estados bloqueados e persistência. Registrar resultados e limitações em CURRENT_STATE_AUDIT.md. Artes são SVGs originais construídos para o aplicativo, não capturas de tela nem alterações dos personagens aprovados.

## Lista de amigos e nível na inspeção, 04/11/2026

Retirado o aviso de contatos indisponíveis da lista de amigos. Busca e compartilhamento continuam disponíveis; o seletor sem suporte continua desabilitado. Voltar na lista usa somente a seta original, sem placa ou texto visível, preservando nome acessível e área de toque de 44 pixels.

Na inspeção, o selo de nível fica acima da moldura do avatar. Prova de layout usa o selo real do app dentro de uma fixture de inspeção, nos dois temas e em desktop/mobile; não representa uma visita autenticada real.

## Cosméticos de Inglês e Teco, 09/11/2026

Teco é um avatar livre com imagem aprovada em /profile-avatars/teco.webp. A moldura inglesa Guardião das palavras requer concluir a ilha inteira, oito partes. O header Horizonte das palavras e o fundo inglês requerem cem acertos de Inglês. IDs english-parts-8 e english-correct-100 mantêm os cursos separados. Livro sincronizado e histórico de conquistas preservam o acesso após a lista de atividades mudar. Conferir o requisito ao selecionar e novamente ao salvar.

As três artes usam azul, vermelho e branco da bandeira britânica, sem raios decorativos. SVGs nativos mantêm anel octogonal transparente, header 1200x320 e fundo 900x1200 opaco com preserveAspectRatio=none. O fundo reutiliza a composição de tema escuro e a exportação do perfil existentes. Referência aprovada e validação em ENGLISH_PROFILE_COSMETICS.md.
