# OlenaStudy na Google Play (app Android por TWA)

## Estado em 2026-11-06

O repositório está preparado para empacotar o site como app Android, mas **nenhum app foi gerado,
assinado ou enviado**. O app é uma TWA (Trusted Web Activity): o Android abre o próprio
olenastudy.vercel.app em tela cheia, sem a barra do navegador, desde que o site e o app provem ser do
mesmo dono. Não há segunda base de código: o que se publica no site chega ao app sem nova versão da
loja (só mudanças no empacotamento exigem uma nova).

Feito no repositório:

- `public/manifest.webmanifest` e a ligação no `index.html`.
- Ícones em `public/android/` (192 e 512 px, mais um 512 px "mascarável" com o desenho dentro da zona
  segura de 80 %) e o ícone da loja em `android/store/play-store-icon-512.png`. Gerados por
  `node scripts/android/render-android-icons.mjs` a partir da arte amarela aprovada em `android/store/play-store-icon-512.png`.
- `android/twa-manifest.json`: configuração para o Bubblewrap, com o pacote `olenastudy.app`, o mesmo
  do app já criado no Play Console.
- `scripts/android/make-assetlinks.mjs`: gera `public/.well-known/assetlinks.json` a partir de impressões
  digitais reais (uma impressão errada faz a verificação falhar sem avisar).
- Em 2026-11-07 o arquivo foi publicado com duas impressões digitais (SHA-256) do pacote `olenastudy.app`:
  a da **chave de assinatura do app da Play** (`E8:69:A2:89:BB:4B:F6:3E:74:FD:30:14:F3:35:4D:37:A5:69:CD:03:C9:08:F3:E7:DB:19:66:0F:A3:F6:B5:07`,
  copiada por quem administra a Play Console), que vale no app instalado pela loja, e a da **chave de envio**
  (`E0:42:9B:A6:DA:85:49:55:29:13:BB:23:2D:06:4D:AC:A5:FB:6F:0E:CB:D7:A0:E8:07:01:1C:D0:FF:77:B3:A0`,
  lida do certificado do .aab que a Console aceitou; SHA-1 `CC:CE:04:CA:...`, o mesmo que a Console exige),
  que vale num APK instalado direto e assinado com ela. Um APK do pacote antigo `app.vercel.olenastudy.twa`
  nunca abre sem barra.
- Cabeçalhos de `Content-Type` do manifesto e do assetlinks em `vercel.json`, `.gitignore` para
  `*.keystore`, `*.jks` e a saída do build, e `src/android-twa.test.ts` cobrindo tudo isso.

Não foi feito: service worker (modo offline). A TWA não o exige, e um cache mal feito poderia servir
estado antigo do aluno, o que o projeto proíbe. Se um dia houver modo offline, será uma mudança própria.

## Mudança para o domínio olenastudy.com.br, 2026-11-11

- `android/twa-manifest.json` passa a usar `www.olenastudy.com.br` (host, ícones, manifesto e escopo) e
  `appVersion` 2 / `appVersionName` 1.0.1, porque a Play exige código de versão maior a cada envio.
  O teste confere que todos os endereços do pacote ficam no mesmo domínio.
- `public/.well-known/assetlinks.json` não muda: o mesmo arquivo é servido pelos dois domínios na mesma
  publicação, e o pacote e as impressões digitais continuam os mesmos (a chave de assinatura do app não
  depende do domínio). A associação é verificada por domínio, então só vale no novo depois da publicação
  deste deploy. Conferir em
  `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.olenastudy.com.br&relation=delegate_permission/common.handle_all_urls`.
- Passos da proprietária, fora do repositório: gerar um novo .aab com este manifesto (PWABuilder ou
  Bubblewrap, com a MESMA chave de envio), enviá-lo, atualizar na Play Console o site e a política de
  privacidade para `https://www.olenastudy.com.br/politica-de-privacidade.html`, testar num aparelho
  e só depois, quando o app novo estiver com a maioria dos aparelhos, redirecionar
  `olenastudy.vercel.app` para o domínio novo na Vercel. Redirecionar antes faz o app antigo (host
  antigo) abrir com a barra do navegador ou falhar na verificação.
- Não verificado: nada disso foi testado em aparelho Android; a verificação do assetlinks no domínio
  novo depende do deploy e deve ser conferida pelo endereço acima.

## Passos da proprietária (fora do repositório)

1. **Nome do pacote: `olenastudy.app`.** É o do app que já existe no Play Console (conferido na lista de
   apps em 2026-11-06) e não muda mais. `android/twa-manifest.json` usa o mesmo valor, e
   `scripts/android/make-assetlinks.mjs` o lê de lá; o teste confere o formato.
2. **Gerar o pacote Android (.aab).** Duas opções, a primeira é a mais simples:
   - PWABuilder (pwabuilder.com): informe `https://olenastudy.vercel.app`, escolha Android e o
     pacote da etapa 1. Ele gera o .aab e as instruções de assinatura.
   - Bubblewrap (linha de comando, exige JDK 17 e o Android SDK; ele oferece instalá-los):
     `npm i -g @bubblewrap/cli`, depois numa pasta fora do Git
     `bubblewrap init --manifest=https://olenastudy.vercel.app/manifest.webmanifest` e
     `bubblewrap build`. O arquivo `android/twa-manifest.json` serve de referência para as respostas.
     Em ambos, a **chave de assinatura é sua**: guarde o arquivo `.keystore` e as senhas fora do
     repositório e com cópia segura. Quem perde a chave de envio precisa pedir redefinição ao Google.
3. **Ligar a Assinatura de apps do Play.** Envie o .aab. Com a Play App Signing, o Google reassina o
   app com outra chave. Em Teste e lançamento > Integridade do app > Assinatura de apps, copie o
   "Certificado da chave de assinatura do app" (SHA-256).
4. **Publicar o assetlinks.** Com a impressão digital da etapa 3:
   `node scripts/android/make-assetlinks.mjs --fingerprint AA:BB:...` (repita `--fingerprint` para a
   chave de envio, se for instalar builds assinados com ela). Faça um PR com o arquivo gerado e,
   depois do deploy, confira em
   `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://olenastudy.vercel.app&relation=delegate_permission/common.handle_all_urls`
   que o pacote e a impressão aparecem. Sem isso o app abre com a barra do navegador por cima.
5. **Preencher as declarações do Play Console.** Os docs do projeto são a fonte das respostas:
   - Política de privacidade: `https://olenastudy.vercel.app/politica-de-privacidade.html`.
   - Segurança dos dados: conta (Google, Discord, e-mail e senha), progresso e agenda sincronizados,
     chat com a Olena, suporte. Conferir `docs/AUTHENTICATION.md` e a política de privacidade.
   - Classificação de conteúdo e público-alvo. Incluir menores de 13 anos muda bastante as regras
     (política para famílias); decidir antes.
   - App gratuito. A Play não permite trocar um app gratuito por pago depois; planos pagos seriam
     assinaturas ou compras dentro do app, que têm regras próprias de cobrança do Google.
6. **Teste fechado.** Pelo que se sabe, contas pessoais novas precisam de um teste fechado com 12
   testadores por 14 dias seguidos antes da produção. Conferir o valor atual na Console.

## O que testar num aparelho real (não verificado)

Nada abaixo foi testado: não houve aparelho Android nem Bubblewrap nesta mudança.

- Abertura sem barra do navegador (prova de que o assetlinks funciona).
- Login com Google (o código usa janela pop-up do Firebase) e login com Discord (redirecionamento
  com cookie `__Host-`). A TWA roda no Chrome, não numa WebView, mas só um teste confirma.
- Botão voltar do Android, rotação de tela, teclado e escrita à mão na folha.
- Sala em tempo real e o leitor de QR (a câmera é liberada só para o próprio site no
  `Permissions-Policy`).
- Notificações do Pomodoro: `enableNotifications` está desligado na configuração, então a TWA não
  pede essa permissão; o site continua usando as notificações do navegador, se o Chrome as permitir.

## Riscos

- A política de "funcionalidade mínima" do Google pode recusar um app que seja só um atalho para o
  site. Não foi verificado como ela é aplicada hoje; o app tem muitas funções próprias, mas a decisão
  é do Google.
- O nome do pacote e a chave de assinatura são permanentes.
- Cada mudança de ícone ou de cor do tema exige regenerar o pacote para aparecer no aparelho.

## Como atualizar

Ícones: atualize a arte Android de 512 px e rode `node scripts/android/render-android-icons.mjs`. Após o deploy, regenere os recursos Android e gere um novo APK/AAB com a assinatura do app para atualizar o ícone do pacote instalado. Cores ou
nome: altere `public/manifest.webmanifest` e `android/twa-manifest.json` juntos (o teste confere que
combinam). Para publicar uma nova versão do app, aumente `appVersion` e `appVersionName` no
`twa-manifest.json` e gere um novo .aab.
