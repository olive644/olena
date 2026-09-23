# Login e sincronização entre dispositivos

O OlenaStudy usa Firebase Authentication com Google e Firebase Realtime Database. O navegador mantém uma cópia local para funcionar sem internet; depois do login, a mesma conta replica o workspace, tema, perfil, onboarding e progresso entre computador e celular.

## Configuração

1. No Firebase Console, crie ou reutilize o projeto do Modo Sala.
2. Em Authentication, ative o provedor Google e informe o e-mail de suporte.
3. Em Authentication > Settings > Authorized domains, adicione o domínio de produção e os domínios de preview necessários.
4. Crie um aplicativo Web e copie `apiKey`, `authDomain` e `projectId` para as variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` e `VITE_FIREBASE_PROJECT_ID` da Vercel.
5. Defina `VITE_FIREBASE_DATABASE_URL` quando a URL do Realtime Database não for a padrão derivada do projeto.
6. Publique `firebase-room.rules.json`. A regra `users/$uid` restringe cada conta ao próprio conteúdo.

As variáveis `VITE_` identificam o projeto Firebase e são públicas por definição. A proteção dos dados depende da autenticação e das regras publicadas, não de esconder essas chaves. Nunca exponha `FIREBASE_PRIVATE_KEY` ou outros segredos do servidor com o prefixo `VITE_`.

## Comportamento

- A primeira conta sem dados recebe o conteúdo local do dispositivo.
- Quando a conta já tem dados, a nuvem é a fonte inicial naquele dispositivo.
- Mudanças locais são enviadas após uma pausa curta e os outros dispositivos consultam atualizações periodicamente.
- Se a rede falhar, a cópia local continua funcionando e o envio permanece pendente para nova tentativa automática ou manual.
- O Perfil mostra o estado da sincronização, permite sincronizar agora e sair da conta.
