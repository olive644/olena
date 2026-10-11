# Notificações de atualização

O sino fica antes da aparência no cabeçalho compartilhado. Usa papel recortado,
badge vermelho de não lidas, teclado, Escape e fechamento por clique externo.
Abrir não marca automaticamente como lido. O comando Marcar como lidas é explícito.

## Publicação

O build da Vercel roda `npm run build && node scripts/generate-system-updates.mjs`.
O script consulta os metadados públicos de `olive644/olena` no GitHub, sem token,
material do aluno ou serviço pago. Só inclui PRs mescladas na main desde a #408,
até a revisão daquele build, nunca PRs abertas ou fechadas sem merge. A versão
`beta.<número da PR>` identifica a publicação beta, não um número semântico de release.
O feed contém as últimas 50 dessas PRs entre as 100 PRs fechadas consultadas.

`dist/system-updates.json` só chega ao usuário quando o deploy correspondente é
publicado. Se a API falhar, permanece o manifesto conhecido de `public`, com aviso
no build. Não inventa uma versão ou uma notificação. Nesse caso, o feed pode ficar
desatualizado até um build bem-sucedido; um redeploy refaz a consulta.

O navegador consulta somente `/system-updates.json`, ao montar o cabeçalho, ao
voltar à janela e a cada cinco minutos. Não acessa o GitHub nem dá permissão para
reload forçado. Sem conexão, informa a indisponibilidade e mantém o conteúdo já lido.
O sino é carregado sob demanda, sem dependência nova.

## Leitura e sincronização

`helena.systemUpdates.read.v1` contém IDs de PR lidas, únicos, positivos, até 200.
`writeSyncedStorage` agenda a mesma sincronização de conta existente. Leitores
recebem mudanças por storage e eventos de aplicação/salvamento da nuvem.
O merge combina os IDs de referência, local e remoto, sem conflito por leituras
simultâneas. O login também combina leituras locais com a resposta do servidor.
Ausência da nova chave em snapshots antigos não remove leituras conhecidas no merge.
Dados inválidos não criam leituras. Sair ou trocar a conta limpa a chave pelo prefixo
pessoal existente, para não transportar leituras de outra pessoa.

Sem login ou sem rede, leitura fica no dispositivo e a sincronização existente
retoma quando disponível. Não há mudança no workspace, regras de acesso Firebase
ou necessidade de migrar/excluir dados. Rollback pode ignorar a nova chave.

## Verificação

- `node --test scripts/generate-system-updates.test.js` (também no CI).
- `npx vitest run src/data/system-updates.test.ts src/components/system-updates.test.tsx src/hooks/use-cloud-sync.test.tsx`.
- `npx playwright test e2e/agenda.spec.ts`.
- `npm run verify`.
