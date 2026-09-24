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

O convite para edição exige login Google. A função `/api/notebook-collab` valida o ID token com as chaves públicas do Firebase; `VITE_FIREBASE_PROJECT_ID` também precisa estar disponível no ambiente da função na Vercel. O nome da equipe vem da conta autenticada e o avatar escolhido é sincronizado em `helena.profile.v1`. O link de visualização continua acessível sem login e não permite editar.

O estado principal da conta prevalece sobre um backup local antigo no login. Só alterações feitas durante a busca inicial são preservadas por cima da nuvem. A sequência de Pomodoro também sincroniza; dados antigos do dispositivo são migrados quando essa chave ainda não existe na conta. Rascunhos manuscritos locais, histórico e cópias de conflito continuam como recuperação local. A edição colaborativa é uma sala temporária de uma folha, não um arquivo permanente salvo automaticamente na biblioteca de todos os convidados.
