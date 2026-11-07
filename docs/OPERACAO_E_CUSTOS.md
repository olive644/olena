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
| Escrita ilimitada em `users/$uid`      | `firebase-room.rules.json`                                | só as 18 chaves de `SYNCED_STORAGE_KEYS`, itens de até 5 milhões de caracteres (20 milhões só na folha de trabalho), sem escrita de contas anônimas, `$other: false`                                |
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
- **Medido no console depois (1 a 31 de outubro):** 182 GB de download no plano Spark, 172 GB acima do limite de 10 GB por mês. O primeiro dia acima da cota foi 13 de outubro, com picos em 18, 19 e 28. O #468 sozinho não resolveu.
- **O que foi feito (31 de outubro, `fix/sync-menos-download`):** (1) antes de salvar, o app lê só `stateV2/updatedAt` (um número) e baixa o estado inteiro apenas se a nuvem estiver mais nova; (2) o stream em tempo real escuta só `stateV2/updatedAt`, ignora o eco da própria gravação e baixa o estado uma vez quando outro aparelho publica; (3) o envio passou a ser um `PATCH` só das chaves alteradas, e a sessão de Foco (gravada a cada 30 s) vai sozinha, sem mexer em `updatedAt`. Se o `PATCH` falhar, o app volta ao `PUT` do estado inteiro. Efeito esperado, não medido.
- **Troca conhecida:** uma sessão de Foco em andamento no aparelho A não aparece em tempo real num aparelho B que já esteja aberto. Ela aparece quando B carregar de novo ou quando a pessoa tocar em "Sincronizar agora".
- **Não verificado:** o `PATCH` multi-caminho (`items/<chave>` junto com `updatedAt`) contra as regras publicadas e o Firebase real. Os testes usam um servidor falso. Conferir após o deploy: salvar uma mudança e ver se o aparelho não cai no fallback de `PUT` (aba Rede do navegador, método `PATCH` com status 200).
- **Como medir o efeito:** aba Uso do Realtime Database nos dias seguintes ao deploy. A CLI `firebase database:profile` mostra o consumo por caminho. Se continuar alto, o suspeito seguinte é a chave única do espaço de estudos (`helenastudy.workspace.v1`, até 20 milhões de caracteres) sendo baixada inteira a cada mudança de outro aparelho.
- **Custo do Blaze** (não verificado, conferir na página oficial): cerca de US$ 1 por GB de download acima do limite gratuito. O excesso deste mês daria algo perto de US$ 15. Se pagar, configure alerta de orçamento no Google Cloud antes.

## 3. Trocar de banco de dados

**Decisão: não migrar agora.** Razões:

1. Trocar de provedor não corrige o hábito de baixar o estado inteiro a cada salvamento. Em qualquer plano gratuito isso estoura o limite.
2. O app depende de tempo real (salas e sincronização usam o stream do Firebase). Postgres e MySQL puros não têm isso. Seria preciso acrescentar outro serviço de tempo real.
3. O banco é usado em muitos pontos (sincronização da conta, salas, limites, cache de voz, gravações, links de leitura, 11 endpoints e as regras). Migrar são semanas, com risco de perder dados.

Referências verificadas em páginas oficiais do Supabase em 17/10/2026: plano gratuito com 500 MB de banco, 5 GB de egress sem cache e 5 GB com cache por mês (sem cobrança de excedente: o uso é restrito), pausa por inatividade após 7 dias, 2 projetos. O limite de tráfego é a metade do do Firebase. MySQL, Neon e Azure não foram verificados: o PlanetScale acabou com o plano gratuito em 2024 (de memória), e o Azure exige cartão e é fácil de gerar cobrança sem querer. Se um dia for preciso migrar, Postgres (Supabase ou Neon) é a escolha geral mais razoável, mas isso é palpite.

Desenho detalhado de uma sincronização em banco próprio, ainda como proposta: `docs/DESENHO_SYNC_BACKEND_PROPRIO.md`.

## 4. Visibilidade do repositório

- **Estado verificado em 18/10/2026:** `olive644/olena` é **público**, com 1 fork (de um dev do projeto) e 2 estrelas. Tem `LICENSE` e `SECURITY.md`. O `package.json` diz `UNLICENSED`.
- **Decisão recomendada: privado**, porque o app terá planos pagos e o código público permite que alguém copie a interface e hospede uma versão concorrente. Tornar privado é decisão e ação da dona (Settings, General, Danger Zone, Change visibility).
- **O que privado não resolve:** o código que roda no navegador ou no app já é público para quem usa. Regras de plano e de recurso pago têm de ser verificadas no servidor, com conta e limites, nunca só na tela. O que já foi público pode ter sido copiado.
- **Antes de privar:** adicione o segundo dev como colaborador (Settings, Collaborators), porque quem não for colaborador perde o acesso à versão original. Pelo que se sabe, forks públicos existentes continuam como cópias separadas depois de privar (não verificado).
- **Custos de privar** (conferir): o teto mensal de minutos do GitHub Actions (ver `docs/CI_MINUTOS.md`), CodeQL e varredura nativa de segredos que em privado costumam exigir plano pago (o `gitleaks` do CI continua funcionando), e a Vercel, cujo plano gratuito (Hobby), pelo que se sabe, não permite uso comercial (não verificado).
- **Se ficasse público:** criptografar ou ofuscar o código não funciona (quebra CodeQL, Dependabot, diffs e o build da Vercel, e o cliente já é público). O que protege é: nenhum segredo no repositório, lógica que vale dinheiro no servidor, conteúdo sensível fora do repositório, licença (protege no papel) e, se necessário, dividir em um repositório público e outro privado. Um levantamento do que seria problema se ficasse público (prompts, dados de treino, regras de planos) pode ser feito sem alterar nada.

### 4.0 Estado em 07/11/2026: o repositório está privado

- **Verificado pela API do GitHub em 07/11/2026:** `olive644/olena` tem `private: true`, 2 estrelas, 0 forks e não usa GitHub Pages. O texto de 18/10 acima ("é público, com 1 fork") ficou histórico. Até poucas horas antes, as execuções do CI mostravam 0 minutos cobrados, e a mudança para privado aconteceu fora desta sessão (a IA não privou nada).
- **A partir daí os minutos do CI contam.** A medição, os cenários de corte e a conclusão estão em `docs/CI_MINUTOS.md` (seção "Medição de 01 a 07/11/2026"): cerca de 5.168 min em 7 dias, 22.000 por mês projetados, contra um teto gratuito que se diz ser de 2.000 (não confirmado).

### 4.2 Depois de privar: o que conferir (passos da dona)

A IA não consegue fazer nem ler vários destes itens (a sessão só acessa endpoints do próprio repositório e a proteção da branch devolve HTTP 403). Confira na interface do GitHub e da Vercel e anote o resultado aqui.

1. **Cobrança do Actions:** Settings, Billing and plans. Veja o uso do mês e o **limite de gasto**. O padrão do plano gratuito é US$ 0, o que faz o CI parar em vez de cobrar; confirme que é esse. Se o CI parar, nada é mesclado, porque a regra do projeto só mescla com todos os checks verdes.
2. **CodeQL:** a análise de código em repositório privado costuma exigir plano pago do GitHub (não verificado). Se os checks `Analyze (...)` passarem a falhar, o `codeql.yml` precisa de `if: ${{ !github.event.repository.private }}` ou a aba Security precisa do plano. Hoje eles custam cerca de 380 min por semana.
3. **Vercel:** confirme que o deploy da `main` e as prévias de pull request continuam saindo depois de privar. O plano Hobby, pelo que se sabe, não permite uso comercial (não verificado), e o app terá planos pagos.
4. **Proteção da branch `main`:** em repositório privado no plano gratuito, regras de proteção de branch podem não valer (não verificado). Se existiam checks obrigatórios, confira se continuam bloqueando a mescla.
5. **Colaboradores:** quem precisa de acesso (segundo dev) tem de ser adicionado em Settings, Collaborators. A IA não consegue listar.
6. **Dependabot e alertas de segurança:** devem continuar em privado; confirme em Settings, Code security.
7. **Chaves e segredos:** privar não desfaz o que já foi público. Se alguma chave ou token alguma vez esteve no histórico, troque-a.

### 4.3 Links públicos que apontam para o repositório (precisam de decisão)

Estes arquivos do site citam o repositório e passam a não funcionar para quem não é colaborador:

| Arquivo                           | O que diz                                                                                            | Problema depois de privar                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `public/.well-known/security.txt` | `Contact:` aponta para o relato de vulnerabilidade do GitHub e `Policy:` para o `SECURITY.md`        | o relato privado só funciona para colaboradores e o `SECURITY.md` dá 404 para fora |
| `public/llms.txt`                 | "Repositório no GitHub: código-fonte aberto do OlenaStudy"                                           | o link dá 404 e "aberto" deixa de ser verdade (o projeto é proprietário)           |
| `SECURITY.md`                     | via 1 é o relato privado no GitHub; via 2 diz que o contato da Galeria.Oli "ainda está em definição" | sobra **nenhum canal público para relatar vulnerabilidade**                        |

Falta decidir um **e-mail de contato de segurança** (e-mail que a dona escolher). Com ele, ajustar `security.txt` (`Contact:` e remover a `Policy:` do GitHub), o `SECURITY.md`, a Política de Privacidade e remover a linha do `llms.txt`. `src/security-txt.test.ts` confere o `security.txt`. Nenhum desses arquivos foi alterado nesta entrada, e eu não inventei endereço.

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
- Tornar o repositório privado (feito em 07/11/2026) e adicionar o segundo dev como colaborador.
- Pagar ou não o plano Blaze do Firebase e o plano da Vercel para uso comercial.
- Contato e política de privacidade do `SECURITY.md`.
- Aumentar ou não o tamanho do código de sala.
- Reescrever ou não o histórico por causa do contrato.
- Aceitar ou não rodar o mobile completo só à noite, para economizar minutos de CI.
- Como pagar o CI em repositório privado: pagar minutos, rodar o e2e fora do GitHub (máquina própria ou local) ou reduzir muito as execuções (ver `docs/CI_MINUTOS.md`). Nenhum corte sozinho cabe no teto gratuito.
- Escolher o e-mail de contato de segurança (seção 4.3).

## Orçamento de Idiomas, 02/11/2026

Autorização vigente do proprietário para ampliar o teto de JavaScript quando a funcionalidade exigir. Revisão das atividades de Inglês medida em build: 1704,7 KiB contra 1699,8 KiB anterior, acréscimo de 4,9 KiB para planejamento adaptativo com fallback compartilhado, revisão da Olena e catálogo de idiomas gerais. Banco de 720 tarefas e guias continuam em JSON carregado sob demanda; sem biblioteca nova ou aumento da entrada por conteúdo didático. Ajuste explícito do teto total e teto rígido de 1704 para 1708 KiB. Nenhuma alteração no teto de entrada, workflows, testes ou tempos. Não se trata de redução de proteção nem de economia alegada: os demais gates continuam obrigatórios.

Medição final após correção da liquidação das recompensas: aplicação 1705,7 KiB e entrada 220,7 KiB, dentro dos 1708 KiB autorizados. Nenhuma alteração adicional de teto.

## Partidas inglesas com corações, 03/11/2026

Build medido após a primeira integração do relógio e currículo por complexidade: aplicação 1709,6 KiB contra 1705,7 KiB da PR565; entrada permanece 220,7 KiB. Teto total de 1708 para 1712 KiB sob autorização vigente do proprietário para crescimento funcional. Nenhuma dependência nova, nenhum teto da entrada ou tempo de CI alterado. Explicações das 180 situações e artes ficam fora do JavaScript, carregadas como recursos. Limites continuam verificados no build final.

Medição final com o layout sem arte nas perguntas: aplicação 1710,8 KiB de 1712 e entrada 220,7 KiB. Verify e 34 E2E locais aprovados. Sem mudança adicional de teto, dependências ou configuração externa.

## Conteúdo A1, 03/11/2026

Build inicial medido em 1716,3 KiB, contra 1710,8 KiB da revisão anterior, entrada 220,7 KiB. Sob autorização vigente do proprietário, teto total e rígido passam de 1712 para 1720 KiB, sem alterar entrada, workflows ou tempos. Os 120 novos exercícios e doze guias ficam em JSON sob demanda, sem biblioteca ou serviço novo. A camada de seleção, validação e compatibilidade responde pelo crescimento funcional; não foi alegada economia não medida. Conferir medição final no audit.

Medição com a retomada: aplicação 1719,8 KiB de 1720 e entrada 220,7 KiB. O cursor reutiliza o perfil privado e a fila de sincronização existentes, sem chave de nuvem, regra ou serviço novo. Nenhum aumento adicional de teto.
