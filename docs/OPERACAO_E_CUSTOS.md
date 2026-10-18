# Operação, custos e segurança: estado e decisões

Este documento reúne o que foi apurado e decidido em 17 e 18 de outubro de 2026 sobre segurança, custos de infraestrutura e visibilidade do repositório. É escrito para quem assumir o projeto depois, pessoa ou IA, e separa o que foi **verificado** do que **não foi**. Para o custo do CI, veja `docs/CI_MINUTOS.md`. As decisões detalhadas estão em `docs/CURRENT_STATE_AUDIT.md`.

## Como usar este documento

- Se for propor uma mudança de infraestrutura, confira primeiro se o raciocínio já está aqui.
- Números de preço e limites de terceiros mudam. Os marcados "não verificado" vieram de sites de comparação ou de memória, e devem ser conferidos na página oficial antes de uma decisão.
- Ações que mudam algo fora do repositório (publicar regras do Firebase, ligar variáveis na Vercel, tornar o repositório privado, pagar plano) são da dona do projeto. Uma IA descreve o passo e confere o resultado, mas não faz sozinha.

## 1. Auditoria de segurança (PRs #464, #465, #466)

Todas mescladas na `main` em 17/10/2026. Falta a dona publicar as regras do Firebase (item 1.2).

| Item                                   | Onde                                                      | O que mudou                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Link de leitura do caderno anônimo     | `notebook-collab-handler.ts`, `notebook-file-actions.tsx` | `view-create` exige conta não anônima, tem cota por conta (5 por hora, 10 por dia) e global (300 por dia) e confere a assinatura real de PNG, JPEG ou WebP. Sem login, a interface orienta a entrar |
| Escrita ilimitada em `users/$uid`      | `firebase-room.rules.json`                                | só as 17 chaves de `SYNCED_STORAGE_KEYS`, itens de até 5 milhões de caracteres (20 milhões só na folha de trabalho), sem escrita de contas anônimas, `$other: false`                                |
| Voz individual sem teto global         | `api/speech.ts`, `speech-quota.ts`                        | 30 por minuto e 600 por dia por endereço, 6.000 por dia no total. O guarda das salas vale também para a voz individual                                                                              |
| IPv6 contornava limites                | `client-address.ts`                                       | endereços IPv6 agrupados pelo prefixo /64                                                                                                                                                           |
| Helena aceitava conta anônima          | `helena-runtime.ts`                                       | recusa token anônimo antes de gastar cota                                                                                                                                                           |
| Código de sala derivado do `requestId` | `local-room-handler.ts`                                   | código sempre aleatório. A repetição de um pedido volta à mesma sala por um registro em `room-limits/create-<hash>`                                                                                 |
| Corpo de pedido sem teto               | `vercel-adapter.ts`                                       | recusa acima de 4,5 MB (413) sem acumular tudo na memória                                                                                                                                           |
| App Check não exigido                  | `room-guard.ts`                                           | avisa uma vez por instância (`app_check_not_enforced`) quando `FIREBASE_APPCHECK_ENFORCE` não é `true`                                                                                              |

### 1.1 O que ficou em aberto

- **`FIREBASE_APPCHECK_ENFORCE`.** Sem o valor `true` na Vercel, o App Check só registra e não bloqueia. O valor atual na Vercel não foi lido. Ligar sem tokens válidos derruba salas, voz e links de leitura (403). Antes de ligar, veja nos logs da Vercel os eventos `room_protection` e confirme que quase tudo é `valid`. Variáveis necessárias: `VITE_FIREBASE_APPCHECK_SITE_KEY`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID` (cliente) e `FIREBASE_APP_ID` (servidor).
- **Código de sala com 5 caracteres** (cerca de 33 milhões de combinações). Aumentar mexe em campos, links e telas. Adivinhar uma sala exige passar por `join`, limitado a 90 por minuto por endereço.
- **Limites de voz** (600 por dia por endereço, 6.000 por dia no total) são estimativas. Ajuste em `speech-quota.ts` conforme o custo real no Cloudflare.
- **Criação de link com conta real** só tem cobertura de teste unitário. O e2e cobre o visitante e a leitura pública.

### 1.2 Publicar as regras do Firebase (passo manual da dona)

As regras só valem depois de publicadas no console. O arquivo de referência é `firebase-room.rules.json` na `main`. As regras que estavam publicadas antes eram **mais frouxas** que as do repositório: não tinham `$other: false` em `users/$uid`, nem o bloco `state` legado, nem a restrição de chaves e tamanho.

1. Console do Firebase, Realtime Database, aba Regras. **Copie as regras atuais para um arquivo seu** (backup).
2. Cole o conteúdo de `firebase-room.rules.json` e publique. Os `\\.` com duas barras são intencionais (JSON). Os apóstrofos precisam ser retos.
3. No Laboratório de testes de regras, ative "Autenticado", escolha o provedor e informe o UID da conta (o UID não é o e-mail: fica em Authentication, aba Usuários). Use "Executar" (simula, não grava). Esperado:
   - leitura de `/users/<uid>/stateV2` com o próprio UID: permitida;
   - escrita de `/users/<uid>/stateV2` com `{"version":2,"updatedAt":1,"items":{"k_aGVsZW5hc3R1ZHkudGhlbWU":"dark","k_aGVsZW5hLm1hdGhHYW1lLnY1":"x"}}`: permitida (o dado precisa incluir a chave do jogo de matemática, porque a regra existente recusa um `stateV2` que a omita quando ela já existe);
   - escrita em `/users/<uid>/qualquercoisa`: negada na linha do `$other`;
   - escrita em `/users/<outro-uid>/stateV2`: negada;
   - escrita com provedor `anonymous`: negada na linha do `.write`.
4. Confira que `"auth"` mostra o UID e não `null`. Com `null` o teste não vale.
5. Teste no app com uma conta real: mude o tema e veja sincronizar em outro aparelho. Se falhar, restaure o backup.
6. Estado em 17/10/2026: a dona publicou e os testes de leitura, de nó inventado, de anônimo e de escrita normal passaram. O teste de outro UID foi opcional e não foi feito.

Ao adicionar uma chave nova a `SYNCED_STORAGE_KEYS`, as regras precisam ser atualizadas e publicadas junto (há teste que falha se não forem).

## 2. Consumo do Realtime Database (plano gratuito)

- **Medido no console** (1 a 17 de outubro): 25,47 GB de download contra um limite gratuito de cerca de 10 GB por mês, 2,41 MB armazenados, 24 conexões de 100, 18 mil permissões e 102 negações de regras. O armazenamento não é o problema. O excesso é download.
- **Consequência segundo a documentação do Firebase:** estourar um limite no plano gratuito desliga o app até o próximo ciclo de cobrança, ou até migrar para o plano Blaze (pago por uso). O ciclo vai de 1º a 1º do mês. O prazo exato aparecia cortado no aviso do console e não foi lido.
- **Causa provável** (leitura do código, não medida): cada salvamento da conta baixava o estado inteiro três vezes (o `GET` de conferência, o eco do `PUT` e o evento do stream em tempo real). O salvamento disparava 350 ms depois de qualquer mudança, e o cronômetro de Foco publica a cada 30 s.
- **O que foi feito (#468):** `PUT` com `print=silent` e intervalo de envio de 4 s, com envio imediato ao esconder a página. Efeito esperado, não medido.
- **Como medir o efeito:** aba Uso do Realtime Database nos dias seguintes. A CLI `firebase database:profile` mostra o consumo por caminho.
- **Próximo passo se continuar alto:** enviar só as chaves alteradas (PATCH) e tratar os eventos `patch` do stream, ou escrita condicional por ETag, em vez de reescrever o estado inteiro. Mexe no mecanismo de conflito: exige teste com o Firebase real e cuidado para não sobrescrever registros concluídos por cópias antigas.
- **Custo do Blaze** (não verificado, conferir na página oficial): cerca de US$ 1 por GB de download acima do limite gratuito. O excesso deste mês daria algo perto de US$ 15. Se pagar, configure alerta de orçamento no Google Cloud antes.

## 3. Trocar de banco de dados

**Decisão: não migrar agora.** Razões:

1. Trocar de provedor não corrige o hábito de baixar o estado inteiro a cada salvamento. Em qualquer plano gratuito isso estoura o limite.
2. O app depende de tempo real (salas e sincronização usam o stream do Firebase). Postgres e MySQL puros não têm isso. Seria preciso acrescentar outro serviço de tempo real.
3. O banco é usado em muitos pontos (sincronização da conta, salas, limites, cache de voz, gravações, links de leitura, 11 endpoints e as regras). Migrar são semanas, com risco de perder dados.

Referências verificadas em páginas oficiais do Supabase em 17/10/2026: plano gratuito com 500 MB de banco, 5 GB de egress sem cache e 5 GB com cache por mês (sem cobrança de excedente: o uso é restrito), pausa por inatividade após 7 dias, 2 projetos. O limite de tráfego é a metade do do Firebase. MySQL, Neon e Azure não foram verificados: o PlanetScale acabou com o plano gratuito em 2024 (de memória), e o Azure exige cartão e é fácil de gerar cobrança sem querer. Se um dia for preciso migrar, Postgres (Supabase ou Neon) é a escolha geral mais razoável, mas isso é palpite.

## 4. Visibilidade do repositório

- **Estado verificado em 18/10/2026:** `olive644/olena` é **público**, com 1 fork (de um dev do projeto) e 2 estrelas. Tem `LICENSE` e `SECURITY.md`. O `package.json` diz `UNLICENSED`.
- **Decisão recomendada: privado**, porque o app terá planos pagos e o código público permite que alguém copie a interface e hospede uma versão concorrente. Tornar privado é decisão e ação da dona (Settings, General, Danger Zone, Change visibility).
- **O que privado não resolve:** o código que roda no navegador ou no app já é público para quem usa. Regras de plano e de recurso pago têm de ser verificadas no servidor, com conta e limites, nunca só na tela. O que já foi público pode ter sido copiado.
- **Antes de privar:** adicione o segundo dev como colaborador (Settings, Collaborators), porque quem não for colaborador perde o acesso à versão original. Pelo que se sabe, forks públicos existentes continuam como cópias separadas depois de privar (não verificado).
- **Custos de privar** (conferir): o teto mensal de minutos do GitHub Actions (ver `docs/CI_MINUTOS.md`), CodeQL e varredura nativa de segredos que em privado costumam exigir plano pago (o `gitleaks` do CI continua funcionando), e a Vercel, cujo plano gratuito (Hobby), pelo que se sabe, não permite uso comercial (não verificado).
- **Se ficasse público:** criptografar ou ofuscar o código não funciona (quebra CodeQL, Dependabot, diffs e o build da Vercel, e o cliente já é público). O que protege é: nenhum segredo no repositório, lógica que vale dinheiro no servidor, conteúdo sensível fora do repositório, licença (protege no papel) e, se necessário, dividir em um repositório público e outro privado. Um levantamento do que seria problema se ficasse público (prompts, dados de treino, regras de planos) pode ser feito sem alterar nada.

### 4.1 Contrato societário

`docs/CONTRATO_SOCIETARIO.md` estava versionado em repositório público. Foi removido da árvore atual na #471 e o caminho está no `.gitignore`. O conteúdo **continua no histórico do Git** e em forks. A dona guardou uma cópia fora do repositório. Reescrever o histórico para apagá-lo só vale a pena se o conteúdo for muito grave, altera todas as branches e PRs e exige decisão explícita. Nenhuma IA leu o arquivo (regra do projeto).

## 5. Falso positivo do gitleaks

O `.gitleaksignore` contém a impressão digital `ee79bb7…:firebase-room.rules.json:generic-api-key:41`. O gitleaks tomou a lista de nomes de chave em base64 das regras por uma chave de API. Não é segredo (os nomes saem de `SYNCED_STORAGE_KEYS`). O gitleaks varre todo o histórico, então a entrada depende de o commit `ee79bb7` continuar alcançável: por isso as PRs desta série foram mescladas com commit de mesclagem, **sem squash**. Com squash, o commit mudaria e o achado voltaria na `main`.

## 6. Regras para quem continuar

1. Não mescle sem autorização explícita da dona. Mescle só com todos os checks verdes e a PR sem conflito, confirmando o estado do commit atual (eventos de commits antigos não valem).
2. Use commit de mesclagem, não squash, nesta base (item 5).
3. Não leia nem versione `docs/CONTRATO_SOCIETARIO.md`.
4. Nunca coloque segredos no repositório. Não imprima nem exponha `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` nem `CLOUDFLARE_API_TOKEN`.
5. Mudança que gasta recurso pago precisa de limite por quem chama e de teto global.
6. Antes de otimizar custo, meça. Registre o que descartou e por quê.
7. Não afirme o que não verificou. Marque "não verificado" e diga como conferir.

## 7. Decisões que continuam com a dona

- Publicar as regras do Firebase e conferir `FIREBASE_APPCHECK_ENFORCE` na Vercel.
- Tornar o repositório privado e adicionar o segundo dev como colaborador.
- Pagar ou não o plano Blaze do Firebase e o plano da Vercel para uso comercial.
- Contato e política de privacidade do `SECURITY.md`.
- Aumentar ou não o tamanho do código de sala.
- Reescrever ou não o histórico por causa do contrato.
- Aceitar ou não rodar o mobile completo só à noite, para economizar minutos de CI.
