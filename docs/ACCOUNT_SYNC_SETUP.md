# Login e sincronização entre dispositivos

O OlenaStudy usa Firebase Authentication com Google e Firebase Realtime Database. O navegador mantém uma cópia local para funcionar sem internet; depois do login, a mesma conta replica o workspace, tema, perfil, onboarding e progresso entre computador e celular.

## Configuração

1. No Firebase Console, crie ou reutilize o projeto do Modo Sala.
2. Em Authentication, ative o provedor Google e informe o e-mail de suporte.
3. Em Authentication > Settings > Authorized domains, adicione o domínio de produção e os domínios de preview necessários.
4. Crie um aplicativo Web e copie `apiKey`, `authDomain` e `projectId` para as variáveis `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN` e `VITE_FIREBASE_PROJECT_ID` da Vercel.
5. Defina `VITE_FIREBASE_DATABASE_URL` quando a URL do Realtime Database não for a padrão derivada do projeto.
6. Leia e faça backup das regras publicadas. Acrescente a validação `users/$uid/stateV2` de `firebase-room.rules.json`, preservando todos os demais caminhos e permissões atuais. Não substitua regras de produção pelo arquivo completo sem conferir as diferenças e autorizar mudanças adicionais. A regra `users/$uid` continua restringindo cada conta ao próprio conteúdo. Esta publicação é necessária antes de usar a nova sincronização.

As variáveis `VITE_` identificam o projeto Firebase e são públicas por definição. A proteção dos dados depende da autenticação e das regras publicadas, não de esconder essas chaves. Nunca exponha `FIREBASE_PRIVATE_KEY` ou outros segredos do servidor com o prefixo `VITE_`.

## Comportamento

- A primeira conta sem dados recebe o conteúdo local do dispositivo.
- Quando a conta já tem dados, a nuvem é a fonte inicial naquele dispositivo.
- Mudanças são enviadas após uma pausa curta e recebidas por stream autenticado que escuta só o carimbo `updatedAt` e baixa o estado quando ele muda. O envio é um PATCH só das chaves alteradas. Sessões de Foco publicam controles e snapshots a cada 30 segundos, mantendo recuperação local mais frequente.
- Se a rede falhar, a cópia local continua funcionando e o envio permanece pendente para nova tentativa automática ou manual.
- O Perfil mostra o estado da sincronização, permite sincronizar agora e sair da conta.

O convite para edição exige login Google. A função `/api/notebook-collab` valida o ID token com as chaves públicas do Firebase; `VITE_FIREBASE_PROJECT_ID` também precisa estar disponível no ambiente da função na Vercel. O nome da equipe vem da conta autenticada e o avatar escolhido é sincronizado em `helena.profile.v1`. O link de visualização continua acessível sem login e não permite editar.

O estado principal da conta prevalece sobre um backup antigo para itens mutáveis. Registros concluídos de Foco são aditivos por ID e dias de Pomodoro são unidos; cópias antigas não removem minutos. Mudanças durante a busca inicial são mescladas. A sessão ativa mais recente sincroniza e aparece pausada em outro aparelho até ação explícita. Rascunhos manuscritos, histórico e cópias de conflito continuam como recuperação. Edição colaborativa continua uma sala temporária, não um arquivo permanente na biblioteca.

## Formato de transporte e implantação segura

Em 2026-10-14, somente a validação de stateV2 foi ampliada e publicada para
preservar `items/k_aGVsZW5hLm1hdGhHYW1lLnY1` (helena.mathGame.v5). Quando a
chave já existe, uma substituição não pode omiti-la. Isso impede que abas antigas
apaguem o progresso novo ao enviar seu conjunto menor de chaves. A autorização
continua privada ao dono. A guarda não bloqueia exclusão integral da conta nem
valida semanticamente o conteúdo da chave. Abas antigas devem recarregar para
voltar a salvar após a primeira gravação v5. A regra publicada foi relida e
comparada integralmente ao candidato, preservando todos os outros caminhos.
Backup local: output/firebase-math-finals/before.rules.json, fora do Git.
Publicar essa guarda antes do cliente; rollback conserva a chave e o transporte
v5. Não remover a guarda ou voltar a escritor que omite v5 sem procedimento
explícito de backup e autorização. Teste entre contas/dispositivos reais continua
sendo uma validação de produção distinta dos testes automatizados locais.

Em 2026-10-12, a validação stateV2 foi publicada no projeto appstudyoli e relida
com sucesso. Comparação estrutural comprovou que os demais caminhos não mudaram.
Isso prepara o banco, mas não substitui a implantação do cliente atualizado nem
a validação de sincronização pela conta em produção.

Nomes de localStorage têm pontos, proibidos como nomes de filhos no Realtime
Database. O transporte usa chaves base64url com prefixo `k_`, mantendo os valores
textuais e os nomes locais inalterados. A validação existente do serviço não pode
ser substituída por uma expressão de Security Rules que aceite pontos:
[limites oficiais do Firebase](https://firebase.google.com/docs/database/usage/limits).

O formato v2 é gravado em `users/{uid}/stateV2`, nunca sobre `state`. Assim, abas
antigas não recebem chaves que desconhecem e não apagam seu cache por interpretá-las
como ausência de dados. Se v2 estiver vazio, o cliente novo lê `state` uma vez e
copia o estado validado para v2. O nó legado não é apagado nem modificado. Leitura
aceita nomes locais legados e nomes codificados; escrita usa somente os codificados.

Ordem: publicar as regras expandidas, implantar o cliente novo, atualizar as abas
dos dispositivos e conferir o estado sincronizado no Perfil. Sem a regra nova,
gravação v2 falha e alterações continuam pendentes, sem falsa confirmação de nuvem.
Rollback de interface deve preservar o leitor/escritor v2; clientes antigos seguem
no nó legado e não passam a receber atualizações v2. Não remover o nó antigo ou
converter dados de volta sem um procedimento explícito de backup e migração.

## Convidado

A tela de login também oferece "Entrar como convidado". O convidado se chama Guest, não tem conta nem sincronização e guarda tudo somente neste aparelho (chave local `helena.guest.v1`, que não é sincronizada). Ao entrar com Google depois, a marca some e o conteúdo local segue a regra de primeira conta: sobe para a nuvem se a conta ainda estiver vazia. O convite de edição de caderno continua exigindo login Google.

No Modo Sala o convidado vê o campo "Seu apelido na sala", que começa em Guest. O apelido fica só neste aparelho (chave `helena.guest-nickname.v1`, também fora das chaves sincronizadas), vale apenas ali e some quando a pessoa entra com Google.

## Regras endurecidas em 2026-10-17 (publicar antes do próximo deploy de sincronização)

`firebase-room.rules.json` agora limita `users/$uid`: só as 17 chaves de `SYNCED_STORAGE_KEYS` (nomes brutos em `state`, nomes codificados em `stateV2`) são aceitas, cada item tem no máximo 5 milhões de caracteres (20 milhões só na folha de trabalho `helenastudy.workspace.v1`) e contas anônimas não escrevem. O teste `src/firebase-user-rules.test.ts` falha se uma chave nova for adicionada a `SYNCED_STORAGE_KEYS` sem atualizar as regras, então publique as regras junto com qualquer chave nova. Leia e faça backup das regras publicadas antes de publicar; esta mudança só estreita permissões.

## Regras endurecidas em 2026-10-18 (pentest): publicar junto com o deploy

Duas mudanças em `users/$uid`, ambas em `firebase-room.rules.json`:

1. **`state` (formato legado) fica somente para leitura.** O aplicativo só lê dele para migrar para `stateV2` e nunca grava lá (a migração chegou em 12/10/2026). Antes, as duas árvores aceitavam até 100 milhões de caracteres cada por conta. Quem ainda tem uma aba antiga aberta deixa de sincronizar até recarregar a página. Os dados antigos continuam legíveis, e a exclusão da conta continua funcionando.
2. **Teto somado dos itens que não são a folha de trabalho.** Além do limite de 5 milhões por item, a soma dos 16 itens fora de `helenastudy.workspace.v1` não pode passar de 8 milhões de caracteres. O navegador guarda cerca de 5 milhões de caracteres por site, então nenhum uso legítimo chega perto. Com isso uma conta ocupa no máximo cerca de 28 milhões de caracteres, e não mais cerca de 200 milhões.

**Como publicar e conferir (ação da dona, não é feita por código).** Cole o conteúdo de `firebase-room.rules.json` em Realtime Database, Regras, clique em Publicar e use o Simulador de regras com um usuário autenticado real (o UID precisa ser o mesmo do caminho):

- `PUT /users/<uid>/stateV2` com `version: 2`, `updatedAt` numérico e `items` com `k_aGVsZW5hLm1hdGhHYW1lLnY1` (o item de matemática v5) e `k_aGVsZW5hc3R1ZHkudGhlbWU` com texto curto: deve ser **permitido**.
- `PUT /users/<uid>/state` com `version: 1`, `updatedAt` numérico e `items` com `helenastudy.theme`: deve ser **negado**.
- `GET /users/<uid>/state`: continua **permitido**.

Não dá para testar o teto de 8 milhões no simulador (o texto seria enorme). Ele é coberto por `src/firebase-user-rules.test.ts`, que avalia a expressão publicada.
