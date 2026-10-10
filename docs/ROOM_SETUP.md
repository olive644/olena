# Configurar o Modo Sala (multiplayer)

O Modo Sala permite que o professor crie uma sala com um código de cinco
letras e cada aluno entre pelo próprio celular, de qualquer lugar, para
jogar o quiz de escuta em tempo real com placar ao vivo.

Como o OlenaStudy é uma SPA estática na Vercel (sem servidor tradicional
nem banco de dados), o estado de cada sala precisa ficar em algum lugar
acessível pelos dispositivos de todos os participantes. Usamos o
**Firebase Realtime Database**: o servidor (função na Vercel) é o único que
grava; cada navegador escuta atualizações direto do Firebase por Server-Sent
Events nativos (sem instalar o SDK do Firebase, sem custo de bundle, e sem
polling, e a atualização chega na hora). Isso exige um projeto Firebase, que
só pode ser criado por quem tem acesso ao Google Cloud. Não pode ser feito
pelo Claude Code.

## 1. Criar (ou reaproveitar) o projeto e ativar o Realtime Database

1. Acesse o [console do Firebase](https://console.firebase.google.com/).
2. Se o projeto Google Cloud que você já usa para o Google Agenda
   (`ideiasteam`, ou o que você tiver criado) ainda não tem o Firebase
   ativado, clique em **Adicionar projeto** e selecione esse projeto
   existente em vez de criar um novo. Firebase e Google Cloud compartilham
   o mesmo projeto por baixo dos panos.
3. No menu lateral, vá em **Build → Realtime Database** e clique em
   **Criar banco de dados**. Escolha a região (`us-central1` é uma opção
   segura) e comece em **modo bloqueado** (vamos definir as regras abaixo).
4. Anote a **URL do banco** mostrada no topo da página (algo como
   `https://SEU-PROJETO-default-rtdb.firebaseio.com`).

## 2. Definir as regras de segurança

As regras vivem no arquivo [`firebase-room.rules.json`](../firebase-room.rules.json), na raiz do
repositório. Na aba **Regras** do Realtime Database, publique o conteúdo completo desse arquivo,
preservando quaisquer regras de outros produtos do mesmo projeto. Não copie versões antigas deste
guia: o arquivo é a única fonte.

- `/rooms/<código>` é a projeção pública da sala (participantes, pergunta atual e placar). Um
  navegador só **lê** enquanto `expiresAt` for um número no futuro, e ninguém escreve direto. Uma
  projeção sem `expiresAt` não é legível.
- `/private-rooms/<código>` guarda o estado completo (com o token do organizador e as respostas
  certas): ninguém lê nem escreve direto por aqui, nem autenticado.
- `/room-limits`, `/speech-audio`, `/room-recordings`, `/speech-rate-limit`,
  `/speech-generation-rate-limit`, `/notebook-collab` e `/notebook-views` guardam limites de
  pedidos, áudios temporários, gravações do professor e cadernos compartilhados. Leitura e escrita
  diretas são negadas, e cada nó tem `.indexOn: ["expiresAt"]`, que a limpeza automática usa para
  varrer o que venceu.
- `/users/<uid>` é a conta sincronizada: só o próprio usuário autenticado lê e escreve o que é
  dele (veja [`ACCOUNT_SYNC_SETUP.md`](ACCOUNT_SYNC_SETUP.md)).

O servidor (a função da Vercel) escreve nesses caminhos usando uma conta de serviço com privilégio
de administrador, que **ignora** as regras; por isso elas protegem os dados mesmo assim.

## 3. Criar a conta de serviço

1. No console do Firebase, vá em **Configurações do projeto → Contas de
   serviço**.
2. Clique em **Gerar nova chave privada** e confirme. Um arquivo `.json` é
   baixado. Guarde-o com cuidado, pois ele dá acesso total ao banco.
3. Abra o arquivo. Você vai precisar de dois campos dele:
   - `client_email`
   - `private_key`

## 4. Configurar as variáveis de ambiente na Vercel

No painel do projeto na Vercel (**Settings → Environment Variables**),
nunca num arquivo do repositório:

| Variável                | Valor                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_DATABASE_URL` | a URL anotada no passo 1                                                                                                      |
| `FIREBASE_CLIENT_EMAIL` | o campo `client_email` do arquivo baixado                                                                                     |
| `FIREBASE_PRIVATE_KEY`  | o campo `private_key` do arquivo baixado, colado como está (com os `\n` literais; o código já converte para quebras de linha) |

Depois de configurar, faça um novo deploy para as variáveis entrarem em
vigor.

## Como funciona por trás

- `POST /api/local-room?action=create`: o professor cria a sala; recebe um
  código de cinco letras, um token de organizador (guardado só no
  navegador dele) e a URL de streaming pública da sala.
- `POST /api/local-room?action=join`: cada aluno entra com o código e um
  nome de exibição, e recebe a mesma URL de streaming.
- `POST /api/local-room?action=resume`: depois de atualizar a página, a aba
  apresenta novamente a credencial temporária do organizador ou participante
  e recebe o estado atual sem criar uma nova entrada na sala.
- O navegador de cada participante conecta direto em
  `https://SEU-PROJETO-default-rtdb.firebaseio.com/rooms/<código>.json`
  usando `EventSource` (API nativa do navegador) e recebe cada atualização
  em tempo real, sem precisar perguntar de novo.
- `POST ?action=start` / `?action=next` / `?action=end`: só o organizador
  pode iniciar a rodada, avançar pergunta ou encerrar (validado pelo token).
- `POST ?action=kick` remove um participante (o removido sai sozinho da sala e vê o aviso) e
  `?action=lock` fecha ou reabre a entrada. Só o organizador pode, e com a entrada fechada o `join`
  responde 409. Remover não é banimento: sem conta, não há como impedir quem apaga os dados do
  navegador de voltar, e por isso existe o fechamento da entrada.
- Quando a sala termina, `expiresAt` é limitado a 30 minutos depois do encerramento
  (`ROOM_FINISHED_RETENTION_MS`), valendo para encerramento pelo anfitrião, pela ausência dele e
  pelo fim da atividade. A projeção pública deixa de ser legível nesse prazo, e a janela cobre a
  tela de resultados de quem já estava conectado.
- `POST ?action=answer`: cada aluno envia sua resposta; a correção é
  conferida no servidor (o baralho completo com as respostas certas fica só
  em `/private-rooms`, nunca é enviado para o navegador de ninguém).
- Na Escuta Coletiva, `start` agenda a primeira pergunta para três segundos
  depois. O cabeçalho `X-Room-Server-Time` ajuda o navegador a acompanhar esse
  horário; respostas antes dele são recusadas. A velocidade da voz é fixa em 1×.
- Antes da Escuta Coletiva, o professor grava no microfone ou envia um arquivo
  de até 256 KB por fala e informa a tradução. `POST /api/room-recording?action=upload`
  aceita somente o anfitrião no lobby. `?action=play` entrega a gravação da
  pergunta atual somente ao anfitrião ou participante da sala. Iniciar exige
  áudio em todas as falas. As gravações expiram com a sala em até quatro horas;
  não treinam modelos e não ficam salvas na conta para reutilização futura.
- `POST /api/speech` permanece para Quiz individual e Bingo. A Escuta Coletiva
  usa somente a gravação enviada pelo professor, sem MeloTTS ou voz do aparelho.
  Recarregue abas antigas antes de iniciar uma sala com gravações.

### Riscos considerados no áudio da sala

- Conhecer apenas o código público ou inventar um código não autoriza geração.
  O servidor lê a sala privada e compara a credencial temporária com as de
  anfitrião e participantes.
- Mesmo com uma credencial válida, não é permitido sintetizar texto arbitrário:
  só a pergunta atual de uma sala em andamento passa. Salas expiradas ou
  encerradas são recusadas.
- App Check e limites distribuídos reduzem abuso automatizado, mas a proteção
  forte depende da variável `FIREBASE_APPCHECK_ENFORCE=true` e da configuração
  correta no Firebase e na Vercel. Verifique essa ativação no ambiente real.
- A credencial transita apenas na requisição HTTPS e não é enviada ao provedor
  de voz, ao estado público ou aos registros operacionais. A voz individual
  continua exigindo consentimento próprio.

## Ativação da versão com concorrência, presença e bingo

A sala agora tem prazo absoluto de 4 horas. O código expira a sessão privada;
a leitura pública só fica protegida pela expiração após publicar as regras novas.
Para esta versão, publicar `firebase-room.rules.json` (passo 2), preservando quaisquer regras de
outros produtos.

1. Revisar/publicar a branch por PR, sem merge automático. Não misturar clientes antigos
   com credenciais de participante novas; pedir que salas antigas sejam recriadas.
2. Registrar aplicativo Web no Firebase appstudyoli e configurar reCAPTCHA Enterprise
   com os domínios reais, incluindo preview apenas se explicitamente autorizado.
3. Configurar `VITE_FIREBASE_APPCHECK_SITE_KEY`, `VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_APP_ID` e `FIREBASE_APP_ID`. As primeiras são públicas por natureza;
   nunca expor a chave privada de serviço em variável VITE_.
4. Verificar tokens válidos em preview antes de definir `FIREBASE_APPCHECK_ENFORCE=true`.
   Sem enforcement, o limitador de pedidos continua ativo, mas App Check não protege a API.
   App Check não substitui autenticação, código de convite ou limitação de tentativas.
5. Publicar regras/índices de `firebase-room.rules.json` após revisar migração. Elas negam
   leitura de projeções sem expiresAt. Inventariar e remover/migrar salas legadas de forma
   controlada; a rotina automática não apaga registros sem data de expiração.
6. Configurar `CRON_SECRET` privado forte na Vercel e publicar `vercel.json`. O cron roda
   diariamente às 04:00 UTC; a API exige Authorization Bearer. Reutiliza credenciais Firebase
   do servidor. Conferir logs `room_cleanup` e testar sem segredo (401) e com segredo.

O job processa até 10 lotes de 100 registros por caminho, respeitando orçamento global
de 45 segundos e timeout de 10 segundos por pedido, com ETag e rechecagem
para não apagar uma sala recriada. Leitura expirada é bloqueada antes da remoção física.
Em volume maior, ampliar frequência/capacidade e acompanhar backlog; o cron diário não
promete remoção imediata. `pendingPaths` na resposta/log indica caminhos que precisam
de nova execução, inclusive conflitos concorrentes. Regras, segredo e App Check não foram ativados por este código.

## Modelo de ameaça e operação

- Quem conhece o código pode ler nomes/placar e conteúdo público da atividade. Não usar nomes
  completos ou material confidencial. Bingo precisa expor palavras da cartela; o quiz não expõe
  versos privados. O material original do workspace não é alterado.
- IDs públicos não autorizam respostas. Tokens temporários ficam na aba; XSS ainda ameaça
  essas credenciais. Não registrar tokens, nomes, respostas ou IP bruto nos logs.
- Limites por IP confiável fornecido pela Vercel: 6 criações/minuto, 90 entradas/minuto,
  600 demais ações/minuto. O limite de entrada inclui códigos incorretos. Uma sala com 30 alunos
  atrás do mesmo roteador cabe nos limites; várias salas na mesma rede podem precisar ajuste.
- Heartbeat a cada 15 segundos e tolerância de 2 minutos acomodam interrupções curtas. O
  anfitrião ausente encerra na próxima interação; não há transferência de controle automática.
- Logs `action`, `status`, `durationMs` permitem contar join/leave/resume e falhas; não existe
  dashboard ou telemetria de abandono físico instantâneo. Alertas e retenção ainda dependem da operação.
- Testes automatizados usam handler real com armazenamento/transporte de teste. Antes de
  produção validar Firebase real, Safari em aparelho físico, retorno após bloquear o telefone e 30 dispositivos.
  Chromium/WebKit automatizados passaram no CI da PR #98 em 12/09/2026.
