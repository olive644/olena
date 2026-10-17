# Amigos e compartilhamento de perfil

## Escopo

Conexões reais do tipo seguir, não pedidos de amizade pendentes. Seguir de volta
cria a relação inversa. Buscar por @ ou pelo nome compartilhado, visitar a ficha,
seguir/deixar de seguir e receber aviso de novo seguidor. O próprio Perfil mostra
as contagens confirmadas pela conta, com estado de consulta em vez de zero fictício.
Sem mensagens privadas, importação de agenda inteira, presença ou recomendações
inventadas. Sugestões são apenas conexões de segundo grau reais.

Adicionar amigo abre três ações em papel: contatos, buscar por nome e Compartilhar
perfil. Contatos pede somente o nome de uma pessoa escolhida, por gesto explícito.
O nome fica no campo e só é enviado quando a pessoa confirma Buscar. Não enviamos
telefone, e-mail ou lista de contatos. Navegadores sem Contact Picker mostram a
alternativa por nome/link, sem simular permissão.

Compartilhar perfil gera `/perfil?usuario=<username>`, QR com zona livre de quatro
módulos, cartão com identidade do dispositivo, cópia de link, compartilhamento
nativo quando suportado e PNG de 720 por 960 px. Sem serviço de QR externo nem
upload da imagem. A disponibilidade de contatos e compartilhamento é consultada
em tempo de execução, conforme [Contact Picker](https://developer.mozilla.org/en-US/docs/Web/API/Contact_Picker_API)
e [Web Share](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

## Privacidade e autorização

O visitante precisa de uma conta autenticada e @ reservado. Por padrão aparece
somente o @ e a Helena padrão. Nome e personagem entram na ficha visitável apenas
após Compartilhar nome e personagem, com possibilidade de ocultar novamente.
O cartão que a pessoa decide enviar pode usar seus dados locais sem publicá-los
automaticamente no diretório. E-mail, estudos, agenda, bio, UID e tokens não fazem
parte da resposta social. Fotos limitadas aos personagens oficiais, sem URLs externas.

`/api/profile-social` reutiliza a verificação Firebase JWT e accounts:lookup da
reserva de @, com origem autorizada e rejeição de guest, conta removida/desativada
ou UID divergente. Identidade vem do token, nunca de body.uid. A busca é limitada
a dez resultados e exige pelo menos dois caracteres. Rótulos são somente visuais.

## Persistência e concorrência

`privateProfileSocial/accounts/<sha256(uid)>` armazena apresentação opcional,
following por identidade e notices por ator. Nenhum acesso direto do navegador;
regras negam leitura e escrita. CAS/ETag garante relações e avisos atômicos,
idempotência de seguir e tentativas em conflito. Relações usam identidade, não @,
portanto renomear não transfere seguidores para outra pessoa.

Avisos ficam ocultos depois de 48 horas e são podados em mutações, até cinquenta
por conta. Seguir repetidamente a mesma pessoa nesse intervalo não gera novos
avisos, inclusive após deixar de seguir. Recibos sociais ficam na conta; recibos
das atualizações do sistema continuam no fluxo sincronizado anterior.

Exclusão de @ por DELETE libera primeiro a reserva e aguarda a limpeza social no
servidor, inclusive para clientes antigos, antes de responder sucesso. A limpeza
remove a ficha, relações nos dois sentidos e referências de notificação. POST
reconfere a reserva após ler a versão social, evitando recriar relações em corrida
com a exclusão. Se a limpeza falhar, retorna erro e o fluxo não apaga a autenticação
nem os estudos. Uma nova tentativa continua segura e idempotente.

## Limites desta versão beta

Trinta chamadas por minuto por conta, payload de 2 KiB, até duzentas pessoas
seguidas, mil fichas sociais e snapshot de cinco milhões de caracteres. Não há
TTL para o grafo. Antes desses tetos, migrar para armazenamento particionado e
transações por relação; não aumentar os limites do registro global indefinidamente.
Consultas de feed visível ocorrem a cada minuto, no foco e após uma ação. Troca de
conta limpa o feed e ignora respostas anteriores.

Usa as mesmas credenciais Firebase administrativas e origens do endpoint de @,
sem nova chave ou dependência. Ausência de configuração falha fechado com mensagem
de indisponibilidade. Testes locais não substituem a prova com duas contas reais
no ambiente publicado. Acesso a contatos e painel nativo depende do navegador.

## Verificação e rollback

Testes de handler cobrem autenticação/origem, nomes, publicação explícita,
idempotência, seguir de volta, expiração, CAS, exclusão, renomeação, campos forjados
e mapas vazios omitidos pelo Firebase. Cliente/hook testam troca de conta e rejeição
de resposta inválida. Interface testa busca, visita, contatos sem envio automático,
QR/link e compartilhamento sem publicação implícita. Navegador cobre layout,
teclado, foco e estados sem conta nos dois temas e tamanhos.

Rollback visual não deve apagar o grafo. Manter o endpoint e o gancho de limpeza
na exclusão enquanto existirem fichas; clientes antigos continuam protegidos pelo
servidor. Não reutilizar os nós sociais como armazenamento de estudos.
