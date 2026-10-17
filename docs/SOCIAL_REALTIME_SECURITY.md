# Avisos sociais em tempo real

## Causa e transporte

Antes, useSocialFeed consultava a API a cada dez segundos. Não existia evento
entre as contas. Além disso, seguir novamente após desfazer o vínculo mantinha
o aviso anterior por 48 horas e podia deixá-lo marcado como lido.

GET /api/profile-social?stream=1 abre SSE autenticado. O servidor verifica JWT e
o estado atual da conta com o mesmo identifyProfileAccount da API social. Faz
streaming da folha privateProfileSocial/accounts/sha256(uid)/notices pelo REST
do Firebase. Não lê o grafo inteiro para manter a conexão. O navegador recebe
somente ready/changed, sem hashes, UIDs, token de serviço ou dados de terceiros.
Ao receber changed, invalida o cache compartilhado e consulta o feed autorizado
imediatamente. O polling de dez segundos fica apenas como recuperação.

## Isolamento e limites

- O UID vem exclusivamente da identidade verificada, nunca de query/body.
- Somente GET, stream=1 único e origem permitida. Anônimos são recusados.
- Token Firebase do usuário vai no cabeçalho Authorization, nunca na URL.
- OAuth de serviço permanece no servidor. Redirect 307 só é seguido para HTTPS
  de domínio Firebase oficial, mesmo namespace e caminho, sem porta alternativa.
- Leitura upstream usa parser SSE limitado: 512 KB por conexão, 32 KB por evento
  e no máximo 256 mudanças por conexão. Frames idênticos consecutivos não provocam
  novo fetch de feed. Keepalive não gera atualização.
- Duração máxima de cada conexão: quarenta segundos; função Vercel: sessenta.
- Cotas: seis conexões por minuto/UID e trezentas por minuto globais. São tetos
  de proteção de custo, ajustáveis após observar uso real, não promessa de escala.
- Uma conexão compartilhada entre sino e perfil por conta/aba. Saída de uma
  página tem tolerância de um segundo para reaproveitar a conexão na próxima;
  logout/troca de conta cancela imediatamente. Resposta antiga não dispara evento.
- Reconexão usa espera progressiva; 401/403/429 aguardam um minuto. Não há novo
  serviço pago, dependência, credencial pública ou regra Firebase liberada.

Seguir um vínculo já existente é idempotente. Um vínculo realmente novo atualiza
o aviso para não lido, inclusive após deixar de seguir. Permanecem as cotas da API
social, limite de cinquenta avisos e retenção de 48 horas no histórico.

## Verificação e limitação explícita

Testes cobrem isolamento, origem, autenticação, cotas, redirects, evento por HTTP
com duas identidades de teste, envio do cliente sem polling e fechamento da
conexão. Não equivalem a duas contas reais no Firebase publicado.

Validação de produção combinada com o proprietário: @oliver644 segue @dreyxn,
com o destinatário aberto em outra sessão. Confirmar aviso sem recarregar,
avatar, visita ao perfil, seguir de volta e desaparecimento após seis segundos.
Não declarar este teste concluído antes de observar o resultado publicado.

Referências oficiais:

- https://firebase.google.com/docs/reference/rest/database#section-streaming
- https://vercel.com/docs/functions/streaming-functions
