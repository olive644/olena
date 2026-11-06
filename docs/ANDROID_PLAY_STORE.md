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
  `node scripts/android/render-android-icons.mjs` a partir de `public/olena-favicon.png`.
- `android/twa-manifest.json`: configuração para o Bubblewrap, com o pacote **provisório**
  `app.olenastudy`.
- `scripts/android/make-assetlinks.mjs`: gera `public/.well-known/assetlinks.json` quando houver a
  impressão digital real. O arquivo **não está commitado de propósito**: uma impressão errada faz a
  verificação falhar sem avisar.
- Cabeçalhos de `Content-Type` do manifesto e do assetlinks em `vercel.json`, `.gitignore` para
  `*.keystore`, `*.jks` e a saída do build, e `src/android-twa.test.ts` cobrindo tudo isso.

Não foi feito: service worker (modo offline). A TWA não o exige, e um cache mal feito poderia servir
estado antigo do aluno, o que o projeto proíbe. Se um dia houver modo offline, será uma mudança própria.

## Passos da proprietária (fora do repositório)

1. **Decidir o nome do pacote.** Ele não muda depois de criado no Play Console. O valor provisório é
   `app.olenastudy`; se houver domínio próprio, prefira o dele invertido. Para trocar, edite
   `packageId` em `android/twa-manifest.json` (o teste confere o formato) e use o mesmo nome no
   formulário "Criar app". Conferir a disponibilidade com o botão "Ver disponibilidade".
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

Ícones: rode `node scripts/android/render-android-icons.mjs` depois de mudar o mascote. Cores ou
nome: altere `public/manifest.webmanifest` e `android/twa-manifest.json` juntos (o teste confere que
combinam). Para publicar uma nova versão do app, aumente `appVersion` e `appVersionName` no
`twa-manifest.json` e gere um novo .aab.
