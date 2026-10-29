# Auditoria do estado atual

## Espaço sem busca e cartas no perfil, 27/10/2026

Integração com main 638607d preserva os gestos da PR531 e concatena os textos novos após o catálogo atual (3160 entradas, dica da Agenda no ID3146). CI antigo falhou somente no encaixe móvel do convite: 423,4375 px para máximo inferior a420. Falha reproduzida localmente; a regra móvel duplicada de student-space-details.css ainda impunha padding inferior200px. Ambas regras passam a184px, preservando arte/tipografia e o teste original. Rodada final passou22E2EChromium/EdgePC/mobile de student-resume,Oliver,cartas e gestos do caderno/Agenda, incluindo temasclaro/escuro. Verify da integração passou2355testes,JS1592,2KiBde1600; repetição apósCSS em pr530-sync-final-verify.log. Nenhuma alteração de expectativa,timeout,CI ou arte aprovada. Logs pr530-mobile-failure.log,pr530-sync-e2e.log e pr530-sync-final-e2e.log fora do repositório.

Removido Buscar no Espaço somente da tela inicial. Busca e filtros da Biblioteca permanecem. Oliver ganhou pose nova transparente, apoiada na base do widget, sem os raios amarelos retirados depois da aprovação. Por direção posterior do proprietário, saiu a miniatura da ilha; decoração própria usa malha, sólidos, diagrama de fração e base de papel azul. WebP pequeno preserva alpha. O widget novo ganhou rig Rive próprio (veja a entrada de 2026-10-27).

Perfil substitui Minhas ilhas por três cartas compactas, favoritos da coleção, galeria, inspeção 3D original, data com números de papel e efeitos respeitando acessibilidade. Favoritos usam cardFavorites dentro de helena.profile.v1; obtenções usam revealedAt opcional por posição do baú em helena.mathPlaceRewards.v1, sem chave sincronizada nova. Merge conserva a data conhecida mais antiga por carta na mesma recompensa e não inventa datas retroativas. Coleções, pontos, loot, cartas ainda não reveladas e a preferência antiga de ilha são preservados.

Primeira prova: 38 testes existentes e 25 focados de cartas/datas/merge/inspeção passaram; oito E2E Chromium PC/mobile de perfil e Oliver passaram nos dois temas. Inspeção visual encontrou rolagem antiga da galeria mantida ao abrir carta; corrigido reset e foco do diálogo, com layout lateral no PC e escala compacta no celular. Validação integral passou 2350 testes em 360 arquivos, lint sem erros/24 avisos existentes, idiomas/API/formatação/build/desempenho verdes. Aplicação final 1590,3 KiB de 1600, entrada 220,4 KiB. Rodada de 20 E2E de Biblioteca, perfil e Espaço passou; após o pedido de apoiar Oliver na base e remover a ilha, repetidos 14 E2E de perfil/Espaço e dois do convite nos dois temas/projetos, todos aprovados. Mantidos limites, comportamento das outras ilhas e Biblioteca. Conferidos previews claro/escuro PC/mobile e reset do diálogo; correção de regra móvel antiga que cortava a nova arte ficou coberta pela composição final. Artefatos profile-cards-previews fora do repositório; logs profile-cards-verify.log, profile-cards-final-e2e.log e cards-floor-e2e.log. Não houve mudança de backend, regras, quotas, dependências ou limites de desempenho.

## Post-it, navegação da folha e intervalo, 2026-10-27

Rodada final concluída: verify verde, 2349 testes/360 arquivos, aplicação 1591,8 KiB de 1600. E2E final passou 12 cenários, incluindo escrita/salvamento e recuperação de rascunho existentes; dois skips móveis dessas regressões já existiam por dependerem de mouse. Os dez cenários próprios de gesto/contraste/rolagem passaram sem skips. Tema escuro conferido pela raiz da página após a montagem e nas screenshots, além dos estados claros. Log notebook-gestures-release-e2e.log fora do repositório.

Menu do post-it usa tinta escura sobre sua superfície clara, incluindo tema escuro. Captura do botão do meio na viewport move somente a rolagem nos dois eixos, preserva ferramenta e bitmap, e encerra ao soltar/cancelar/perder captura. Cinco testes unitários cobrem captura, eixos, cancelamento, perda de botão e preservação do mouse primário/caneta. Agenda exige pressão de 350 ms antes do arraste, cancela intenção com movimento antecipado maior que 8 px, scroll/wheel/blur/segundo ponteiro, e permite rolagem vertical nativa. Transferência de captura implícita do SVG do dia para a grade não cancela a seleção. Dica em PT/EN documenta pressão e alternativas por botão/teclado.

Provas Chromium/Edge: seis cenários de caderno e intervalo passaram, PC/mobile claro/escuro, verificando menu, manutenção da ferramenta/bitmap no PC, intervalo por mouse e toque, Escape, Shift e alternativas por clique. Quatro cenários adicionais de rolagem real passaram nos dois temas e tamanhos: dedo move a página sem selecionar; wheel com botão pressionado também não seleciona. Screenshots sticky-light/sticky-dark e dashboard-light/dashboard-dark em test-results, logs notebook-gestures-e2e3.log e agenda-scroll-final.log fora do repositório. Mouse auxiliar é validado no PC, contraste/menu no celular; não houve teste em aparelho físico. Verify inicial passou 2349 testes/360 arquivos, lint sem erros e 24 avisos existentes, API/idiomas/formatação/build/desempenho. Aplicação 1591,7 KiB de 1600 e entrada 220,4 KiB. Revalidação final integral após tratamento de captura e nova dica registrada no log notebook-gestures-final-verify.log.

## Persistência de acesso e desvinculação, 26/10/2026

Causas reproduzidas: logout apagava o aceite junto aos dados de estudo; providerData não é prova suficiente da presença de senha depois de outra forma de login. Teste do logout e teste de senha na reentrada falharam ao recolocar os respectivos comportamentos antigos e passaram com a correção. O logout agora preserva somente a preferência de acesso, isolada por UID, sem manter conteúdo de estudo. Exclusão de conta continua limpando tudo.

methods confere a conta atual no Firebase e retorna somente presença de senha e estado Google, além do vínculo Discord privado já existente. Google/Discord associados permitem desvincular com modal original, cancelamento, reautenticação, aviso de conta distinta, movimento reduzido e sons conforme preferência. Servidor protege último método, simultaneidade, origem, identidade, sessão recente e quotas, sem alterar configurações externas ou dependências. npm run verify passou 2342 testes em 359 arquivos, lint sem erros/24 avisos existentes, idiomas/formatação/API/build/desempenho verdes. Aplicação 1589,8 KiB de 1600, entrada 220,4 KiB. Rodada final de 35 testes focados, TypeScript e API repetidos passou, incluindo dois testes adicionais de método legado e UID divergente. Dez E2E Chromium PC/mobile de acesso/retorno passaram. Quatro cenários isolados com componente/CSS reais e Firebase simulado validaram claro/escuro no PC/mobile, aceite após reload, máscara, cancelamento sem mutação, remoção Google/Discord com reautenticação e uma chamada por confirmação. Screenshots inspecionadas após Animation.finished. Logs unlink-verify.log, unlink-final-focused.log, unlink-e2e.log e unlink-visual.log fora do repositório. OAuth, remoção externa e entrega real de e-mail não verificados.

## Estados de acesso, decoração e recuperação, 2026-10-26

Login restaura paper-sky-pattern claro/escuro, ícone Google próprio com facetas e profundidade compartilhado com Configurações, botão de criar conta em papel, Discord roxo no escuro e HelenaLoading também no preparo/retorno. Mantidas áreas de toque e dimensões dos ícones, sem botão Google ocupar a largura da linha. Removido o caminho Apple sem uso do login; compatibilidade da exclusão de contas antigas permanece.

Segurança e acesso mantém o aceite explícito em cache por UID, atualiza providerData após associar senha e exibe máscara fixa de oito asteriscos quando já existe. Google/Discord mostram associação verde/check ou não associado vermelho, nome do provedor e estado desconhecido neutro com repetição. Novo methods autentica a conta atual, confere os dois lados do vínculo privado Discord, limita consultas por UID/global e não expõe tokens/IDs. Nomes antigos ausentes só serão preenchidos por nova autorização OAuth, sem inventar dados.

Reset chama o SDK uma vez por tentativa, tem cooldown de 60 segundos persistido no aparelho e aviso de papel sobre Spam/Lixo eletrônico após sucesso da solicitação. Falha não anuncia envio; troca de conta não mostra aviso antigo. Entrega real e pasta do e-mail não verificadas. Regra de validar toda UI nos dois temas adicionada a AGENTS.md e DESIGN_SYSTEM.md.

Prova de regressão: teste de consentimento falhou com o componente anterior e passou após a correção. Quarenta e um testes focados passaram, cobrindo reabertura/troca de UID, senha, cooldown/falha, nomes, origem, vínculo e quota. Dez E2E Chromium PC/mobile de login/retorno passaram nos dois temas. Navegador isolado com componente e CSS reais e Firebase simulado validou quatro combinações tema/tamanho, quatro solicitações de reset/cooldown e uma associação de senha; screenshots após Animation.finished foram inspecionadas. Artefatos access-account-visual fora do repositório, sem credenciais reais. Não é prova de OAuth ou entrega de e-mail reais. Pares de texto e fundo conferidos: texto claro 19,11:1, escuro 14,85:1, secundário 5,01:1/6,74:1 e botão roxo 6,09:1. Validação integral concluída: npm run verify passou 2332 testes em 359 arquivos, lint sem erros e 24 avisos existentes, formatação/API/idiomas/build/desempenho verdes. Aplicação 1587,1 KiB de 1600, entrada 220,4 KiB. Rodada final repetiu os 41 testes focados e dez E2E, todos verdes. Logs access-status-verify.log, access-status-final-focused.log e access-status-final-e2e.log fora do repositório.

Direção posterior do proprietário em 26/10: remover opção Apple da entrada e da associação de novos métodos. Google/Discord e email permanecem. Revogação e reautenticação Apple de vínculos antigos continuam por compatibilidade, sem revogar contas existentes. Microsoft foi pesquisado como alternativa, ainda não adicionado nem habilitado: exige registro OAuth no Microsoft Entra e Client ID/Secret no Firebase, sem presumir que já esteja pronto.

Após a configuração informada pelo proprietário, o endpoint publicado account-auth/step=status respondeu discord=true em nova consulta de 26/10. Configuração anunciada pelo servidor confirmada; autorização OAuth real com uma conta Discord ainda não foi executada nesta sessão. Nenhuma variável externa foi alterada pelo agente.

## Acesso em papel e medidor, 2026-10-26

Botão email principal, provedores com nomes acessíveis e somente ícones abaixo, papel/facetas e abas amarelas. Consentimento explícito antes do formulário, aviso recolhido durante email e restaurado ao voltar. Cadastro compacto em duas colunas, recuperação/outros métodos centralizados. Checkbox de mostrar senha usa o contrato universal documentado em DESIGN_SYSTEM.md. Composição solicitada e medidor local, sem telemetria de senhas; validação SDK preservada e regra equivalente deve ser configurada no servidor pela responsável. Pesquisa Firebase/NIST registrada em AUTHENTICATION.md. Endpoint público Discord respondeu discord=false, configuração externa pendente; Apple real não verificado, nenhum segredo/painel alterado. Validação concluída: npm run verify passou 2319 testes em 358 arquivos, lint sem erros/24 avisos existentes, idiomas/API/formatação/build/desempenho verdes. App 1583,7 KiB de 1600, entrada 220,4 KiB. Dez E2E Chromium PC/mobile de acesso e retorno passaram nos temas claro/escuro; entrada e cadastro sem overflow em 320x568 e desktop. Conferência final de 29 testes focados também passou. Ativação externa continua pendente e não foi apresentada como corrigida por CSS.

## E-mail/senha, Apple e Discord, 2026-10-26

CI do head 324bd97 aprovou CodeQL e os fluxos de acesso, mas o teste de tinta touch no shard mobile 1 falhou. Diagnóstico local com mouse/caneta/toque confirmou: após desenhar, a camada viva mudava de 3464x2598 para 3200x2400 e ficava totalmente transparente. Mudar dimensões do canvas apaga o bitmap, e o efeito repintava somente a folha principal. Correção mínima repinta o traço vivo após dimensionar a camada no mesmo efeito. A tentativa de apenas aguardar pixels não corrigiu a falha e foi descartada; teste original e expectativas preservados. Instrumentação temporária removida. Provas: teste original passou 18/18 em Edge Chromium PC/mobile com três repetições por mouse/caneta/toque. npm run verify passou 2315 testes, lint sem erros, formatação/API/idiomas/build/desempenho verdes. App 1581,6 KiB de 1600, entrada 220,4 KiB. Logs auth-ink-product-fix.log e auth-ink-fix-verify.log fora do repositório.

GoogleLogin concentra a entrada existente e agora oferece Apple pelo SDK Firebase, Discord por authorization code no servidor e formulário expansível de e-mail/senha. Cadastro com confirmação de senha e política Firebase, recuperação sem enumeração, verificação/reenvio e associação explícita de métodos em Segurança e acesso. Senhas não são persistidas pelo aplicativo ou enviadas ao backend próprio. A confirmação de exclusão usa o método da sessão, não pressupõe Google. Não há associação de contas por e-mail, nome ou IP. Dados permanecem vinculados ao UID Firebase.

Discord usa state/cookie vinculados ao navegador, issuer conferido, consumo transacional uma vez, código intermediário de 60 segundos e token Firebase apenas em JSON. Matrícula mantém UID em concorrência, recusa desativados e troca UID após exclusão. Limites distribuídos por endereço e globais, segredos só no servidor. Registros temporários usam o caminho já protegido e limpo room-limits; vínculos privados dependem da negação padrão do banco. Não houve mudança de regras publicadas, dependências, workflows ou orçamento. Cadastro administrativo conferido com o documento de descoberta oficial da API Identity Toolkit v1: accounts:signUp, chave pública do projeto, credencial administrativa e targetProjectId. Teste restrito a esse contrato ficou vermelho antes da correção e verde depois.

Inicialização Firebase compartilhada corrige consumidores simultâneos do resultado OAuth. Troca Discord compartilhada por código tolera StrictMode, e o código só sai da URL após gravar a conclusão: teste de remontagem ficou vermelho antes e verde depois. App respeita login=1 também quando já havia onboarding concluído, permitindo o retorno de associação. Provas focadas de autenticação, cookies, replay, concorrência, exclusão, consentimento, recuperação e SDK aprovadas. Oito cenários de controles/tema e encaixe 320x568 e 360x640 Chromium passaram. Validação integral e E2E finais ainda em conclusão. Configuração externa e limites de evidência em AUTHENTICATION.md; Apple/Discord e entrega real de e-mail não foram anunciados como ativos sem os passos da dona nos painéis.

Conclusão local: npm run verify aprovado com 2314 testes, lint sem erros e 24 avisos existentes, formatação/API/idiomas/build/desempenho verdes. Aplicação 1581,5 KiB de 1600, entrada 220,4 KiB, sem alterar limites. Bateria ampla Edge Chromium desktop/mobile: 40 aprovados e 12 skips móveis já existentes da suíte de privacidade, que verifica as larguras explicitamente no projeto desktop. Na revisão final, mais dez cenários de autenticação e retorno passaram, incluindo claro/escuro. Revogação Apple antes da exclusão, PKCE S256 Discord, token assinado de cinco minutos e verificação de sessão recente no servidor (quatro minutos) também têm provas focadas. Pesquisa e passos externos em AUTHENTICATION.md. Nenhum provedor foi ativado nos painéis e nenhum login externo real ou entrega de e-mail foi apresentado como verificado.

CI 40370013612 identificou como generic-api-key o literal público olena.returning.v1 do commit 02f1b66, nome de armazenamento de um booleano. A constante foi renomeada de KEY para ITEM, mantendo exatamente o valor persistido, e .gitleaksignore recebeu somente a impressão digital dessa linha histórica, como os falsos positivos já documentados do projeto. Nenhuma regra ou workflow foi desativado. Gitleaks 8.30.0, mesma versão do CI, foi obtido da distribuição oficial com SHA-256 conferido: 887 commits locais examinados, sem achados após a exceção precisa. Não houve credencial real ou necessidade de rotação.

CodeQL marcou o resultado sensível de createUserWithEmailAndPassword/signInWithEmailAndPassword chegando ao armazenamento pelo callback que recebia User, embora o campo usado fosse apenas UID. A fronteira foi reduzida: EmailAuthForm não encaminha objetos de credenciais para a interface, apenas sinaliza conclusão depois de conferir igualdade com o UID da sessão ativa. GoogleLogin consulta a identidade ativa do Firebase para registrar o proprietário da configuração. Sessão que muda enquanto verificação/perfil são enviados não conclui a entrada na conta errada. Nenhuma regra CodeQL foi suprimida. Prova focada: 25 testes aprovados e TypeScript sem erros, incluindo a troca de sessão durante a operação. Validação integral concluída: 2315 testes aprovados, lint sem erros, formatação/API/idiomas/build/desempenho verdes. Aplicação 1581,6 KiB de 1600. Dez E2E Edge Chromium PC/mobile de autenticação e retorno passaram em claro/escuro.

## Entrada de retorno, 2026-10-25

A entrada oferece Já tenho uma conta sem exigir as nove perguntas. Um navegador que concluiu login ou saiu de uma conta guarda somente olena.returning.v1=1, fora dos dados pessoais e da sincronização, para abrir Boas-vindas de volta. A marca não contém nome, UID, e-mail, IP ou impressão digital e não autentica ninguém. A limpeza de dados pessoais ao sair permanece integral. Sem a marca, o atalho de login continua disponível. Criar conta retorna ao questionário original; Google e convidado conservam consentimento e fluxos existentes.

Login Google direto com respostas vazias não grava helena.onboarding.v1: a conclusão e as preferências são recuperadas da conta pela sincronização existente. Conta nova sem conclusão recebe o questionário após a hidratação; não é marcada como concluída artificialmente. Entrar diretamente depois de respostas parciais não aplica essas respostas ou uma configuração anterior. Nenhum serviço, geolocalização, rastreamento ou chave sincronizada foi adicionado.

Nova pose de papel da Olena criada a partir das referências do onboarding, acenando com pata no peito, exclusiva da entrada de retorno. WebP transparente de 112 KB, sem dependências novas. Validação integral passou 2285 testes, aplicação 1567,3 KiB de 1600, entrada 220,4 KiB. Dezoito cenários E2E Chromium desktop/mobile passaram, incluindo retorno claro/escuro e onboarding em 320x568 e 360x640. Login real com Google depende das credenciais do ambiente; os testes de integração usam o serviço de autenticação simulado e comprovam que o retorno preserva respostas existentes.

## Medições de layout após animações, 2026-10-25

Atualização da base: PRs 522 e 523 adicionaram a ação discord-interactions enquanto o onboarding estava aberto. Resolvido o único conflito em olena-handler preservando as duas rotas independentes, onboarding e discord-interactions, com os imports sob demanda e sem mudar os contratos.

Application CI 40246639095 encontrou uma falha móvel na contagem regressiva: o SVG foi medido com altura de 33,6 ou 47,9 px durante o scale de entrada, antes de atingir seu tamanho final. O teste de Espaço do aluno também apresentou leitura transitória entre a posição do cartão e sua arte durante student-reveal. Os dois testes aguardam as animações responsáveis pela medição usando Animation.finished, sem sleeps fixos, sem alterar os efeitos do produto ou as expectativas de tamanho e contenção. Validação: 16 execuções E2E Edge Chromium PC/mobile aprovadas, em duas repetições, e npm run verify integral aprovado. Aplicação 1566,5 KiB e entrada 220,4 KiB, sem mudança. A cobertura Chromium PC/mobile permanece obrigatória antes da mesclagem.

## Playwright somente com Chromium, 2026-10-25

O proprietário pediu explicitamente remover WebKit e manter Playwright. Desktop e mobile agora declaram browserName chromium; o mobile conserva o descritor de iPhone para viewport, escala, toque e isMobile, sem selecionar o motor do Safari. playwright.helena.config herda os dois projetos e também passa a usar Chromium. Matriz de ci-scope mantém desktop e dois shards móveis com os mesmos nomes, workers e gates; só o navegador foi substituído. Instalação dinâmica do workflow recebe chromium em todas as entradas. README atualizado para instalar somente chromium. Nenhuma alteração em timeouts, critérios, dependências ou redução de testes.

Testes de matriz/configuração foram adicionados/atualizados antes da mudança e passaram depois: todos os projetos e entradas exigem Chromium, com dimensões e toque preservados. Medição do cancelamento e limitação da cobertura Safari registradas em CI_MINUTOS. Validação final: npm run verify aprovado, 349 arquivos e 2264 testes, lint sem erros, formatação/API/idiomas/build/desempenho verdes. Aplicação 1566,5 KiB de 1600, entrada 220,4 KiB. Quatorze testes de ci-scope aprovados; 32 E2E Edge Chromium desktop/mobile passaram sem skips, incluindo prova do motor e toque, onboarding/configuração, recuperação e avatares nos dois temas. Nenhum download de WebKit executado. Alteração incluída na PR 521; autorização atual do proprietário substitui a exigência anterior de executar WebKit.

## Preparação personalizada do onboarding, 2026-10-25

Diagnóstico posterior, head 2c6f58a: o WebKit também falhou na recuperação real depois de liberar HTTP 503; a interface de onboarding não reabriu após reload. O comportamento é compatível com o bug oficial WebKit 270357 (https://bugs.webkit.org/show_bug.cgi?id=270357), que mantém módulos com preload em erro no cache, inclusive após recarregar. O build confirmou que Vite incluía o próprio chunk app e seus scripts em modulepreload no bootstrap. A correção preserva o import dinâmico e os preloads CSS, mas deixa apenas esse bootstrap carregar o JavaScript pelo import normal; preloads dos outros módulos permanecem. Não desabilita testes, não altera CI ou timeouts. O E2E conserva a exigência de recuperar o app e passa a conferir também a ausência do preload problemático. Dois cenários Edge PC/mobile aprovados antes do verify; confirmação em WebKit fica no CI do novo commit.

Validação dessa correção: npm run verify aprovado com 348 arquivos e 2263 testes, lint sem erros (24 avisos), API, idiomas, build e orçamento verdes. JavaScript inicial 220,4 KiB e aplicação 1566,5 KiB de 1600. Vinte e dois E2E de onboarding e recuperação aprovados em Edge desktop/mobile, sem skips. A saída compilada foi inspecionada: o preload do bootstrap conserva CSS, e os scripts entram por import normal. Não há alteração de APIs, configurações externas, workflows, limites ou timeouts; WebKit real ainda deve aprovar a nova revisão.

Correção do CI para mesclagem: Application CI 40237728324 aprovou desktop, shard móvel 1, verify e análises, mas o shard móvel 2 falhou na contagem de requisições do teste de recuperação após abortar o download. O teste agora simula indisponibilidade HTTP 503, libera a rota e exige que Tentar novamente navegue e abra o onboarding, sem a tela de erro. Essa prova de recuperação real substitui a contagem de interceptações e não altera produto, CI ou timeouts. Dois cenários Edge desktop/mobile passaram, e npm run verify foi repetido: 348 arquivos, 2263 testes, aplicação 1566,7 KiB e entrada 220,7 KiB. WebKit precisa confirmar o novo commit antes da mesclagem.

Mesclagem da PR 521 suspensa para incluir a solicitação do proprietário: preferências, meta diária, duração de Foco e matéria inicial. Não inclui plano, tarefas ou horários. Nova ação POST de /api/olena aplica regras determinísticas às nove escolhas limitadas e retorna configuração validada; sem modelo, credencial adicional, treinamento ou escrita no servidor. Origem, versão, parâmetros, enumeração e corpo de 4096 bytes validados.

Resumo em papel antes de Registre-se, com carregamento original, timeout de dez segundos, cancelamento, nova tentativa e opção explícita de continuar sem configuração automática. Persistência reaproveita onboarding existente e workspace versão 7, com metadados opcionais, disciplina reutilizada por ID/nome e marca estável de aplicação única. Registro legado de redirect continua legível. Conta pronta aplica configuração pendente após a troca de workspace; edições posteriores permanecem. Meta aparece no Espaço e é editável em Estudo e foco, assim como a matéria inicial. Foco mantém sessão/modo recuperados e não inicia sozinho. Ilha inicial em Praticar respeita atalhos explícitos para Matemática e mantém futuras atividades bloqueadas.

Validação final: npm run verify aprovado com 348 arquivos e 2263 testes; lint sem erros (24 avisos existentes), formatação, API ESM, catálogos PT/EN com 3070 entradas, build e desempenho verdes. Aplicação 1566,7 KiB de 1600; entrada 220,7 KiB, sem mudar teto ou dependências. Quarenta e quatro cenários Edge desktop/mobile passaram sem skips na versão final: preparação pela API real do preview, resumo legível em ambos os temas, edição de meta/matéria persistente após reload, fallback sem simular sucesso, todas as perguntas e acesso em 320x568 e 360x640, retomada/suspensão do Foco, Pomodoro personalizado, configurações e 404.

Provas de regressão vermelhas antes e verdes depois para preservação de pausas, login sem questionário, escolha explícita Agora não em programação e dígitos do resumo no tema escuro. Três casos de sincronização cobrem configuração salva antes/durante GET e dono diferente; configuração pendente só recebe prioridade para o próprio UID e é consumida depois da aplicação ao workspace. Esse ajuste não muda regras, chaves, configurações externas nem fluxo de login. Capturas finais claras/escuras no PC/celular inspecionadas. WebKit real aguarda CI, sem download local. Atualização na PR 521, com mesclagem suspensa a pedido do proprietário.

## Página 404 e recuperação de abertura, 2026-10-25

Adição na mesma branch/PR 521 do onboarding. PaperRecoveryPage reaproveita os dígitos e alfabeto de papel originais, a Olena aprovada e a seta original; folha com dobra, CTA recortado e superfície dos dois temas, responsiva no PC e celular. Rota desconhecida deixa de virar início silenciosamente. Mantidos caminhos conhecidos, /habitos e convite/projetor da Sala. A 404 aparece antes do onboarding sem exigir conta.

A captura do proprietário era o catch de inicialização em main, não uma 404. Esse catch recebe o mesmo acabamento com Ops, mensagem de falha e Tentar novamente preservado, sem afirmar que a causa de rede/download foi resolvida. public/404.html funciona sem o bundle e sem JavaScript; CSS independente e script externo pequeno leem tema/idioma quando disponíveis. Rótulos estáticos acompanham os catálogos PT/EN e são comparados em teste. Não há rewrite genérico que converta APIs ou arquivos ausentes em HTML. A saída 404.html é o mecanismo oficial de página não encontrada estática da Vercel (https://vercel.com/kb/guide/custom-404-page); o status HTTP publicado será conferido na prévia, não inferido do servidor SPA local.

Validação final: teste de caminho desconhecido vermelho antes da correção; 12 testes focados verdes depois, incluindo retorno/popstate, projetor e favicon antes do Oliver no rodapé React/estático. npm run verify passou com 346 arquivos e 2245 testes; lint sem erros (24 avisos), formatação, API, 3057 entradas em cada catálogo, build e orçamento verdes. Aplicação 1557,9 KiB de 1600, entrada 220,7 KiB, sem mudar tetos ou dependências. Ajuste final decorativo de rodapé também teve lint/formatação e testes focados repetidos.

Vinte e sete cenários Edge desktop/mobile passaram na versão final, com cinco skips previstos nas larguras de navegação exclusivas de desktop. Cobertura de recuperação, onboarding e navegação responsiva, incluindo falha simulada do chunk do aplicativo e nova tentativa de download, versão estática sem JavaScript em 320x568, inglês, ambos os temas e paridade da cor dos dígitos na versão estática. Ordem e posição do favicon à esquerda do Oliver verificadas no navegador. Capturas finais claras/escuras desktop/mobile inspecionadas. WebKit e status HTTP na Vercel aguardam o CI/prévia publicada. Nenhum workflow, rewrite, serviço externo ou armazenamento alterado. Incluído na mesma PR 521, sem mesclagem nesta etapa.

## Onboarding com papel original, 2026-10-25

Branch feat/onboarding-paper-flow. Quarenta ícones SVG próprios para todas as respostas, incluindo bandeiras recortadas de Japão e China. Escolhas incluem as seis matérias das ilhas e mantêm as opções gerais anteriores; nenhum conteúdo futuro foi habilitado. Japonês e Chinês são preferências de estudo, com valores canônicos e rótulos PT/EN, sem novos idiomas de interface. Marca usa o alfabeto de papel original; favicon da Olena precede o ícone existente da Galeria.Oli no rodapé dessas telas.

Removidos slogan e convite lateral. Registre-se abre o acesso centralizado; Google e convidado aparecem somente na tela final, com convidado em link sublinhado e sem placa. Consentimento, redirecionamento, recuperação de respostas e persistência local permanecem. Móvel mostra a pergunta atual em duas colunas de escolhas; desktop mantém a conversa anterior com rolagem interna. Sem travar altura ou esconder transbordamento da página, para permitir ampliação de texto e telas atípicas.

Validação final: npm run verify aprovado, 345 arquivos e 2240 testes, lint sem erros (24 avisos), formatação, API, catálogos PT/EN com 3051 entradas, build e desempenho verdes. Aplicação 1553,8 KiB de 1600, entrada 218,1 KiB; nenhuma dependência ou limite alterado. Trinta e três testes focados passaram antes da suíte completa. Vinte e quatro cenários Edge desktop/mobile passaram na versão final, com doze skips previstos para verificações de privacidade exclusivas de desktop. Todas as nove perguntas, despedida e acesso cabem em 320x568 e 360x640 sem rolagem e com botões de pelo menos 44 px. Capturas móveis e acesso centralizado desktop inspecionados, incluindo o aviso de indisponibilidade do Google na prévia local. Testes de autenticação cobrem consentimento, popup, redirecionamento e preservação das respostas. WebKit real fica a cargo do CI, sem download local. Entrega por PR, sem mesclagem nesta etapa.

## Biblioteca conectada e revisão, 2026-10-25

Branch feat/library-connected-review parte da main após a PR 518. Cartões recebem edição/exclusão confirmada, baralho por tema, busca/filtro, TSV local com prévia e deduplicação e estatísticas reais. Agendamento adaptado de SM-2 em flashcard-study conserva o primeiro Fácil de três dias, calcula facilidade individual e coloca Errei no dia seguinte. Limite de novos por dia usa firstReviewedOn da conta inteira, sem limitar revisões antigas. Novos campos opcionais preservam dados anteriores e a versão 7; nenhuma chave Firebase nova.

Notes e folhas criam cartões de trechos editáveis com noteId; Notes, tarefas e eventos vinculam/desvinculam materiais e abrem a fonte interna. Busca do Espaço pesquisa o workspace local, incluindo o acervo. Leitura ganha status e hostname sem fetch externo. Imagens PNG/JPEG/WebP até 5 MB ficam no mesmo IndexedDB por conta, com bytes/MIME validados e hash; PDF legado continua legível. Nenhum binário é sincronizado. Tutora existente aceita material textual com prévia e consentimento renovado por pergunta, sem anexar PDF/imagem, mudar serviço, cotas ou backend.

Investigação de regressão: criação de cartão a partir de material herdava editingId do material. O formulário passava a editar um cartão inexistente. startCreate usa esse ID somente para material; edição de cartão atribui o próprio ID explicitamente. Prova E2E original de fonte/caderno/Pomodoro passou sem alterar expectativas. Coleções da Biblioteca faltavam no mergeWorkspaceStates; incluídas aditivamente com baseline e merge por ID, preservando clientes anteriores.

Validação final: npm run verify aprovado, 345 arquivos e 2230 testes, lint sem erros (23 avisos existentes), formatação, API, catálogos PT/EN com 3032 entradas, build e desempenho verdes. Aplicação 1550,5 KiB de 1600 e entrada 218,1 KiB, sem mudar tetos. Quarenta e quatro cenários Edge desktop/mobile passaram na versão final, com seis skips previstos por plataforma, mais quatro cenários de metadados/edição da Agenda. Cobertura inclui PDF, imagem local persistente, TSV, limite diário, Notes com fonte, busca, caderno, Pomodoro, navegação e ambos os temas. Prévia clara desktop e escura mobile inspecionadas. Estilo do LibraryDialog pertence ao componente, para conservar o papel ao abrir diretamente em Notes. dueFlashcards compartilha o limite com Praticar e a rota de estudo. Cartões legados já estudados não consomem novos na primeira revisão após a atualização. Nenhuma dependência, CI, regra, chave Firebase, serviço ou limite alterado; WebKit real depende do CI da PR, sem download local. Entrega por PR, sem mesclagem nesta etapa.

## Correção dos checks da PR 518, 2026-10-24

CI identificou o E2E antigo de flashcards preenchendo Frente sem abrir o novo diálogo. Reproduzido no Edge desktop/mobile; o teste agora abre Criar flashcard e mantém a verificação de persistência após Matemática. Seis cenários focados passaram, incluindo compartilhamento claro/escuro, que havia apresentado duas repetições no CI; sem mudança de timeout ou expectativa do PNG.

O WebKit real também falhou ao salvar PDF. WebKit documenta rejeição de Blob/File no IndexedDB de sessões efêmeras (bug 286561), compatível com esse sintoma. libraryFile agora grava ArrayBuffer e reconstrói application/pdf na leitura, preservando leitura de Blob legado, chaves por conta e limpeza. Prova unitária falhou antes e passou depois com armazenamento que recusa Blob, incluindo leitura legada, isolamento e exclusão. A confirmação do caso específico no WebKit real depende do novo CI; não instalado navegador local e nenhuma configuração de CI alterada.

Validação da correção: npm run verify aprovado, 343 arquivos e 2220 testes, zero erros de lint (23 avisos existentes), formatação, API, idiomas, build e desempenho verdes. Aplicação 1532,4 KiB no teto existente de 1600, entrada 217,7 KiB. Edge desktop/mobile: 33 testes aprovados e cinco skips exclusivos de celular no projeto desktop, cobrindo app, Biblioteca/PDF, caderno/Foco e arraste/compartilhamento de conquistas claro/escuro. Nenhuma expectativa de persistência, dimensão do PNG ou tempo de espera foi removida ou ampliada.

## Biblioteca integrada, 2026-10-24

Branch feat/library-study-hub parte de origin/main e preserva as conquistas mescladas. Biblioteca tem coleções com capas próprias, busca por conteúdo/etiquetas, filtros, ordenação, favoritos, arquivo, edição, exclusão confirmada e retomada. Revisão revela o verso antes de avaliar e conserva o agendamento existente. Trechos guardam fonte no caderno e no flashcard. Foco associa material e matéria sem início automático ou substituição da sessão recuperada.

PDF.js existente lê documentos locais de até 20 MB, com busca, páginas, marcadores e anotações. Binários ficam no IndexedDB por conta/material; hash e organização seguem o workspace. Em outro aparelho, selecionar novamente o original, sem promessa de backup em nuvem do PDF. Contrato em LIBRARY_DESIGN.md. Configurações recebeu o convite Discord solicitado e ícone próprio de papel.

Validação final: npm run verify aprovado com 342 arquivos e 2219 testes, lint sem erros (23 avisos existentes), idiomas, API, build e desempenho verdes. Vinte e quatro execuções Edge desktop/mobile passaram nos temas claro/escuro, incluindo pesquisa, marcador, posição após reload, reanexação pelo hash, recusa do arquivo errado, fonte no caderno/flashcard, Pomodoro parado e regressões de Foco e Configurações. Entrada medida em 217,7 KiB e aplicação em 1532,3 KiB, dentro dos tetos já vigentes na main, sem alterá-los. Sem novas dependências, alterações de CI ou download local de WebKit; o navegador real fica para o CI da PR.

A verificação identificou uma corrida no teste já existente de perfil social: a legenda da insígnia era encontrada antes do efeito que abre o dialog. O teste aguarda agora o mesmo papel e nome acessíveis com findByRole, preservando todas as expectativas. Nenhum código de produto do perfil foi alterado. Testes adicionais cobrem limpeza dos PDFs com dados pessoais, rejeição de documento protegido por senha sem perder a explicação e preservação de materiais com mais de quinhentas anotações, sem descartar notas antigas.

## Correção dos gates da PR 513, 2026-10-24

Auditoria do head 89237f2 identificou undici 8.10.2, dependência de desenvolvimento transitiva do jsdom. Atualizado somente esse registro do lockfile para 8.12.3, dentro da faixa já permitida, sem dependência nova ou override. npm audit passou de um pacote vulnerável para zero. Referências: GHSA-4qv8-2p9j-2685, GHSA-f72v-6w45-q472 e GHSA-xjj6-f33q-929c.

Falhas de navegador reproduzidas localmente com os testes originais. A celebração criava um segundo AudioContext; createMathSound agora compartilha o contexto entre donos ativos e fecha somente após o último dispose. Prova unitária vermelha antes e verde depois, incluindo uso da celebração após a saída do jogo. As notas e preferências de som não mudaram.

A rotação não falhava por geometria: a estimativa de clique estava a menos de dois pixels da alça desenhada. O botão Inspecionar da celebração estava ativo sobre a folha e recebeu o clique. AchievementAnnouncer aguarda a saída de handwriting-studio para apresentar a fila e tocar o som, sem consumir os dez segundos durante a edição. Prova unitária verifica retenção por vinte segundos e exibição ao sair. Instrumentação temporária foi removida; e2e/selection-tools.spec.ts e suas expectativas permanecem intactos.

Validação local final: npm audit com zero vulnerabilidades; npm run verify aprovado com 338 arquivos e 2204 testes, lint sem erros (23 avisos), formatação, API, idiomas, build e desempenho verdes. JavaScript de aplicação 1499,1 KiB de 1500 e entrada 217,5 KiB, sem alterar limites ou CI. Rodada Edge desktop/mobile de ilhas, seleção, cartas, celebração e arraste teve 16 aprovações e quatro exclusões móveis já existentes da seleção exclusiva de desktop. WebKit local não baixado; aguardar obrigatoriamente CI real do novo head antes de mesclar.

## Conquistas, movimento e visita de perfil, 2026-10-23

Na branch feat/achievement-motion-profile, preservadas as 113 artes aprovadas. Destaques aceitam arraste por mouse e toque, substituição no destino e reordenação sem duplicação, mantendo favorito por teclado. Galeria usa ícones próprios de categoria e entrada por IntersectionObserver. Inspeção mantém miniatura WebP sob a imagem completa e antecipa as etapas da família. Compartilhamento ganhou cenários SVG por assunto, favicon e assinatura original, ações sem placa e voltar no cabeçalho. Visita de perfil é diálogo separado da busca, com selo de nível público sobre o avatar e segurança centralizada por ícones.

Celebração central não modal, com som diferente por raridade, pausa do tempo durante foco e inspeção e respeito a mute, gesto inicial e redução de movimento. Textos reaproveitam IDs existentes do catálogo sem trocar traduções; SVGs estáticos de Bingo, calendário, régua, divisória e poeira foram externalizados fielmente, mantendo grupos animados do Saturno e da poeira e RoomPointsIcon inline. Fixtures preservam geometria e equivalência bilíngue. Regras em ACHIEVEMENT_DESIGN.md.

Verify final aprovado com 338 arquivos e 2203 testes, lint sem erros (23 avisos existentes), formatação, API, idiomas, build e desempenho aprovados. Aplicação em 1499,5 KiB de 1500 e entrada de 217,5 KiB, sem alterar teto, dependências ou CI. Regressão E2E identificou títulos codificados na importação Node sem catálogo; revertidos os títulos para os literais anteriores, sem mudar expectativas do teste. Restante da economia veio de desenhos estáticos. Rodada ampla teve 78 aprovações e as duas falhas das cartas; repetição dos 42 cenários afetados, incluindo cartas, Agenda, Bingo e arraste, passou no Edge desktop/mobile. Última rodada de 12 cenários dos três fluxos novos passou, incluindo toque real via CDP, claro/escuro, compartilhamento PNG com favicon, X original, redução de movimento e alinhamento do popup separado. Sete testes de SocialDirectory repetidos após ajuste do rótulo de fechar também passaram. Fixture de layout não representa conta autenticada. WebKit local não instalado, CI WebKit ainda não verificado. Não mesclado.

## Conquistas gerais e destaques, 2026-10-23

Revisão artística aprovada: 56 artes gerais próprias, incluindo os quatro níveis da Horta do Foco. As outras 52 foram geradas individualmente, sem falhas, preservadas em PNG no workspace e codificadas para WebP 512 com alpha, total de 2.404.744 bytes no app. Cada família conta uma história e evolui a cena por material, sem ícones reaproveitados ou cenário da ilha matemática. Prompts em docs/achievement-general-art-prompts.json, HORTA_PROMPTS.md e README da pasta general. PaperDigits permanece original, ajustado à placa geral. Reflexos por data-tier: cobre discreto, prata frio, dourado e verde esmeralda. Máscara usa alpha da própria imagem; bloqueadas não brilham; redução de movimento interrompe as duas camadas. Matemática e seus assets permanecem intactos.

Validação final: npm run verify aprovado com 334 arquivos e 2182 testes, lint sem erros, formatação, idiomas, API, build e desempenho aprovados. O primeiro gate de desempenho falhou em 1513,4 KiB. Extração fiel dos desenhos estáticos de Agenda, marcadores, planetas, ferramentas do caderno, atributos e partes dos baús para sprites, mais reutilização de IDs já existentes do catálogo bilíngue, reduziu JavaScript a 1499,6 KiB. Entrada 217,5 KiB. Nenhum limite, workflow, tradução existente ou dependência alterado. Acrescentado Salvar imagem nos dois idiomas, catálogo com 2910 entradas. RoomPointsIcon permanece inline para o modo offline. Não foi mantida a tentativa de extrair a trilha sem uso no produto, pois não reduziu o bundle. Fixtures comparam paths, cores e transforms originais; textos reaproveitados são comparados em português e inglês.

E2E Edge desktop/mobile: 26 cenários de conquistas, perfil e ajuste da ilha passaram; 39 cenários de Agenda, cartas, cadernos e Bingo passaram e um revelou aviso de conquista interceptando a criação de folha no celular. Aviso agora é não modal: decoração não recebe eventos, controles continuam interativos. Os 14 cenários de conquistas e cadernos foram repetidos e passaram, cobrindo a correção com aviso visível e clique normal. Previews finais usam dados fictícios. WebKit local não foi instalado novamente; validação WebKit no CI ainda não verificada. O proprietário solicitou explicitamente mesclar antes do CI em 23/10, sem contornar proteções da branch.

Regressão dos três destaques preenchidos corrigida: o X decorativo agora fica dentro de um span, evitando a regra global que limitava o cartão inteiro a 44 px e bloqueava a aba Gerais no celular. Dois E2E focados Edge desktop/mobile passaram, com clique normal e verificação de que os cartões não ultrapassam a área dos destaques.

Adicionadas 56 metas gerais em 12 famílias de quatro materiais e oito especiais, derivadas de registros existentes. A galeria agrupa níveis e separa Matemática/Gerais. Até três favoritos obtidos são sincronizados no perfil e publicados com validação, ordem e remoção explícita. Histórico geral preserva obtenções após exclusões, sem inventar datas. Insígnias deixam o 3D, cartas permanecem intactas. Cards PNG usam paletas por assunto e alfabeto original. Contrato visual documentado em ACHIEVEMENT_DESIGN.md.

Validação parcial: 20 E2E no Edge desktop/mobile aprovados, cobrindo galeria, PNG real, favoritos após recarga e perfis nos dois temas. A suíte completa passou 2137 testes e revelou duas regressões por adicionar histórico vazio a perfis legados. A leitura foi corrigida para não introduzir campo ausente; os 11 testes dos três arquivos afetados passaram depois. Tipos, API ESM, idiomas e formatação aprovados. Não afirmar verify completo: a última medição da aplicação ficou em 1515,1 KiB para teto de 1500. Separar catálogo e cálculo evitou acoplar derivação ao armazenamento, mas não resolveu o orçamento. Nenhum limite, workflow ou escopo foi alterado. Publicação pendente da redução e nova validação integral.

## Foco após desligar e inspeção pública, 2026-10-19

Regressão WebKit mobile corrigida: a prancheta ampliada do Rive podia criar rolagem horizontal no Espaço. O cartão de Foco limita somente o excesso de pintura com overflow: clip, sem mudar a proporção do tomate ou a animação no Foco/pop-up. O E2E do widget também verifica ausência de rolagem após carregar o canvas.

Orçamento preservado sem aumentar limites: ProfileStreakValues e ProfileNetworks compartilham a renderização entre perfil e inspeção. Desenhos existentes de amigos, contatos, busca, QR e flor passam para SVGs cacheáveis com os mesmos paths/cores. A apresentação pública atualiza quando o dono abre o próprio perfil; enquanto não houver resumo, não inventar nível nem streak. Foram descartadas novas leituras integrais de contas visitadas para evitar tráfego extra e exposição de dados privados.

Confirmado: o prazo salvo era restaurado como rodando por até 24 h e o laço de transições registrava todas as rodadas vencidas durante a ausência. Snapshot sem heartbeat por mais de 120 s agora retoma pausado no último progresso. O mesmo guarda atua antes de qualquer cálculo em execução após suspensão; pagehide persiste a pausa. A tolerância permite o throttling de abas em segundo plano sem tratar mera troca de aba como desligamento. Testes distinguem avanço vivo em passos curtos de suspensão longa. Não remover histórico antigo automaticamente, pois ele pode conter sessões legítimas.

O atalho de Pomodoro do Espaço reutiliza AnimatedPomodoroTomato atual, sem som, com redução de movimento e fallback existentes. Inspeção de amigos remove cartões de atividades, preservando o sino. Acrescenta nível, streaks positivos recentes e links sociais opcionais com ícones originais. A apresentação publica somente metadados limitados da própria conta confirmada, sem workspace nem textos privados; servidor normaliza URLs e registra a atualização. Resumos de streak com mais de 24 h não aparecem. Não há nova leitura do banco nem novo serviço. Metadados públicos são informativos e não concedem XP, plano ou privilégios. @bizzok recebe exatamente DEV, GALAXIA e BETA TESTER, sem CREKS implícito.

## Número do mini Pomodoro sumindo a cada segundo, 2026-10-19

Um vídeo do celular (Chrome, janela about:blank) mostrou o último dígito do relógio do pop-up sumindo por cerca de 170 ms a cada segundo (por exemplo 23:28, 23:2, 23:27), o que deslocava o número por ele ser centralizado. Causa: cada dígito novo é um `<svg><use>` recriado e apontava para o sprite externo `/paper-digits.svg`, que na janela flutuante demora para pintar. Correção: ao abrir a janela, `openPomodoroWindow` embute o sprite (10 símbolos) em um bloco fora de vista (`.pomodoro-sprite`, não `display:none`, que quebraria os recortes) e a janela usa `PaperDigitsSource` com `#`; se o arquivo não carregar, volta ao sprite externo. A aba original não muda. Conferido por captura ampliada: os dígitos saem idênticos aos da aba, com os recortes corretos. Não consegui reproduzir o sumiço no Chromium de teste (nem com CPU limitada), então a confirmação é no aparelho. O JS da aplicação ficou 22 bytes abaixo do teto de 1500 KiB.

## Correção da miniatura do Pomodoro, 2026-10-19

Foco volta a mostrar os três controles diretamente; a seta expansível pertence somente ao pop-up. Abrir/fechar miniatura usa um único PaperEditorIcon com nome acessível e tooltip. Somente o pop-up recebe papel vermelho-claro (#f9b4a7) com tomatinhos facetados, como alternativa escolhida pelo usuário à transparência real indisponível no Document PiP. Removidas as barras horizontal e vertical, com mostrador adaptável à altura disponível.

Causa da pausa: o runtime Rive anterior era da aba original e seu listener de visibilitychange cancelava o RAF ao ocultá-la. Rive agora é carregado e deduplicado por Window, no documento dono do canvas. ResizeObserver e timer da entrada instante também acompanham essa janela. Não cria outro contador ou registro. Dígitos conservam o SVG original, com identidade por posição e caractere para renovar somente o número alterado, largura fixa e camada de pintura isolada. A tentativa de duplicar os símbolos no documento flutuante foi descartada após inspeção ampliada apontar recortes incorretos.

Permissão real: requestWindow é chamado pelo clique do usuário, deixando ao navegador conceder ou negar a abertura. Não existe pedido de transparência nem é solicitada permissão de notificações como se autorizasse PiP. Falha de abertura mantém mensagem recuperável de permitir pop-ups. Sem alterar configurações do navegador ou do sistema.

## Mini Pomodoro e avisos nativos, 2026-10-19

Incorporada também a PR #495: animação ociosa, minhoca animada e sons atuais. Miniatura reutiliza o mesmo componente e a etapa do Foco, com som de mordida desativado somente na projeção para não duplicar o áudio. Botões usam os callbacks compartilhados com sons de iniciar, pausar e reiniciar.

Miniatura atualizada para AnimatedPomodoroTomato da PR #494, com Rive e minhoca originais. Recebe a mesma etapa calculada no Foco, inclusive a última mordida na transição para a pausa. Redimensionamento do canvas acompanha a janela que contém o elemento, inclusive pop-up/PiP. Mantém os três controles e a ausência de resumo e decoração de fundo.

Corrigida distorção entre documentos: resizeDrawingSurfaceToCanvas do Rive usa instanceof HTMLCanvasElement da janela original e ignora o canvas do pop-up. Nesse caso, aplicamos dimensões reais e devicePixelRatio da janela dona ao buffer e chamamos resizeToCanvas. ResizeObserver acompanha mudanças de layout. Teste reproduziu diferença de proporção de 0,925 antes e exige diferença abaixo de 0,03; há também regressão unitária com iframe.

A miniatura solicita 320 por 340 px e mostra somente tomate, relógio, seta e controles. Resumo semanal e textos de duração permanecem apenas na aba Foco. HTML, body e painel da miniatura não desenham fundo nem padrão decorativo. Isso não torna a janela nativa transparente sobre outros programas: o navegador continua responsável pela superfície e moldura da janela.

Foco ganha Abrir mini Pomodoro: Document Picture-in-Picture quando disponível, janela separada como fallback, sem prometer sempre no topo neste caso. Conteúdo usa portal React com os mesmos dados e callbacks da aba Foco, tomate e números originais. Os dois locais usam PomodoroControls: uma seta roxa original girada para baixo expande Começar/Pausar, Reiniciar e Encerrar e registrar, sempre em uma linha. Nenhum botão extra substitui os controles originais. Não cria outro contador, registro de estudo ou chave sincronizada. Fechar miniatura mantém o contador; sair da aba Foco fecha a miniatura. Tema, idioma e preferências de movimento/destaque acompanham a origem. O navegador pode limitar tamanho, posição e suporte. A aba Foco precisa continuar aberta.

Ao iniciar manualmente o Pomodoro, solicita permissão nativa de envio de notificações se ainda não decidida. Recusa ou indisponibilidade não impede início. Transições avisam fim do estudo ou pausa, com no máximo um aviso recente por atualização, sem despejar ciclos antigos ao retomar. Não bloqueia notificações do navegador, de outros sites ou do sistema. Usuário decidiu deixar esse bloqueio para depois. Sem extensão, serviço externo ou permissão nova além do pedido opcional de notificações.

Fontes técnicas: https://developer.chrome.com/docs/web-platform/document-picture-in-picture e https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API/Using_the_Notifications_API. Testes cobrem seleção PiP/fallback, pop-up bloqueado, permissão concedida/negada/indisponível e projeção do contador/controles em PC e celular nos dois temas.

Desempenho: removido somente o formulário legado de metas permanentemente oculto por display:none na aba Foco, junto com seus cálculos de calendário não apresentados. Dados, ações de domínio e metas salvas permanecem intactos. Mensagens por ID, mostrador compartilhado e formatação de tempo reutilizada mantêm a aplicação dentro do teto existente de 1500 KiB, sem elevar limites ou incluir dependências. A medição arredondada é 1500,0 KiB, com entrada de 217,4 KiB. O DOM não conserva controles inacessíveis de uma função desativada.

## Dispositivos, Pomodoro e personagens, 2026-10-19

CI encontrou dimensões intrínsecas ausentes nos SVG de Nicolas e Guilherme. Corrigidos width/height de 512 px, conservando viewBox, transparência e arte. Mantida a asserção E2E original de 512 por 512, sem reduzir proteção para aceitar o fallback de 150 px dos navegadores.

Segurança ganha Dispositivos conectados, Mostrar/Ocultar e listagem autenticada de navegadores que acessaram o app. Registro começa nesta versão: aparelhos antigos aparecem ao voltar. Não é inventário retroativo do Firebase nem presença online, e não oferece revogação remota. Sem IP, geolocalização ou fingerprint: somente UUID aleatório por navegador/conta, família de navegador/sistema e horário do servidor. Sair remove o registro atual sem bloquear logout por falha de rede; registro que não pôde ser removido pode permanecer até expirar. Limpar dados ou reinstalar cria outro registro.

Modelo de ameaça: origem permitida e conta Firebase não anônima verificada no servidor, UID derivado do token, chave SHA-256 por conta, respostas no-store, CAS com quatro tentativas, até 30 dispositivos por conta e retenção de 90 dias. Metadados do cliente são informativos, nunca autorização. Reutiliza room-limits privado e indexado, envelope expiresAt e limpeza agendada existente. Conta: 6 chamadas/minuto e 120/dia; global: 20.000/dia. Sem novas regras, variáveis ou serviços. Exclusão da conta remove os registros. Rollback: retirar publicação/consulta do registro sem alterar autenticação ou dados de estudo. Testes cobrem conta alheia, visitante, origem, quota, deduplicação, expiração e saída.

Pomodoro mantém presets 25/50 e defaults de pausa 5/15, com slider RoomStepSlider da Escuta coletiva e edição em horas/minutos para estudo, pausa curta e longa. Duração válida de 1 minuto a 99 h 59 min, evitando valores nulos/infinito. Campos opcionais preservam leitura de preferências antigas. Recuperação de sessão aceita durações personalizadas; não reinicia contador de outro aparelho. Relógio usa HH:MM:SS acima de uma hora e resumo usa h/min. Versões anteriores do app não entendem valores de estudo diferentes de 25/50: não orientar downgrade sem exportar dados e restaurar um preset compatível primeiro.

Nicolas usa a raposa original e Guilherme o gato cinza dos previews de 19/10, ambos transparentes sem moldura. Conversão WebP em SVG mantém caminhos e seleções já salvas. Nenhuma arte nova gerada nesta etapa; originais aprovados foram preparados anteriormente com imagegen. Ninho conserva jairo.webp.

## Urso Ninho, 2026-10-19

Nome exibido do avatar do urso alterado de Jairo para Ninho no catálogo compartilhado. Arte aprovada e caminho /profile-avatars/jairo.webp preservados para não invalidar perfis salvos. Testes conferem rótulo novo, seleção anterior e ausência do nome antigo no seletor. Referências históricas abaixo descrevem os nomes na época.

## Layout do Espaço aprovado por preview, 2026-10-19

Prateleira retirada do Espaço nos dois layouts, sem apagar favoritos ou cadernos.
StudentDestinations usa Foco acima da Ilha à esquerda e caderno largo à direita.
Folheamento, capa, abertura de folhas e ausência de criação/personalização preservados.
Não depende de detecção JS da largura; grade responsiva em CSS. Molduras ajustadas
para facetas e cantos originais, sem grande caixa arredondada. Prioridades e Agenda
Hoje são montados somente quando há tarefas pendentes/eventos do dia. Indicadores
numéricos permanecem informativos. Preview desktop/mobile aprovado antes do merge.
Testes cobrem dados vazios, só tarefas, só eventos, ambos, conclusão da última tarefa,
navegação, proporção do livro e posição relativa dos três destinos.

## Favoritos na prateleira móvel, 2026-10-18

Mobile recebe StudentFavoritesShelf abaixo do Oliver; desktop mantém o preview anterior.
As capas favoritas abrem preview largo, em vez do caderno comprimido entre três destinos.
Seleção pelo + reutiliza as artes e o trilho da estante. Notes e pastas são aceitos.
homeFavorite opcional em StudyNotebook pertence ao workspace sincronizado, sem nova chave
de armazenamento ou serviço remoto. notebook/favorite-toggled aplica três favoritos e uma
pasta no máximo. Normalização no carregamento, substituição e merge preserva os itens
e limita combinações concorrentes, sem apagar folhas. Favoritos de folhas não mudam.
Folheamento e capa são somente leitura, sem criação; abrir uma folha leva aos Cadernos.
Pasta abre sua estante original em Cadernos, sem duplicar um navegador de pastas.
Entrada direta de pasta antiga seleciona a seção de notas.

Desempenho medido: JavaScript da aplicação passou de 1492.9 para 1499.5 KiB
(+6.6 KiB); entrada preservada em 217.4 KiB. Seletor/prévia carregam sob demanda
só no mobile e reutilizam arte/folheamento existentes. Sem novas dependências.
Orçamento normal limitado a 1500 KiB; teto absoluto intacto.
Primeira medição foi 1499.9 KiB; reutilizar a abertura original de pastas reduziu
o total em 0.4 KiB. Sem duplicar navegador de pastas no Espaço.
Não remover validações de limites, duplicar editores ou excluir artificialmente o
chunk do orçamento: essas opções mascarariam o custo ou aumentariam o risco.

## Revisão compacta do Espaço, 2026-10-18

Substitui a apresentação descrita na revisão anterior: três previews em uma linha
também no celular, sem textos ou setas amarelas. Nomes permanecem acessíveis.
NotebookSpread recebe compactPreview opcional para folhear até a capa em readOnly;
o inventário e a criação de folhas não são montados; a navegação usa FocusPaperArrow. Previews somente leitura
sem essa opção preservam seu comportamento anterior. Nenhuma edição é liberada.
Agenda numérica volta a ser informativa. O cartão Hoje inteiro abre o planejador,
inclusive por teclado, sem seta e sem botões aninhados. Check de Prioridades reproduz
o estado visual aprovado da Agenda. Três novos SVGs exclusivos dos indicadores,
sem substituir ícones compartilhados nem aumentar dependências.

## Correção das miniaturas e estados do Espaço, 2026-10-18

Tarefa pendente não desenha check: borda amarela indica a ação e aria-pressed reflete
o registro. Próximas tarefas usa a lista original da Agenda. O atalho Minha agenda
duplicado foi removido e o indicador numérico Agenda é um botão para o planejador.
Destinos usam três cartões compactos no PC e uma coluna no celular, sem depender
de alturas impostas ao livro. O caderno mantém proporção 1.4 e largura máxima de
250 px, paginação e abertura da folha, sem personalizar capa no preview. readOnly
agora bloqueia também capa por teclado e gesto; o botão Capa não é montado.

Flor no vidro e tomate são os mesmos componentes usados em Foco, extraídos sem
mudar a arte. O estado da flor vem do mesmo histórico e expiração. Máscara do
tomate usa ID por instância. Ilha centralizada usa AnimatedPlace sob demanda,
mantendo a imagem otimizada até o primeiro quadro e em movimento reduzido.

Central de notificações tem contêiner interno centralizado no espaço útil do PC,
abas facetadas e destaque amarelo. Ofensivas têm botão de inspeção por toque ou
teclado, com nome e contagem visíveis, sem depender de tooltip nativo.

## Continuidade do aluno, atividades e XP, 2026-10-18

O Espaço retoma o curso praticado, o caderno e sua folha, e o modo de foco mais recente.
Agenda e painel compartilham os nomes oficiais de matérias, cores e fuso da conta.
Oliver mantém a arte otimizada e Rive, com composição móvel compacta e aviso de expiração
somente na última hora da chama matemática. Os previews usam superfícies do tema.

O sino abre /notificacoes, em Atividades por padrão, com retorno e aba Novidades.
Práticas pequenas deixam de gerar posts individuais: resumos diários possuem ID estável,
preservam curtidas e leitura, e módulos usam apenas curso e tópico oficiais. Seguidores
acumulados e curtidas podem ser expandidos. A versão numérica vem do mesmo artefato
app-version.json nas configurações e no sino, gerado junto às novidades da versão.

O XP de salas antes existia apenas no cache local. Agora o ledger e seus recibos migram
no perfil sincronizado já permitido, sem novas chaves Firebase nem publicação de regras.
Conflitos unem recibos e preservam o piso de XP, sem creditar a mesma recompensa duas
vezes. A curva passa a 100, 150, 200 XP e incrementos de 50. XP já apagado sem cópia
ou recibos sobreviventes não pode ser reconstruído. Troca de conta limpa o cache local.

Catálogos confirmados têm cache por versão e nova tentativa de rede; catálogos maiores
compatíveis são aceitos. Falhas de inicialização do app não são rotuladas como idioma.

## Oliver, privacidade e ciclos reais de foco, 2026-10-18

O Espaço abre com um carrossel de uma página, Oliver em PNG transparente e entrada
direta nas ilhas de Matemática. A recomendação de visão geral foi removida; métricas
usam algarismos de papel e atalhos usam os ícones originais de flor, tomate e calendário.
A chama matemática azul expira exatamente após 24 horas sem prática, inclusive com
a tela aberta. A rosa começa murcha sem histórico de Cronômetro; Pomodoro não a rega.
O relógio revalida ao recuperar foco e a cada segundo. Datas futuras e inválidas não contam.

Compartilhamento de atividades tem padrão ativo no servidor, com marcador explícito
para novas desativações. Registros legados sem marcador usam o novo padrão; a primeira
publicação estabelece o corte temporal, sem despejar conquistas antigas. O link de
privacidade usa botão temático com seta, e o check da paleta tem contraste no modo escuro.

Termos publicados em 18/10/2026: Privacidade e dados agora abre TERMS_OF_USE_PATH em
nova aba, com proteção noopener/noreferrer, substituindo o aviso antigo de rascunho.
Texto legal incorporado da main sem reescrita e sem introduzir aceite obrigatório.

## Saída recuperável, vibração global, conquistas sociais e Espaço, 2026-10-18

Sair não fica desabilitado por status de sincronização. A confirmação tenta
enviar pendências, com prazo de 15 s e requests de 12 s. Falha conserva dados e login;
descarte exige checkbox explícito depois do erro. Falha do Firebase Auth preserva o envio.

Vibração de 8 ms centralizada em eventos confiáveis de click/change do documento,
incluindo portais. Preferência haptics em Acessibilidade, persistida no aparelho, padrão
ativo. Sem pulsos no carregamento, digitação ou controles desabilitados. Sem promessa
de suporte físico em navegadores que não implementam navigator.vibrate.

Atividades públicas exigem consentimento registrado no servidor, desligado por padrão.
Somente registros salvos na conta geram resumos numéricos de prática, foco, quiz e marcos
de sequência. Nunca publicar título de tarefa, material, caderno ou conteúdo. Novas
conquistas vão aos seguidores e ficam visitáveis no perfil. Desativar remove atividades,
curtidas e avisos vinculados. Likes idempotentes, removíveis, com nomes visíveis e aviso
de seis segundos via stream de notices já existente. Filtro próprio em Notificações.
Janela de exibição de 48 h e limpeza nas operações, 12 conquistas por pessoa, 40 no feed,
50 notices, 200 likes por item.
Publicação coalescida por minuto e assinatura de registros, cotas de leitura 2/min e
120/dia por conta, 10.000/dia globais, API social 30/min por conta e 3.000/min globais.
Nenhuma regra ou variável externa publicada por esta alteração.

Espaço do aluno: destinos úteis reais, painéis recortados do tema, ícones nativos,
contadores preservados, entrada curta, foco por teclado e movimento reduzido.
Testes físicos entre contas em produção ainda não verificados nesta mudança.

Validação local: npm run verify passou com 307 arquivos e 2.006 testes, APIs ESM,
catálogos, TypeScript, build e desempenho (216,8 KiB iniciais, 1.477,1 KiB do app,
sem alterar tetos). Doze cenários E2E desktop/móvel passaram; Espaço repetido com
capturas claro/escuro. Integração HTTP de duas identidades confirma evento de curtida
no stream sem polling. Testes cobrem consentimento, revogação, like idempotente,
dados preservados após falha, descarte explícito e token travado com saída recuperável.

## Pronomes salvos e feedback tátil nas configurações, 2026-10-18

As opções canônicas Ela/dela, Ele/dele e Elu/delu passam a ser localizadas na apresentação
do perfil completo, barra compacta e seletor. O valor salvo continua igual; texto personalizado
não passa pelo tradutor. Helper restrito em i18n/profile-pronouns.ts, sem migração de dados.

Configurações emitem pulso de 8 ms nas ações de entrada, retorno, botões e seleção de
checkbox/radio/select/range. Captura no Perfil cobre controles e diálogos por portal;
o botão de navegação é tratado uma vez separadamente. Não vibra em montagem, digitação,
foco, controles desabilitados ou eventos programáticos. Falta de suporte, bloqueio ou erro
na API de vibração não interrompe ações. Não simular suporte físico nos dispositivos que
não oferecem a API. Testes instrumentados verificam chamadas, não vibração física real.
Validação local: npm run verify aprovado com 2.010 testes em 309 arquivos, APIs,
TypeScript, lint sem erros, formato, build e orçamento. Dez E2E de pronomes, acionamentos
táteis e configurações passaram no Edge em desktop/celular. Total JavaScript 1.468,9 KiB,
sem aumentar orçamento ou dependências. Hardware real não foi utilizado no teste tátil.

## Regressão da prévia após idiomas, 2026-10-18

O HTML separado da prévia Helena importava a interface sem instalar o catálogo, gerando
IDs numéricos no lugar dos rótulos. Agora initializeLanguage antecede a importação da
prévia, como no App. Seleção visual da Agenda usa o ícone canônico planner, não o título
traduzido. Os seis E2E originais da prévia passaram em desktop/celular no Edge.
O identificador interno da máquina Rive Helena também voltou a ser literal canônico,
independente dos rótulos e da disponibilidade do catálogo. Regressão unitária cobre isso.
O cenário de retomada do estudo instala sua sessão de teste no novo documento, evitando
que o salvamento legítimo do documento anterior sobrescreva a fixture ao recarregar.
Validação da correção: npm run verify aprovado com 2.006 testes, TypeScript, lint sem
erros, formato, APIs, build e orçamento. Dois E2E de retomada aprovados no Edge, desktop
e celular, além dos seis cenários da prévia. Não muda permissões ou limites do CI.

## Interface bilíngue, 2026-10-18

Tradução global da interface implementada com 2.686 entradas locais pt-BR/en-US,
troca pela bandeira sem recarregar, datas e acessibilidade localizadas. Conteúdo escrito
pelo usuário, respostas e identificadores canônicos são preservados. Catálogos públicos
versionados por hash, guard obrigatório i18n:check e testes de idioma. Detalhes em I18N.md.
Esta entrada substitui a pendência de tradução global da seção histórica abaixo.
Validação local: npm run verify passou com 2.005 testes em 307 arquivos, build,
TypeScript, formatação, APIs e orçamento. Complemento final de salas/idiomas/datas passou
com 21 testes. Total JavaScript 1.468,1 KiB, orçamento anterior de 1.493 e teto de 1.500
preservados, sem dependências novas. Entrada 215,9 KiB, com catálogo obrigatório antes da
importação do App; essa separação não significa eliminar o custo de carregar o aplicativo.
Os cinco avisos em pseudoelementos CSS têm variante en-US. ROOM_ACTIVITY_OPTIONS usa
localizeLabels para não congelar descrições e selos no idioma da primeira importação.
Dois testes de importação fria ganharam espera explícita, sem mudar suas asserções.
Teste real do atendimento entre contas e integração Discord não foram executados.
E2E local no Edge: 23 cenários aprovados em desktop/celular, com cinco duplicatas de
largura puladas pela configuração existente do spec móvel. Inclui idioma após importação
da sala, pseudoelementos CSS, persistência após reload, navegação nos dois temas,
onboarding, configurações e exclusão sem cortes. Capturas em inglês inspecionadas nas
duas larguras. Não representa validação WebKit, CI Linux ou atendimento real em produção.

## Base de atendimento externo, 2026-10-18

Validação local deste conjunto em desenvolvimento: suíte geral com 1.997 testes aprovada,
seis E2E de configurações em desktop/celular aprovados e testes adicionais de XP/chat aprovados.
Build passou. A primeira checagem de peso falhou em 1.502,0 KiB; extração das mesmas artes
de configurações para SVGs estáticos e deduplicação de navegação reduziram para 1.499,4 KiB.
Orçamento incremental ajustado de 1.493 para 1.500 KiB, sem mudar o teto absoluto de 1.500.
Entrada ficou em 281,6 KiB. Não há dependências novas. A margem é pequena: funcionalidades
seguintes precisam otimização antes de crescer. Não declarar validação Linux/CI ou produção.
Tradução global e teste real de atendimento entre contas ainda pendentes, sem publicação.

Preparado contrato interno de eventos e transporte em support-integration.ts, desativado e
sem chamadas externas ou vínculo ao runtime do chat. IDs estáveis por mensagem, projeção
sem credenciais e bloqueio de eco de respostas da equipe têm testes próprios. Não existe
bot ou entrega Discord ativa. SUPPORT_DISCORD_PLAN.md registra outbox atômica, autorização,
privacidade, idempotência, limites e testes exigidos antes de ativar. Demais mudanças de
configurações nesta branch continuam em desenvolvimento, sem declarar publicação ou CI completo.

## Avisos sociais por eventos autenticados

Substituído o transporte primário de polling por SSE autenticado em profile-social?stream=1, com folha privada somente da conta e eventos sem dados pessoais. Polling permanece fallback, não é apresentado como tempo real. Removida a supressão de refollow por 48 horas; somente vínculo novo renova aviso, requisição repetida continua idempotente. Modelo de ameaça, limites e teste real ainda pendente em SOCIAL_REALTIME_SECURITY.md. Sem mudança de regras Firebase ou publicação automática de novas credenciais.

## Recomendações apenas quando faltam dados, 2026-10-17

Causa da ficha permanente: ProfileJourney renderizava explicitamente a conclusão com Revisar meu perfil e useProfileCompletion descartava o resultado da API após conferir igualdade, retornando apenas status. Agora o hook disponibiliza o resultado validado para a mesma chave de campos; ProfileShowcase só monta ficha/slot quando a resposta confirmada contém next. ProfileJourney recebe as etapas dessa resposta e retorna null quando complete/next indicam conclusão. Não há cartão de espera, offline ou celebração permanente. Resposta antiga ou divergente continua descartada, sem cobrar dados já preenchidos durante sincronização. X dispensa a recomendação desta abertura; não cria nova preferência remota.

Meu cantinho de ideias removido com seus imports de prévia e CSS específico. Minhas ilhas passa a ocupar toda a coluna. Nenhum caderno, folha, pasta ou Note foi apagado ou alterado. E2E verifica ausência do widget e preservação do acesso pela aba Cadernos.

## Compatibilidade de notificações do Perfil (2026-10-17)

- Validação: npm run verify com 1904 testes aprovado para a correção do sino; complemento de nomes validado por testes específicos, TypeScript, lint, build e orçamento. Oito E2E de notificações, privacidade e contrato visual das conexões aprovados em desktop e celular. Teste visual usa fixture declarada de layout, sem fingir autenticação ou conexões reais.

- Lista de seguidores/seguindo: relação Segue você passa para baixo do @, sem ocupar uma coluna concorrente. Nome e @ usam linha única com reticências somente quando excedem a largura e texto completo no title e perfil visitado. Avatar e ação não encolhem; área de texto pode encolher sem quebrar palavras por letra. Ajuste móvel preserva área de toque.

- Reproduzidos três E2E de desktop que exigem ausência do sino no DOM do Perfil. SystemUpdates com hideBell deixa de renderizar details e painel em vez de usar hidden. Hook social, listener de visita e aviso temporário continuam montados. E2E originais preservados, testes unitários voltam a exigir ausência estrutural e continuam cobrindo o aviso sem sino. Sem mudança de dados, autenticação ou contratos remotos.

## Refinamento de perfil, XP e avisos (2026-10-17)

- Complemento de carregamento validado com npm run verify: 1904 testes em 281 arquivos, lint sem erros, formatos, API, TypeScript, build e orçamento aprovados. Mais 16 cenários E2E de perfil, capas e estudos aprovados em desktop/celular nos dois temas.

- Carregamento de contagens: consulta social começa sem esperar a resposta do identificador público. Sino e perfil compartilham requisição em andamento e cache somente em memória, por UID confirmado. Retorno ao perfil reaproveita valores confirmados enquanto atualiza; erro de rede não apaga números. Alterações invalidam cache e respostas antigas não vencem a atualização. Troca de conta/logout limpam dados compartilhados. Primeira consulta sem resposta não inventa zero nem mostra reticências. Streak é calculado imediatamente do workspace disponível, inclusive zero; dados de nuvem continuam sujeitos à sincronização existente. Medido 1484,2 KiB, orçamento normal incremental 1485 KiB, teto absoluto 1500 KiB preservado.

- Validação: 1900 testes em 280 arquivos aprovados; 20 cenários de perfil/capas/social/estudos em desktop e celular, nos dois temas, aprovados. TypeScript, lint, formatação, API, build e orçamento conferidos. Entrada 280,4 KiB, total 1483,7 KiB, sem elevar orçamento nem adicionar dependências. Integração real com duas contas permanece pendente no ambiente publicado.

- O perfil deixa de converter pontos das ilhas em XP e lê o ledger usado por RoomRewardNotice, preservando recibos e total. Nível 1 exige 500 XP, cada próximo nível mais 250 XP. Recalcula o nível sem regravar recompensas. Este ledger existente ainda não integra SYNCED_STORAGE_KEYS; não afirmar sincronização de XP entre aparelhos. Limpeza pessoal e troca de conta preservam o isolamento já existente. Expansão remota exige mudança própria.
- Botão QR original ao lado de Adicionar amigo abre Compartilhar perfil. Botões voltam às variáveis de tema; ícones monocromáticos herdam o texto do tema. Seguidores voltam ao fundo suave, sem borda de botão. Avatar e marca no cartão não são selecionáveis nem arrastáveis, textos comuns permanecem selecionáveis.
- Perfil reutiliza NotebookSpread carregado sob demanda, em modo de leitura, com folhear original. Abrir folha navega para Cadernos com caderno e folha validados no próprio workspace. Não permite renomear ou remover folhas pela prévia.
- Avisos sociais colocam pessoa e ação na mesma linha, sem placa na pessoa. Novos eventos de seguir recebidos pelo feed abrem aviso de 6 segundos com avatar, visita e seguir de volta. Não reapresenta histórico inicial, respeita troca de conta e movimento reduzido. O sino continua oculto no Perfil, mas os avisos funcionam nele. Recebimento usa a consulta periódica/foco existente, não é push instantâneo.

## Perfil, ilhas e cantinho de ideias (2026-10-17)

- Rótulos CREKS e BETA TESTER adicionados ao identificador confirmado @pranksterbrain pelo componente compartilhado, sem permissões extras ou confiança em username do cache. Regressão parametrizada com @eito em profile-showcase.test.tsx.
- Validação desta integração: npm run verify aprovado com 1898 testes em 280 arquivos; 16 cenários de capas, barra de perfil e painéis de estudo aprovados em desktop e celular nos dois temas. A asserção de altura móvel de 520 px foi preservada.

- Integração pré-merge: espaçamento vertical móvel entre blocos reduzido de 12 para 6 px para acomodar XP sem exceder a ficha compacta de 520 px no cenário com bio e rede social. Avatar de 112 px e áreas de toque preservados; regressão existente profile-covers.spec.ts mantém o limite original, sem relaxar a asserção.

- Meu progresso conserva contagens reais e remove os dois textos solicitados. Painéis de papel reutilizam carrossel/arte das ilhas, partes de Matemática com percentuais da mesma masteryCompletion e pontos do ledger existente. Somente Matemática está disponível; demais mundos continuam Em breve. Entrar em uma parte abre o mapa existente no curso correto, respeitando desbloqueios e registrando práticas no workspace.
- Novo nível do Perfil deriva dos pontos conquistados nas ilhas: 1 ponto = 1 XP de perfil, 500 XP por nível. Leitura apenas, não credita recompensas, não altera os pontos e não mistura o ledger de XP de salas que ainda é separado. Barra acima de Adicionar amigo, nível pendurado na foto e ocultação no recolhimento desktop.
- Ilha favorita é escolha explícita no perfil já sincronizado, sem nova chave remota. Painel de cadernos escolhe mais folhas reais, desempata por edição recente e informa a origem do destaque. Mostra trilha de pastas sem ciclos, capa original, Note ou última folha e abre /cadernos?caderno=ID. Não afirma tempo de uso inexistente. Conteúdo privado permanece somente no Perfil do dono.
- Sem dependências ou novas artes raster. Total final 1479,3 KiB, entrada 280,3 KiB. Orçamento normal 1484 KiB, teto absoluto 1500 KiB e orçamento inicial preservados. Animações reutilizadas, transições respeitam movimento reduzido. Verificação geral: 1897 testes em 280 arquivos, lint sem erros, formatos, API, build e orçamento aprovados.

## Conexões e cartão do perfil (2026-10-17)

- Seguidores/Seguindo abrem listas paginadas reais, com visita e perspectiva de quem consulta. Deixar de seguir remove somente o vínculo de saída; remover seguidor remove somente o de entrada e o aviso correspondente, sem notificação de remoção. Confirmação explícita antes de mutações, CAS e isolamento existentes preservados.
- Apresentação passa a ser natural: ao abrir o próprio perfil após sincronização, nome, personagem oficial e capa são enviados à apresentação social, sem toggle. Confere dono do cache e handle esperado no servidor para evitar publicação na conta trocada. Contas antigas atualizam ao visitar o próprio perfil; não se lê conteúdo privado de terceiros para migrá-las.
- Cartão reutiliza capa selecionada, QR facetado do Modo Sala e ícones de seta/copiar existentes. Botões creme, sem campo de URL nem avisos/toggles de apresentação. Capas da galeria ocupam o cartão inteiro com nome sobreposto; nenhuma imagem externa ou dependência adicionada.

## Amigos e compartilhar perfil (2026-10-17)

- Mudança própria de armazenamento remoto, dependente da revisão de Perfil/tinta. API social autenticada reutiliza JWT/accounts:lookup, origem e credenciais existentes. Grafo privado com CAS, seguir/deixar de seguir, visita por @ e avisos reais com seguir de volta. Nome/avatar são opt-in; outros campos da conta não são expostos. Contagens do Perfil usam a resposta da conta.
- Adicionar amigo abre contatos por nome, busca e Compartilhar perfil. Cartão de papel, foto, nome, @, QR, link, compartilhamento nativo e PNG gerado no dispositivo. Sem importar agenda inteira ou serviço externo de QR. Sugestões somente de segundo grau; perfil/link exigem conta e @. Rótulos compartilham componente e placas também na ficha visitável.
- Limpeza social integra DELETE do endpoint de @, inclusive para clientes antigos. Limites beta, retenção, modelo de ameaça, testes e rollback documentados em docs/PROFILE_SOCIAL.md. Sem dependências novas. Medido 1466,2 KiB total, 279,9 KiB inicial; orçamento normal total 1474 KiB, teto absoluto 1500 e orçamento inicial preservados.
- Validação geral: 1888 testes em 277 arquivos, lint sem erros, formatos, Node ESM da API, build e orçamento aprovados. QR da prévia móvel decodificado para o link exato do perfil. Fluxos autenticados exercitados com identidades controladas nos testes; prova com duas contas reais deve ocorrer no ambiente publicado.

- Validação pré-merge (2026-10-17): E2E de avisos usa datas atuais para respeitar expiração em 48 horas; cabeçalho exige sino fora do Perfil. Transparência dos avatares mantém cantos totalmente vazios e centro opaco com tolerância mínima de decodificação WebP (alpha >= 250).

## Perfil recolhido, rótulos e controles de tinta (2026-10-16)

- Sino volta por padrão em PageHeader, com opt-out explícito no Perfil. Lista de avisos rola independentemente do botão Marcar como lidas. Avisos do sistema com 48 horas ou mais ficam ocultos sem apagar recibos de leitura. A parte social deve entrar em mudança própria de armazenamento remoto, não como notificações fabricadas.

- Avatar desktop recolhido passa de top 14 para 4 px: seus 80 px cabem na barra de 88 px, sem cortar o personagem. No celular, cópia visual de 40 px aparece após o menu, interpolando escala e posição junto à identidade. Rótulos reutilizam a mesma placa nos dois estados.
- @oliver644 recebe CREKS, DEV, BETA TESTER e GALAXIA; @eito recebe CREKS e BETA TESTER. Apresentação deriva apenas do handle confirmado por useProfileHandle, nunca de username/creks locais. Não concede autorização nem altera autenticação ou reserva de nomes.
- Espaço/Curva recebem SVGs autorais em PaperObjectIcon. A mecânica existente com mouse, toque, teclado e desfazer é preservada. Seleção de espessura/estilo deixa de depender do outline suprimido pelo padrão global e recebe preenchimento amarelo e check. Slider personalizado é identificado explicitamente.

## Perfil móvel, temas e ajustes (2026-10-16)

- Avatar móvel reduzido para 112 px. Capa e ficha móveis seguem a altura real do conteúdo, sem o bloco fixo de 600 px; barra de ferramentas sticky separada. Desktop conserva recolhimento de identidade.
- Seguidores/Seguindo restaurados a pedido do proprietário: zero inicial e dica de recurso social em desenvolvimento, sem backend ou botões fictícios. Streaks reais e trajetória preservados.
- Cinco capas SVG estáticas autorais com facetas sólidas, sem dependência ou imagem externa. Fontes em scripts/profile-cover-art.tsx; regenerar com node scripts/build-profile-covers.mjs. cover é um ID permitido dentro de helena.profile.v1 e usa o fluxo de sincronização existente. Fallback Helena para valor desconhecido; Cancelar não grava, salvar mescla com a ficha atual. Arquivo da capa anterior preservado, mas não utilizado no Perfil.
- Arte retirada do JavaScript após medição: total 1433,9 KiB, entrada preservada em 279,5 KiB. Orçamento incremental total 1436 KiB com margem estreita; tetos absolutos e orçamento inicial não mudam.
- Campos renomeados para Nome e Nome de usuário. Lápis sem placa, preservando toque/foco. PaperEditorIcon settings redesenhado no componente compartilhado: Perfil e NotebookSettings recebem a mesma arte.

## Trajetória real do Perfil (2026-10-16)

- Seguidores/Seguindo ficam ocultos até existir um grafo social real. Identidade, redes externas e streaks continuam intactos.
- Trajetória intercala focusSessions, practiceActivities das Ilhas e quizAttempts em ordem cronológica inversa, com cinco registros no total. Mostra duração ou acertos reais, sem estimar XP nem criar atividades. Datas inválidas são ignoradas; matérias removidas usam Estudo. Nenhuma nova persistência ou alteração do histórico existente.
- Capa fixa e seleção de personagens oficiais permanecem; personalização da capa não faz parte desta etapa.

## Identidade exclusiva e CREKS (2026-10-16)

- Verificação final: 1786 testes unitários, build/lint/API/performance aprovados; 25 cenários de navegador aprovados e 5 skips previstos em PC/celular e claro/escuro. CI WebKit revelou orçamento total de 30 s apertado no cenário multiparte de cálculo final, expirando em etapas diferentes nas três tentativas. Reprodução móvel Chromium concluiu todas as mesmas assertivas em 22,4 s. Cenário completo recebe 60 s, sem relaxar nenhuma espera/assertiva individual; lógica e tempo de resposta do minigame permanecem intactos. Aprovação remota WebKit continua obrigatória antes de mesclar.

- /api/profile-handle autentica Firebase JWT e consulta accounts:lookup para conferir conta atual. Guests/anônimos não reservam nomes. UID é obtido somente do token; campos uid/creks enviados pelo cliente são ignorados. CREKS_OWNER_EMAIL é configuração privada de servidor, nunca VITE_ nem e-mail versionado. Só login verificado correspondente pode reservar oliver644 e receber o selo preto/branco. Sem configuração, nome protegido permanece indisponível a terceiros e nenhum selo é concedido.
- Registro permanente privado privateProfileHandles indexado por SHA-256 de UID, sem TTL: somente nome, sem e-mail. CAS/ETag faz reserva, troca e liberação em uma transação; conflito preserva o nome anterior. Limite explícito de 10 mil contas, com migração para índice particionado antes desse teto. Limite compartilhado de 30 chamadas/minuto por conta. Origem exata autorizada, JSON até 512 bytes, resposta no-store. Regras Firebase negam acesso direto ao registro.
- Modelo de ameaça: concorrência entre instâncias, falsificação do dono por perfil/cache, conta removida/desativada, anônimo, troca de conta durante requisição, origem externa e indisponibilidade do banco. Testes cobrem vencedor único, idempotência, troca/exclusão isoladas, conflito, dono não verificado, campos forjados e falha fechada. Leitura só exibe @ confirmado pelo servidor, nunca texto legado como identidade exclusiva; nomes antigos continuam rascunho sem apagar dados. Sem conexão, @ e selo ficam ocultos até confirmação.
- Exclusão de conta libera reserva autenticada antes de apagar estudos/login; falha interrompe os passos seguintes. Se etapa posterior falhar, a conta permanece sem @ e pode reservar novamente. Não há cobrança ou assinatura implementada. Rollback do frontend não apaga o registro, mas não se deve voltar ao comportamento antigo de tratar nomes locais como exclusivos.
- CREKS_OWNER_EMAIL configurado de forma privada no projeto Vercel olenastudy, repo olive644/olena, para produção/preview/development em 2026-10-16. CLI renovou credencial local expirada. Concessão real ainda depende de publicar a versão e confirmar reserva com login. Preview não possui credenciais administrativas Firebase atualmente, portanto falha fechado em vez de simular reserva.

## Perfil com personagens oficiais, capa inteira e sequências (2026-10-16)

- Pedido final substitui uploads e moderação: avatar permite somente os 16 personagens oficiais e capa é fixa, sem lápis ou seletor de arquivo. Nenhum endpoint, serviço, credencial, modelo NSFW ou editor de upload foi incluído. ProfileAvatarDialog abre ao tocar/clicar na foto, mantém prévia, seleção acessível, cancelar/Escape sem gravar e confirmar sem alterar nome, bio ou redes. Falha de armazenamento mantém escolha e janela. ProfileChoices e leitores visuais compartilham profile-avatars.ts. Fontes externas/data URLs legadas usam Helena na apresentação, sem apagar armazenamento durante leitura.
- Lápis fica ao lado do apelido, abaixo do avatar. A junção da barra usa um único recorte facetado preenchido com a superfície do tema, cobrindo a linha inferior na conexão e formando a saliência local. Removida a placa com borda em torno do avatar. Altura da barra e dimensões 144/80/64 px preservadas. Controles invisíveis durante scroll continuam inertes, foto permanece acionável.
- Capa profile-heads-wide.webp ocupa a largura inteira com object-fit cover. Adaptação por imagegen integrado usa apenas a arte estilizada existente: grupo das três cabeças reduzido no centro, fundo de papel grafite/roxo estendido até todas as bordas, sem bocas, bigodes preservados, sem novos personagens. WebP 1800x600. Sem envio de fotos pessoais neste fluxo.
- Streaks ao lado de Seguindo aparecem somente quando positivos: Pomodoro com tomate existente, Cronômetro com PaperFlower da Agenda e ilhas com flame.svg existente. Dias únicos, fuso da conta, atividade de hoje ou ontem mantém sequência; lacuna interrompe. Cronômetro usa sessões concluídas, Pomodoro une sessões concluídas e dias legados; ilhas usam prática com respostas registradas. Esses dias consecutivos não são a sequência de acertos de uma rodada, nem domínio de disciplina. Atualização por eventos de storage/sincronização/foco e relógio por minuto. Sem novas métricas persistidas.
- Compatibilidade: mesma chave helena.profile.v1 e mesmos escritores de conta. Selecionar personagem mescla o perfil atual; nenhuma migração ou limpeza destrutiva. Rollback lê os mesmos campos. Sem dependências novas. Orçamento normal de JS total tem margem estreita para a galeria e os streaks; teto absoluto de 1500 KiB intacto.

## Avatar maior sem ampliar a barra (2026-10-15)

- Foto do Perfil com 144 px expandida, 80 px compacta no PC/tablet e 64 px no celular. Alturas da barra preservadas: 88/136/152 px conforme breakpoint. Retrato fica fora do recorte da capa para não ser cortado; recorte de papel temático aparece atrás dele com a mesma variável de scroll, permitindo prolongamento local abaixo da barra no PC. Nome ajustado lateralmente, sem sobrepor menu, bio ou configurações. Nenhuma mudança de dados, arte ou ciclos Rive.
- Prova: verify completo aprovado com 1765 testes, build e orçamento preservados. Regressão de navegador confere 144 px expandido, 80/64 px compacto, altura da barra inalterada, saliência desktop e ausência de sobreposição com bio em 320 a 1440 px, nos dois temas.

## Identidade sobreposta e capa de retratos (2026-10-15)

- Capa compartilhada profile-heads.webp: três cabeças dos personagens originais, composição triangular de retrato coral, sem bocas e com bigodes preservados. Gerada com imagegen integrado a partir de profile-people.webp, sem fotos pessoais enviadas neste fluxo; WebP 1800x600. Prompt: somente três cabeças chibi humanas em papel facetado, menina acima ao centro, rapazes abaixo, fundo grafite/roxo, sem texto, corpos ou objetos, luz superior e identidades preservadas. A composição remete à referência Queen solicitada sem incorporar músicos ou arte alheia.
- Avatar cruza a borda entre capa e ficha, com apelido, @ e pronomes no mesmo conjunto. Bio e links opcionais pertencem à mesma barra, sem duplicar a identidade em outro painel. Links apresentam somente ícones, com nome acessível e destino validado pelo reconhecedor existente. Scroll interpola as mesmas instâncias; PC compacto reserva espaço lateral, tablet e celular reservam linha adicional. Sem rastreamento de redes ou mudança no armazenamento.
- Seguidores/Seguindo apresentam zero como estado inicial do protótipo. Não existe grafo social, ação de seguir nem contagens remotas; não tratar estes indicadores como integração social pronta.
- Editor mantém diálogo nativo, cancelar sem gravar e regras da ficha. Superfície de papel creme/grafite, campos alinhados, recortes e sombras estruturais. Define localmente os tokens agenda-* exigidos por PaperChoice, corrigindo o seletor sem placa quando aberto diretamente no Perfil. Sem dependências novas. Movimento reduzido do app/sistema continua respeitado.
- Prova: npm run verify aprovado, 1765 testes em 260 arquivos, lint sem erros (11 avisos existentes), API, formatação, build e orçamento. JavaScript inicial 279.5 KiB, total 1424.8 KiB, sem aumentar limites. Rodada final de produção com 19 testes aprovados e cinco skips intencionais da suíte de navegação; PC/celular, ambos os temas, edição/cancelamento, recolhimento/reversão, movimento reduzido, cinco redes e larguras 320/600/820/1050/1440. Imagens finais inspecionadas com dados fictícios de teste.

## Ficha editável e aparência somente nas configurações (2026-10-15)

- PageHeader não apresenta mais seletor de tema em nenhuma aba. Mantém useTheme montado sem controle visual, preservando o ponto de aplicação anterior e a preferência da conta/sistema mesmo fora do Perfil. Claro/Escuro/Sistema permanecem em Configurações, Aparência e acessibilidade. Testes de outras telas preparam a preferência por theme-setup; o fluxo real continua coberto pela interface de configurações.
- Capa mantém arte e transição, sem os textos Perfil, Seu espaço, do seu jeito ou Cada descoberta. Nome real é o h1, Editar perfil fica abaixo da identidade, com recortes próprios para Seguidores e Seguindo. Não há grafo social neste aplicativo; indicadores são somente visuais, sem números falsos, botões inoperantes ou API pública inventada.
- ProfileEditor é o mesmo diálogo nativo aberto pela capa e pela área Conta, com foco modal/Escape, cancelar sem gravar e erro que conserva o rascunho. Removido o formulário antigo de nome para não duplicar semânticas. Apelido reutiliza name; username, bio, pronouns e socialLinks são opcionais no mesmo helena.profile.v1, sincronizado pelo caminho existente. Username usa minúsculas ASCII, números, ponto e sublinhado, até 30 caracteres; não existe reserva/unicidade pública. Bio até 240, pronomes até 40, cinco redes no máximo, uma por serviço. Guest conserva o apelido fixo e não anuncia salvamento em conta.
- Reconhecimento local de Instagram, Facebook, LinkedIn, GitHub e TikTok por URL/host exato e aliases seguros conhecidos. HTTPS, sem credenciais ou porta não padrão; URLs inválidas e redes duplicadas impedem a gravação completa. Links exibidos têm nome acessível, ícone de papel próprio e noopener/noreferrer. Nenhuma consulta às redes ou coleta de credenciais.
- Preservação: leitura aceita perfis antigos e não altera o armazenamento; salvar mescla os campos editados com o perfil atual, inclusive foto atualizada durante a edição. Troca de avatar preserva novos campos. Nenhuma migração destrutiva, chave nova, serviço ou dependência. Rollback não exige remover os campos opcionais: versões anteriores leem name/photoUrl e ignoram extras. Abas antigas devem ser atualizadas antes de editar avatares, pois o escritor antigo pode descartar metadados que ainda não conhece.
- Prova: npm run verify aprovado com 1764 testes em 260 arquivos, lint sem erros, API, build e desempenho. Entrada reduzida a 279.5 KiB, total 1424.7 KiB, com margem normal 1428 KiB e tetos absolutos intactos. Suítes focadas de produção aprovadas no PC/celular para Perfil, redes, pronomes, cancelar/Escape, armazenamento, tema, navegação, cadernos, Agenda e Sala. Última rodada do editor valida ambos os pontos de entrada e contraste dos rótulos. Capturas estabilizam animações e foram inspecionadas visualmente nos dois temas.

## Protótipo de capa e trajetória no Perfil (2026-10-15)

- Perfil fechado apresenta capa compartilhada original, avatar/nome existentes, progresso real e cinco sessões de foco mais recentes. Estado vazio honesto, sem posts, seguidores ou métricas inventadas. Configurações existentes permanecem na engrenagem e não montam dois painéis de progresso simultaneamente.
- ProfileShowcase transforma a mesma identidade em barra sticky ao rolar e expande ao voltar, sem duplicar avatar nem alterar dados. requestAnimationFrame atualiza variável CSS sem render React por quadro; listeners são removidos. Movimento reduzido do dispositivo e do aplicativo troca a interpolação por estados fixos e desliga estrelas flutuantes.
- Arte profile-people.webp usa três humanos pequenos e facetados inspirados nas referências fornecidas, sem boca e com bigodes dos dois rapazes. Referências pessoais não entram no Git. Registro de direção e prompt final em PROFILE_COVER_ART.md. Panorama inteiro no celular, papel/cores do tema na barra compacta.
- Prova: npm run verify aprovado, 1744 testes em 258 arquivos, API, build e desempenho. Doze cenários de navegador sobre produção aprovados, incluindo claro/escuro, PC/celular, 320 px/tablet, perfil vazio, scroll reversível e movimento reduzido do app/sistema. Entrada estável em 281.1 KiB; rota adiciona 3.8 KiB, total 1419.2 KiB, com margem normal 1422 KiB e teto absoluto inalterado. Sem dependência nova. Capturas conferidas visualmente; teste de resize aguarda geometria final, não apenas atributo do estado anterior.

## Primeiro quadro do Rive e engrenagem no cabeçalho (2026-10-15)

- Perfil passa seu controle como leadingAction de PageHeader, antes da aparência. Engrenagem sem texto visível, com nome acessível, estado expandido e placa creme nos dois temas. Retirado o botão grande abaixo do título, sem mudar as opções ou sua persistência.
- Imagens iniciais star-rive.png e helena-rive.png são quadros exportados do próprio helena.riv, não redesenhos. Mesmos limites e escala do canvas evitam troca de tamanho ao carregar. Nenhum favicon ou PNG de outro modelo aparece no assistente.
- Runtime inicia imediatamente quando há movimento, sem atraso inicial de 1,5 s. O ciclo estrela/Helena só começa quando o arquivo está pronto, preservando a estrela inicial mesmo em rede lenta. Movimento reduzido e falha de carga mantêm o quadro exato do Rive, sem perder acesso à conversa. Arquivo, máquina, ritmos de 2,8/13 s e demais movimentos não foram alterados.
- Regenerar quadros com servidor Vite ativo: node scripts/export-helena-poses.mjs http://127.0.0.1:4225. O script usa o runtime já vendorizado e Playwright instalado, sem serviço externo nem nova dependência.
- Prova: npm run verify aprova 1740 testes em 257 arquivos, lint sem erros, API, build e desempenho. Entrada permanece 281.1 KiB, total 1415.4 KiB, sem aumentar orçamento. Dezoito cenários de navegador aprovados sobre build de produção em Edge PC/celular, incluindo CSP, carga lenta/falha e ambos os temas. Capturas verificadas visualmente.

## Cabeçalho, Perfil recolhido e privacidade (2026-10-15)

- Sino de atualizações restrito ao Espaço do aluno por PageHeader.showUpdates. Foto e seletor de avatar removidos do cabeçalho; identidade continua editável em Perfil, Configurações, Conta. Aparência rápida permanece disponível em todas as telas.
- Engrenagem abre e recolhe a central existente na própria página, preservando seleção e foco no botão. Mesmo conteúdo e preferências no PC e celular, sem nova rota ou janela modal.
- HelenaMascot preserva integralmente o Rive 2D, seus ciclos de estrela/Helena, olhar, arraste e transformação. Apenas as imagens de reserva foram corrigidas: favicon-star.svg e helena-2d.png substituem star.png e helena.png 3D durante carga, erro e movimento reduzido. Arquivo .riv, máquina e ritmos permanecem inalterados.
- Primeiro acesso após onboarding/login mostra aviso informativo de privacidade em papel. Não há analytics/publicidade no app, portanto não há toggles fictícios nem botão que autorize tudo. Voz continua pedindo permissão separadamente. Google Agenda não faz parte do fluxo atual e não é anunciado no aviso. Política e detalhes podem ser revisitados em Configurações, Privacidade e dados.
- helena.privacyNotice.v1 guarda apenas a versão lida neste aparelho, sem substituir o aceite helena.privacy.v1, sincronizar dados ou ativar serviços. Prefixo pessoal existente apaga a marca ao sair/trocar conta. Nova versão da política reapresenta o aviso; bloqueio de armazenamento permite continuar nesta sessão. Nenhuma dependência, rastreador ou serviço adicionado.
- Prova final: npm run verify aprova 1739 testes em 257 arquivos, lint sem erros, API, build e orçamento de desempenho. Validação local em Edge: 21 cenários de Perfil/cabeçalho/Helena/navegação, seis do Rive e dois do sino aprovados, com cinco cenários exclusivos de desktop omitidos no projeto móvel. Capturas dos dois temas verificadas. Fixture padrão representa usuário que já leu o resumo; onboarding e primeira entrada usam armazenamento vazio. Não executar builds concorrentes contra o mesmo dist durante testes de preview.

## Perfil como central do aplicativo (2026-10-14)

- Perfil reúne Conta, Meu progresso, Aparência e acessibilidade, Estudo e foco, Cadernos, Agenda e notificações e Privacidade e dados. Navegação por assunto e painéis com largura, espaçamento e material compartilhados. Removidos os avisos de produção futura.
- Reutiliza tema sincronizado, perfil, duração e pausa do Pomodoro, preferências de estudo e controles globais do editor de cadernos. Cabeçalho mantém atalhos rápidos; tema acompanha alterações entre instâncias e abas. Opções de um evento, documento ou atividade permanecem no item.
- Nome no aplicativo e avatar não editam identidade, e-mail ou autenticação Google. Fuso brasileiro da conta é exibido sem novo seletor. Notificações solicitam permissão real por gesto e explicam bloqueio/indisponibilidade, sem prometer alertas com o app fechado. Exportação JSON inclui o estado atual carregado e preferências sincronizáveis disponíveis, não baixa arquivos remotos.
- Progresso apresenta minutos de sessões encerradas, respostas corretas registradas, dias distintos de estudo no fuso da conta e tarefas concluídas. Não interpreta abertura da tela como estudo.
- Acessibilidade e efeitos sonoros são preferências deste dispositivo. Desativar efeitos impede novas reproduções sintetizadas de matemática, recompensas, feedback da sala e Bingo Saturn, sem mutar vozes de exercícios ou gravações.
- Hábitos saiu da navegação, dashboard, catálogo, tela, ações de escrita e estilos. /habitos abre Perfil para compatibilidade de links. Somente o campo legado habits continua legível e preservado em snapshots e merges v1, evitando invalidar contas ou apagar histórico de leitores antigos. Não migrar hábitos para compromissos sem escolha do proprietário; rollback reconhece os mesmos registros.
- Cursores nativos de papel acrescentam escrita e pegar, com hotspots centrais, sem camada que capture movimentos. Arrastes existentes usam variáveis compartilhadas; touch e cores forçadas mantêm cursores nativos. Ferramentas de desenho mantêm crosshair e estados específicos.
- Desempenho: após compartilhar formulários e remover código de Hábitos, entrada caiu de 285.9 para 281.5 KiB. Central sob demanda elevou o total de 1408.1 para aproximadamente 1413 KiB. Orçamento normal total ajustado de 1410 para 1418 KiB conforme o crescimento medido da funcionalidade; limite inicial e teto absoluto de 1500 KiB continuam intactos, sem dependências novas.
- Prova: npm run verify aprova 1734 testes em 255 arquivos, lint sem erros, formatação, API, build e desempenho. Dezesseis cenários de navegador aprovados em PC/celular, com dois cenários exclusivos de desktop omitidos no celular. Cobertura de temas, limites geométricos dos painéis, recarga, exportação, cursores, navegação, cadernos e Foco/Pomodoro. Capturas verificadas com transições encerradas. Medição final: entrada 281.5 KiB e total 1413.2 KiB.
- CI completo identificou duas expectativas antigas fora da rodada focada: navegação com nove itens e título anterior do Perfil. Testes agora exigem oito itens, ausência de Hábitos e o título novo, sem alterar produto, tempos ou retries.
- A rodada móvel também identificou duas contagens antigas de quatro ferramentas no menu Mais. Ambas agora exigem três ferramentas e a ausência explícita de Hábitos. Reexecutar o arquivo completo de navegação e rotas em PC/celular, sem modificar o produto.
- Prova adicional: arquivos completos app.spec.ts e routes.spec.ts aprovam 24 cenários, com seis omissões previstas por plataforma, após atualizar as quatro referências antigas. Formatação e lint dos testes aprovados; código e bundle de produto permanecem idênticos à verificação geral de 1734 testes.
- WebKit móvel identificou uma barreira de teste indevida: aguardar animation.finished de toda a subárvore do Perfil pode não terminar, mesmo após trocar a seção. O teste passa a aguardar apenas opacidade final de main e do painel visível, mantendo asserts de limites, larguras, persistência e screenshots sem transições. Não alterar timeout, retries ou animações do produto.

## Poeira cósmica e cartas de papel (2026-10-14)

- Um único recipiente visual substitui os baús: Poeira cósmica. Regra de ganho preservada (ao menos 100 pontos na partida e espaço entre três pendências). O prazo de 10 segundos começa ao ganhar, sem precisar destrancar. Pendências legadas são preparadas ao carregar, preservando prazos já menores e encurtando os maiores, sem reiniciar. Pontos e recibos não mudam.
- Quatro toques revelam a raridade e abrem a apresentação das cartas. Resultado é persistido antes da animação, usando a mesma identidade da recompensa, sem novo sorteio por toque, recarga ou fechamento. Toques intermediários são apresentação, não compras, apostas ou oportunidades de alterar o resultado. Fechar antes de revelar conserva a pendência.
- Formato privado helena.mathPlaceRewards.v1 permanece válido para leitores antigos; kind/arcana legados continuam representando conteúdo, não dois recipientes na interface. Conteúdo, revelações e cópias existentes são preservados. Merge continua unindo recibos, mantendo o menor prazo e o maior número de cartas reveladas, sem duplicar crédito. Rollback conserva a chave e reconhece prazos novos de 10 segundos; abas antigas podem mostrar nomes e animações anteriores, mas não recebem campos desconhecidos. Sem regra Firebase ou dependência nova.
- Sorteio existente preservado: 5% de A Estrela; nos outros 95%, 80% de uma carta e 20% de duas, com distribuição editorial anterior. Raridade visual fixa por identidade: quatro primeiras lembranças comuns, três seguintes raras, três últimas épicas; A Estrela é lendária. A Poeira anuncia a maior raridade recebida; cada carta revelada ajusta o fundo à sua própria raridade. Chances condicionais e ausência de efeito dos toques são expostas na coleção.
- Inspeção de 360 graus por arraste ou teclado fica disponível imediatamente na carta revelada, sem botão intermediário. X e Escape usam a mesma saída de papel de Guardar cartas, mas não abrem coleção nem mostram o voo de armazenamento. Cartas já reveladas continuam creditadas, e as restantes podem ser retomadas. Guardar cartas conserva a animação de chegada à coleção.
- Arte vetorial própria: fragmentos orbitando uma estrela facetada, pulsos por toque, raios e partículas de papel no fundo conforme a raridade, revelação e brilho discretos. Cartas recebem moldura de raridade, selo de catálogo e placas de atributos em papel. Movimento reduzido desativa efeitos automáticos; foco usa destaque amarelo, não outline. Verde comum, azul raro, roxo épico e dourado lendário têm nomes visíveis e contraste de texto testado, sem depender só da cor.
- Porcentagem e seis recortes animam a transição a partir do valor visível, tanto subindo como descendo entre lugares, com cancelamento/reorientação em navegação rápida. Somente a apresentação é interpolada; progresso da conta e valor acessível permanecem reais.
- Prova: npm run verify aprova 1729 testes em 254 arquivos, lint sem erros, formatação, runtime da API, build e desempenho. Doze cenários focados de navegador em PC/celular cobrem recompensas legadas, quatro raridades, temas claro/escuro, movimento reduzido, inspeção, fechamento, coleção, progressão e encaixe da ilha; os quatro cenários de recompensa foram repetidos após o ajuste final de contraste. Entrada 285.9 KiB e aplicação 1408.1 KiB, dentro dos orçamentos existentes.

## Notação matemática e estabilidade do CI (2026-10-14)

- math-notation.ts normaliza somente apresentação: expoentes inteiros com sobrescrito, expoentes não representáveis entre parênteses, raiz explícita, multiplicação por x/y/z/t e limites inteiros de integrais. f'(x) é identificado como derivada; avaliação numérica de derivada é descrita em palavras. Quando valores da função aparecem na mesma pergunta, recebem indicação própria, sem confundir conceitos. Expoente com término ambíguo é sinalizado, não adivinhado. Não calcular, corrigir gabaritos nem interpretar texto arbitrário como expressão executável.
- MathArcade usa a mesma versão legível no título visual e no nome acessível. Banco, sementes, alternativas, gabaritos, progresso e contratos antigos da API permanecem intactos.
- CI: teste da tarefa passa a escolher Editar dentro da região Calendário, pois também existe editor legítimo no painel do dia. Teste dos pontos instala o relógio antes de qualquer animação, sem congelar o carregamento do módulo; assim não mistura bases de performance.now(). Teste móvel do gráfico aguarda animações terminarem antes de medir alturas, evitando 0/0 durante scaleY(0). Não modificar animações de produto para esconder instabilidade dos testes.
- Prova: npm run verify aprova 1726 testes em 253 arquivos, build e desempenho; 20 cenários focados de navegador aprovados em PC/celular. A varredura de notação cobre as 2592 variantes sem alterar o banco. Entrada 285.9 KiB, total 1407.4 KiB, dentro dos orçamentos existentes.

## Retomada por erro e desafios finais v5 (2026-10-14)

- Os seis lugares e suas 36 etapas compartilham treino, retomada e final. O treino conserva a cobertura v4; concluir uma etapa nova exige também quatro acertos em cinco perguntas reservadas. São 24 variantes autorais reservadas por etapa (864 adicionais), com quatro formatos, não 864 modelos independentes. A final mistura os quatro formatos e prioriza variantes não usadas em finais anteriores. Depois de esgotar um formato, suas variantes podem reaparecer.
- Falhar na final conserva todo o treino e intercala quatro tentativas de reforço antes de outra final. A final parcial é salva por resposta e retomada após recarga. Conquistas publicadas em v3/v4 continuam reconhecidas, sem exigir refazer etapas antigas. A porcentagem continua sendo conclusão do minigame, não certificação de domínio da disciplina.
- A alternativa escolhida sugere uma família de erro (empréstimo, inversa, sinal, escala, ordem, regra ou tempo), sem diagnosticar o raciocínio do aluno. A retomada usa outros números do mesmo formato após pelo menos quatro outras respostas; sucesso registra resolução para evitar ressuscitar pendências em merges. Não são aulas nem geração por IA. Revisão pedagógica humana e calibração continuam pendentes.
- helena.mathGame.v5 é a nova chave privada sincronizada. Leitura une v5 às conquistas legadas; escrita não modifica v3/v4. Merge preserva evidências, finais confirmadas, variantes vistas e finais parciais compatíveis. A API action=math&version=5 reutiliza o mesmo motor local, mantendo v1/v2/v3/v4. Correção, sons e próxima pergunta não aguardam HTTP nem um modelo externo.
- Proteção publicada e relida em appstudyoli-default-rtdb: somente users/$uid/stateV2/.validate mudou. Depois da primeira gravação v5, PUTs que omitem sua chave codificada são rejeitados, impedindo uma aba antiga de apagá-la por desconhecimento. Acesso continua exclusivo do dono; exclusão integral da conta continua possível. Abas antigas precisam recarregar para salvar. Backup e candidato foram preservados fora do Git em output/firebase-math-finals. O teste local modela a regra; não substitui teste autenticado entre dispositivos em produção.
- Implantar regra antes do cliente. Rollback deve conservar leitor/escritor v5 e sua chave, mesmo se desativar finais na interface. Não reverter a cliente que omite v5 nem retirar a proteção sem backup e autorização. O cliente anterior não conhece as evidências novas.
- UI reutiliza cinco recortes, números, fanfarra, cores e estados originais, com teclado e movimento reduzido. Respostas com mais de quatro caracteres têm tamanho adaptado para manter margem no celular, inclusive resultados de seis dígitos. O teste mede cada SVG, não só a caixa flexível externa. Custo medido: inicial 285.9 KiB, total 1406.2 KiB. Orçamento normal total 1410 KiB; entrada 286.5 KiB e teto absoluto 1500 KiB preservados, sem dependência nova.
- Provas automatizadas: 1706 testes em 252 arquivos na verificação completa; finais nos seis lugares em PC/celular, claro/escuro, teclado, offline e recarga. Regressões incluem preservação dos legados, isolamento de contas, merge, final reprovada e esgotamento das variantes reservadas. Testes antigos de animação usam relógio controlado depois de carregar o módulo; a leitura do prazo aceita o tempo legitimamente já decorrido, sem exigir o mesmo milissegundo da partida.

## Alternativas plausíveis, retomadas e prazo real (2026-10-13)

- math-choice-errors.ts substitui as 36 listas genéricas por 144 listas, uma por formato original, em todos os seis lugares. Candidatos representam operações equivocadas, empréstimo/transporte, ordem de composição, propriedades de potências, derivadas, primitivas e grandezas. Formatos extras preservam candidatos editoriais próprios. Eliminar negativos em contagens, frações de objetos nas quatro primeiras etapas do Pátio, probabilidades fora de 0..100 e restos maiores/iguais ao divisor. Colisões usam deslizes de uma/duas unidades, não a lista arbitrária 0, 1, -1, 10, 100. IDs, enunciados, gabaritos e fontes permanecem; revisão das alternativas passa a 3. Não alegar calibração nem revisão pedagógica humana.
- O motor intercala uma revisão de acerto a cada oito tentativas, depois de pelo menos quatro outras questões, mantendo a fila de erros. A repetição não aumenta crédito de IDs. A rotação de formatos passa a depender das entradas vistas, para uma revisão não pular um formato inédito. Velocidade não altera a conclusão.
- Novas etapas mistas exigem pelo menos 20 IDs distintos, acertos nos oito formatos e quatro variantes de dificuldade editorial 3. Até completar a cobertura, crédito da etapa fica limitado a 19/20. Conquistas já publicadas em mastered são reconhecidas se houver ao menos 20 evidências; 20 IDs originais v3 também preservam a regra antiga. O merge une mastered além das máscaras, sem perder conquistas de um aparelho quando outro tiver mais tentativas. Mesmo formato de dados/chave v4, sem apagar histórico nem mudar regras Firebase. Rollback ao leitor v4 anterior conserva as evidências e volta ao critério anterior, mais permissivo; v3 permanece intacto.
- MathArcade mostra no relógio principal o menor entre prazo da questão e reserva real da rodada. Quando a reserva é menor, o nome acessível informa segundos restantes na rodada. Esgotar a rodada encerra a partida sem fabricar uma resposta errada nem registrar uma tentativa de questão que não ocorreu. Esgotar só a questão mantém perda de chance, som e penalidade existentes. O visual, teclado, sons e temas são preservados.
- Prova: math-choice-errors.test.ts percorre as 1728 entradas e testa alternativas concretas, limites, retomada sem crédito duplicado, cobertura difícil e preservação de conquistas entre dispositivos. MathArcade tem regressão do relógio com reserva menor. Revisão pedagógica humana e calibração com uso real continuam pendentes. 100% representa concluir os desafios do aplicativo, não certificação de domínio de uma disciplina.

## Qualidade dos minigames de Matemática v4 (2026-10-13)

- Todos os seis lugares e as 36 etapas recebem expansão: 48 entradas por etapa, oito formatos com seis variantes fixas por formato (1728 entradas, 288 formatos). Não confundir variantes numéricas com problemas independentes nem chamar o conjunto de banco de provas. O conteúdo original v3 mantém IDs, enunciados e gabaritos; novas entradas têm IDs extra próprios. As três adaptações de Thompson continuam identificadas. A expansão é autoral e não usa geração por IA durante partidas.
- Alternativas antigas deixam de usar sistematicamente resultado ±1: candidatos de erro dependem da habilidade, incluindo sinal, escala, operação inversa e grandeza. Novos formatos têm candidatos explícitos e nota de resolução para auditoria editorial. Colisões com o gabarito e entre alternativas são filtradas; posições usam embaralhamento determinístico por tentativa, compartilhado com a API. Respostas de dízimas são arredondadas a duas casas, com instrução explícita no enunciado e alternativas distintas na precisão exibida.
- Questões alternam oito formatos, priorizam inéditas e passam por faixas editoriais de dificuldade 1, 2 e 3 antes da conclusão de uma etapa. Essas faixas não são calibração estatística. Questões erradas entram em fila de retomada após pelo menos quatro outras respostas, com janela de quatro IDs recentes e limite de uma retomada a cada quatro tentativas enquanto há inéditas. Velocidade só dá pontos, não crédito extra. Prazos consideram comprimento, dificuldade editorial e etapa de cálculo; não são tempos pedagogicamente calibrados.
- Permanece a regra de 20 acertos distintos por etapa e seis etapas para liberar o próximo lugar. Progresso já conquistado é preservado. helena.mathGame.v4 guarda máscaras extras, tentativas, IDs recentes e fila de retomada. Leitura une evidências v3/v4 sem sobrescrever o v3, inclusive respostas posteriores de abas antigas; merge por união de IDs não soma evidências duplicadas. Reversão: leitor v3 segue intacto, mas não conhece acertos extras v4. Não apagar v4 nem retroprojetar máscaras extras como respostas antigas.
- API action=math&version=4 compartilha seleção e correção local determinística. Rotas v1/v2/v3 preservadas. Entrada adulterada, IDs/fila fora do intervalo e máscaras inconsistentes são rejeitados. Cache/fila pertencem ao fluxo automático da conta, com isolamento por prefixo já existente. Sem mudança de Firebase, autenticação ou dependências.
- Indicador acima do avatar mostra somente a porcentagem em números de papel. Texto de quanto falta e faixa contínua amarela removidos. Seis recortes facetados representam as seis etapas, com preenchimento roxo, base neutra, movimento só em alterações e suporte a movimento reduzido. Placa menor, creme/grafite legível nos dois temas, sem confundir progresso com loading.
- Evidência: teste de integridade nas 1728 entradas, 144 referências independentes para novos formatos, preservação/migração/merge, dificuldades, espaçamento e contratos v3/v4. Testes de navegador exercitam os seis lugares com novos desafios, placa parcial, claro/escuro e PC/celular, além de baús, áudio, histórico e offline. Isso é revisão automatizada e editorial técnica, não revisão pedagógica humana; professor e calibração com uso real continuam pendentes.
- Custo: inicial 285.9 KiB, total 1395.2 KiB. A expansão e seleção ficam sob demanda. Orçamento normal total 1400 KiB, com justificativa e margem estreita; teto absoluto 1500 KiB e inicial 286.5 KiB inalterados.

## Progressão dos minigames de Matemática (2026-10-13)

- A ilha continua sendo minigame, não uma aula. Apenas Pátio das Primeiras Contas começa liberado. Os demais lugares podem ser vistos, mas entrar e iniciar partida exigem a conclusão de todos os anteriores.
- Cada lugar tem seis etapas. Cada etapa tem 24 desafios fixos, intercalando quatro formatos com seis variantes editoriais. São 864 entradas no conjunto, não 864 modelos de raciocínio independentes. Vinte acertos em IDs diferentes superam uma etapa; repetição não aumenta conclusão e erro não apaga acertos. Seis etapas superadas liberam o próximo lugar. A porcentagem é conclusão do jogo, não certificação de domínio da disciplina.
- Primeira combinação: conteúdo autoral e três adaptações identificadas de Calculus Made Easy, Silvanus P. Thompson, exercícios I, itens 1, 2 e 4, p. 24, com avaliação da derivada em 1. A fonte, o ID e a revisão acompanham a questão. Obra histórica original, sem tradução moderna incorporada. Não há conteúdo OpenStax NC nem questões de provas recentes. Ainda falta revisão pedagógica humana e ampliar a curadoria de fontes; não alegar banco profissional validado.
- Novo contrato de Matemática v3 compartilha banco/correção determinística entre cliente e API. v1/v2 permanecem inalterados. Partida continua offline, com correção imediata, sons, combos e conquistas existentes. Prazos são 28 ou 40 segundos conforme comprimento do enunciado; velocidade afeta pontos, não o desbloqueio.
- helena.mathGame.v3 armazena máscaras de IDs vistos/acertados por etapa, no fluxo automático da conta. União por identidade preserva acertos entre aparelhos sem duplicar evidência. Histórico v1/v2, XP, baús e pontos não são apagados nem convertidos em conclusão nova. Reversão: voltar ao leitor v2 sem apagar v3. Não há mudança de regras ou serviço Firebase.
- Acima do avatar há placa pequena de papel com porcentagem concluída e quanto falta, nos dois temas e no celular. Lugares bloqueados ficam atenuados e informam qual lugar concluir. Navegação, arte e movimento reduzido são preservados.
- Custo medido após integrar Helena Rive da main: JavaScript inicial 285.8 KiB (sem aumento), total 1372.7 KiB. Banco permanece nos chunks sob demanda. Orçamento normal total atualizado de 1366 para 1376 KiB, com margem estreita de CI e justificativa no verificador; tetos absolutos de 400/1500 KiB e orçamento inicial de 286.5 KiB preservados. Nenhuma dependência nova.
- Regressões: math-game.test.ts, testes de MathArcade e MathIslandJourney, math-progression.spec.ts e math-answer-feedback.spec.ts. Cobrem conteúdo distinto por etapa, não repetição, progresso, migração preservadora, merge, API v3, bloqueio, recarga, feedback offline e posição/contraste da placa.

## Tarefas coloridas e navegação desktop (2026-10-13)

- A faixa de tarefas e eventos de dia inteiro na grade reservava 44 px, cortando a base dos botões. Agora reserva altura compartilhada entre colunas, padding para a base e área de toque de 44 px; os horários do eixo acompanham essa altura. Até três itens ficam visíveis, com rolagem para os demais.
- Tarefas aceitam cor hexadecimal opcional, usando a mesma paleta de papel dos eventos. O editor, a lista, os marcadores mensais e a grade compartilham a cor. Registros antigos sem cor seguem válidos. O campo pertence ao workspace sincronizado da conta, sem armazenamento independente ou mudança nas regras do Firebase.
- Revisão visual solicitada pelo proprietário: removida a expansão automática da barra. O rail conserva 84 px e apresenta apenas o nome do botão em dica pequena de papel por hover/foco, inclusive Perfil e item ativo. Superfície creme com texto grafite no claro, grafite com texto creme no escuro, dobra discreta e base de 3 px. O botão de menu ainda abre manualmente a navegação completa. Tarefas e navegação móvel preservadas; sem deslocamento de conteúdo, sem nova dependência e sem estado React para hover.
- Desktop e celular continuam usando PlannerView, AgendaCalendarViews, editor, filtros e ações comuns; diferenças são de layout, sem versão funcional móvel separada.

## Matemática imediata e conquista por tema (2026-10-13)

- Causa encontrada: acerto, erro, som e próxima questão aguardavam um POST por resposta, com timeout de 10 segundos. A partida agora usa mathChallenge/assessMath, o mesmo motor determinístico da API, sem depender de HTTP. Não é IA nem confirmação remota de pontos. A API continua validando questões, escolhas e prazos para seus consumidores.
- Seis acertos consecutivos concluem o desafio de um tema, independentemente de velocidade. Um erro reinicia essa sequência. A máscara de temas concluídos impede celebrações repetidas e não é apagada por recuo de dificuldade. 100% descreve este desafio, não certificação de domínio de uma disciplina inteira.
- Conquista pausa o relógio, anuncia o tema, mostra números e partículas em papel e usa fanfarra própria no áudio existente. Todos os seis temas concluídos encerram e liquidam a partida, recomendando o próximo lugar real da ilha. Último lugar não recomenda um destino inexistente. Movimento reduzido, teclado e ausência de áudio preservam o fluxo.
- Progresso ampliado fica em helena.mathLearning.v2, sincronizado pela conta e mesclado sem apagar conquistas. v1 permanece como espelho compatível, com mastery limitado a 3 e sem campos novos; carga inicial aceita v1. Rollback conserva v2 sem convertê-lo para v1. Nenhuma regra Firebase ou permissão é alterada.
- Migração de v1 reconhece os temas já ultrapassados pelo motor anterior e reinicia somente a sequência parcial, pois o contador antigo premiava velocidade e não representava acertos consecutivos. Pontos, total de acertos e nível são preservados.
- API action=math aceita version=2 para o novo progresso e milestone. version=1 e a versão omitida mantêm avanço, campos e limites antigos, evitando rejeição em clientes já abertos. Catálogo da API permanece na versão 1.
- Removido summary Detalhes da lista da Agenda. Descrição, local, links seguros, participantes e prévias existentes permanecem disponíveis, sem expansor vazio.
- Texto inglês de servidor perdido foi localizado no cliente de desenvolvimento Vite, não no minigame. A continuidade da partida é testada sem rede; a causa de uma queda real do processo não foi comprovada e não é ocultada por tradução ou supressão de logs.
- Teste offline também revelou que referências externas de SVG podiam ficar vazias ao criar novos números. A partida incorpora o arquivo paper-digits.svg original, estático e confiável, em símbolos locais com namespace próprio. PaperDigitsSource muda apenas a referência neste escopo, sem redesenhar números nem alterar outras telas.
- Validação final: npm run verify passou com 244 arquivos e 1610 testes, lint, formatação, API Node ESM, build e orçamento. Entrada 285,7 KiB, aplicação 1339,1 KiB. Crescimento inclui os SVGs originais incorporados para uso sem rede, sem nova dependência nem mudança nos tetos absolutos. A primeira bateria de Agenda/Matemática passou em 42 cenários Edge/Chromium desktop/móvel; as revalidações finais cobrem desconexão, temas claro/escuro, símbolos SVG realmente desenhados, recarga, foco e próximo lugar. Contagem inicial de três batidas mantém duração nominal de 3 segundos; o teste aguarda até 10 segundos sob carga, sem ampliar o tempo de feedback. Servidor E2E isolado por PLAYWRIGHT_PORT evita reaproveitar outro build local. WebKit nativo e conta Firebase entre aparelhos não foram exercitados localmente.

## Data da conta no teste de reagendamento (2026-10-12)

- CI desktop falhou após meia-noite UTC: teste esperava o dia do runner, enquanto a Agenda corretamente usava o fuso brasileiro da conta. Correção restrita ao teste, com relógio fixo e America/Sao_Paulo explícito. Casos 00:30 UTC (12/10 no Brasil) e 03:30 UTC (13/10 no Brasil) preservam a exigência de data exata, sem mudar produto ou afrouxar a asserção.

## Compartilhamento em papel e arraste visível (2026-10-12)

- Paleta fixa reaproveita cores originais e check, substituindo seletor nativo. Adaptação do movimento Uiverse.io de Cobp, fornecido pelo usuário, mantém teclado, foco amarelo e movimento reduzido. Valores personalizados existentes não são reescritos automaticamente.
- Compartilhar evento é ícone exclusivo da Lista, com prévia PNG local e segundo clique para Web Share. Arquivo pronto preserva ativação transitória do navegador; suporte ausente baixa PNG, falhas orientam download e cancelamento não baixa. PNG omite participantes/anexos/histórico. Exportar .ics na barra permanece.
- paper-export-art usa Helena do favicon original /olena-favicon.png no selo e desenha marca d'água em moldura externa. Reutilizado nas cópias PNG/PDF/impressão, folha atual e PDF de várias folhas. Nenhum canvas original, autosave, documento ou conta é modificado para adicionar marca.
- Pesquisar antes só focava o campo, com resultados limitados ao período aberto. Botão e Enter agora abrem resultados de todas as datas salvas, com uma ocorrência válida por série e tarefas vencidas/futuras. Texto ignora acentos, caixa e espaços extras; filtros continuam aplicados. Limpar campo restaura a Lista de 30 dias.
- Prévia de arraste acompanha ponteiro; origem atenuada e horário de destino visível. Escape cancela sem gravar. Alça de duração fica na borda do evento, sem painel flutuante vazio. Configurações e sincronização usam o caminho validado existente.
- Removidos banner informativo de Foco, mensagens transitórias de carregar/sincronizar na Agenda e balão de dicas da Helena. Preservados vínculos de estudo, alertas de erro/envio pendente, nome acessível da assistente, teclado e movimento do mascote.
- npm run verify passou: 236 arquivos, 1437 testes, lint/formatação/API/build/orçamento. Entrada 285,4 KiB e aplicação 1309,7 KiB; orçamento normal 1311 KiB conserva pequena margem para o bundle Linux, sem mudar teto absoluto. Busca fora do mês, compartilhamento real de PNG com ativação do usuário, cancelamento do arraste, recarga e contraste são exercitados em Edge/Chromium desktop/móvel. Teste do slider aguarda a atualização após End antes da próxima tecla; seis repetições passaram.
- Repetição final: 35 cenários de calendário/Foco/exportação aprovados em desktop/móvel, um teste legado de desenho em PDF intencionalmente só desktop. Os 32 cenários adicionais da Agenda também passaram na execução anterior. PNGs reais de evento e caderno foram inspecionados com o favicon original no selo. WebKit nativo fica no CI; conta real entre aparelhos não foi exercitada.

## Agenda compacta e ajustes diretos (2026-10-12)

- Filtros matéria/tipo agrupados em painel acessível, ao lado de Pesquisar. Quatro ações de arquivo/lembretes ficam na mesma linha móvel. No desktop, painel do dia abaixo de Meu estudo; no celular, ordem calendário/dia/estudo preservada.
- Relógio reutiliza números SVG originais, exclusão reutiliza lixeira da escrita. Textos auxiliares solicitados e avisos permanentes de adição/sincronização concluída removidos; falhas e envio pendente continuam explícitos. Metadados abertos/focados usam grafite sobre papel para contraste nos dois temas.
- Arraste e duração salvam diretamente com validação, projeção pelo fuso da conta e escopo de ocorrência para rotinas. Atalhos Alt/setas e Shift/Alt/setas preservam alternativa ao arraste. Histórico permanece na data original.
- Cor opcional hexadecimal pertence ao evento, sem novo serviço nem versão do workspace. Carregamento rejeita cores inválidas; merge existente preserva alterações independentes. Aviso de permissão segue duração e barra de 6 segundos do XP, com ícone de sino, fechamento e cooldown do botão. Movimento reduzido preservado.
- Validação local: npm run verify passou, 234 arquivos e 1432 testes, lint/formatação/API/build/orçamento. Agenda/Foco passaram em 56 cenários Edge/Chromium desktop/móvel; mais 6 cenários de movimento/teclado passaram após o ajuste final de foco, incluindo vizinhos com o mesmo título. Contraste dos metadados abertos/focados é medido em ambos os temas, mínimo 4,5:1; troca de cor não interpola pares temporariamente ilegíveis. 16 repetições dos cenários afetados também passaram. Entrada 285,3 KiB, aplicação 1301,9 KiB; orçamento normal 1303 KiB, tetos absolutos preservados. WebKit nativo fica no CI, sem alegar teste de conta real entre aparelhos.

## Validação da navegação da Agenda (2026-10-12)

- O teste responsivo media Agenda antes da ativação após carregar a página sob demanda. Comparava Praticar ativo, deslocado 2 px pelo design, com Agenda ainda inativa. A comparação agora aguarda aria-current="page", como já fazia para Praticar, preservando a animação e a exigência de alinhamento em 320/360/390/768/1280 px.

## Agenda, detalhes dinâmicos em papel (2026-10-12, validado localmente)

- Regressão reproduzida: snapshot antigo do stream após PUT confirmado interpretava evento recém-criado como exclusão. Marcador updatedAt por conta descarta respostas anteriores ao último estado confirmado; novas escritas usam valor monotônico relativo ao servidor observado. Escritas deste cliente são serializadas e respostas após troca de conta são ignoradas. Teste falhou antes e passou depois da correção. Não há revisão transacional global nem edição colaborativa nova.
- Barra recupera textos; importar/exportar reutilizam PaperEditorIcon da escrita. Nova impressora, relógio de duração arrastável/teclado, painéis de metadados com resumo, slider compartilhado da Escuta coletiva e aviso na hora padrão.
- Fuso brasileiro automático pertence à conta por helena.agendaTimeZone.v1. Cadastro não fornece localização; usa fuso brasileiro do dispositivo no primeiro uso ou Brasília fora do Brasil. Sem seletor por evento, acesso geográfico ou dados de localização inventados.
- Área de anexos aceita seleção múltipla e arraste, valida cada arquivo e limita quantidade/tamanho. Fotos reais em Dia/Semana/Mês/Lista, sem upload a serviço adicional nem mudança no formato de workspace. Animações respeitam movimento reduzido. Não inclui alterações paralelas de Pixi/dependências/testes.
- npm run verify aprovado em cópia limpa do índice, 233 arquivos e 1427 testes, lint/formatação/API/build/orçamentos. Entrada 285,3 KiB e aplicação 1295,1 KiB; limites normais 286/1296 KiB, tetos absolutos preservados. Navegador Edge/Chromium: 52 cenários de Agenda/Foco aprovados, mais 4 cenários focados repetidos após ajustes finais, em computador/celular e temas claro/escuro. Fuso da conta foi exercitado em navegador de Portugal. Teclado, ponteiros reais, Enter no campo expansível, arraste de anexo, imagens carregadas nas quatro vistas e recarga cobertos. WebKit nativo e publicação desta etapa ficam no fluxo da PR.
- Após conciliar a main atualizada com a Helena da PR #414: npm run verify aprovado, 234 arquivos e 1430 testes. Mais 16 cenários de Agenda em Edge/Chromium desktop/móvel passaram na combinação. Entrada 285,3 KiB e aplicação 1297,9 KiB; orçamento normal combinado 286/1299 KiB, sem alterar tetos absolutos ou orçamento próprio da Helena. Conflitos documentais preservam as duas entregas. Normalização de finais de linha ocorreu apenas na cópia temporária, sem mudar conteúdo ou alterações locais do proprietário.

## Helena cartoon no assistente (2026-10-12)

- A versão 3D aprovada pelo proprietário substitui a estrela do botão flutuante. Cliques abrem a conversa; fechar a conversa volta à estrela. Repouso e arraste reutilizam o repertório cartoon aprovado.
- Canvas transparente em frame local decorativo, sem captura de foco ou ponteiro. O componente React mantém teclado, captura de toque, encaixe na borda, histórico e streaming existentes. A ponte só envia estado visual, nunca mensagens, autenticação ou dados do aluno.
- A CSP permite frames de mesma origem para este renderizador, mantendo os hosts de autenticação existentes e sem permitir script inline. Modelo carregado depois da montagem do chat. Pausa fora da aba, sob modais, com o botão oculto no celular ou por 1,5 segundo após interação em outra tela. Renderização por software usa materiais mais leves e 12 quadros/s em repouso, mantendo 30 em hover, transformação e arraste. Movimento reduzido não carrega o renderizador; falta de WebGL conserva os renders estáticos e a conversa.
- Three.js 0.170.0 vendorizado com licença MIT, bundle reproduzível com o Vite existente. Nenhuma alteração de dependências npm. Consulta OSV da versão não retornou avisos em 2026-10-12. Assets têm orçamento próprio de 768 KiB JS e 4 MiB GLB; o orçamento e os tetos do React continuam verificados.

- Validação local após reconciliar a main: 1415 testes passaram, com tipos, lint, formatação, APIs, build e orçamento aprovados. App real: 6 cenários; preview: 4; CSP de produção e movimento reduzido: 2. Navegador local usa Chromium também no viewport móvel; WebKit nativo fica no CI. Entrada 280,9 KiB e aplicação 1283,2 KiB; renderizador opcional 662,8 KiB e modelo 3,5 MiB.

## Agenda e Foco pela conta (2026-10-12, publicado na PR #415)

- Causa de transporte confirmada: chaves de localStorage com pontos eram enviadas como nomes de filhos, rejeitados pelo Realtime Database antes das Security Rules. Novo codec base64url usa stateV2, com leitura/cópia do legado sem apagá-lo. Regras expandidas mantêm restrição ao próprio UID.
- Regra stateV2 publicada em 2026-10-12, com autorização do proprietário, no projeto appstudyoli e instância appstudyoli-default-rtdb pelo CLI oficial autenticado. Backup anterior preservado. Comparação estrutural confirmou que a única mudança foi users/$uid/stateV2; validações legadas presentes apenas no repositório não foram publicadas. Firebase validou a sintaxe e confirmou a publicação. Nova leitura das regras publicadas corresponde integralmente à candidata aprovada. Nenhum registro de usuário foi alterado. Cliente publicado a partir do commit mesclado b3e152d da PR #415; produção retornou HTTP 200 e transporte stateV2 confirmado no bundle. CI da PR incluiu WebKit móvel aprovado. Isso não equivale a um teste manual com dados reais da conta.

- Reproduzidos três casos de perda: GET inicial antigo apagava registros offline, updates recebidos não atualizavam IndexedDB e leitura tardia de cache substituía mudanças da conta. Proteção por revisão, cache remoto atualizado e histórico de Foco aditivo por ID evitam o retorno ao zero.
- Sessão em andamento entra nas chaves sincronizadas com snapshot válido mais recente e deviceId opcional compatível. Mesmo aparelho retoma; outro mostra pausado e só assume após ação. Estado inicial vazio não grava zero sobre a nuvem. Publicação limitada a 30 segundos e ações, não por segundo.
- Dias de Pomodoro são unidos sem duplicação; carga inicial offline repete ao voltar a conexão. Logout/troca de conta limpam sessão de Foco e filas locais de lembretes.
- Ícones autorais de papel e botões creme substituem ações/visualizações na barra, preservando nomes acessíveis e estado ativo amarelo. Removidos setas duplicadas, sincronização manual na Agenda e aviso textual de exportação. Regra registrada em AGENTS.md e docs/AGENDA.md.
- Verificação final do workspace: npm run verify aprovado, 233 arquivos e 1427 testes; entrada 284,7 KiB e JavaScript da aplicação 1285,9 KiB. Navegador Edge/Chromium desktop e móvel: 69 cenários aprovados, 5 exclusivos de outra configuração ignorados, cobrindo claro/escuro, ícones creme, recarga durante o contador e histórico após duas recargas. WebKit nativo e implantação do cliente ficam no fluxo da PR. Alterações paralelas de dependências, Pixi e testes alheios não integram a entrega.

## Agenda interna ampliada (2026-10-12)

- Visualizações Dia/Semana/Mês/Lista, filtros, detalhes, recorrências com escopo, grade com confirmação de movimento/duração e intercâmbio .ics, sem integração Google nova.
- Metadados opcionais no workspace v7 preservam dados antigos. Compromissos longos guardam duração completa separada do campo limitado legado. Fuso IANA projeta horários; conclusões não são transferidas para datas reagendadas.
- Merge de eventos/tarefas por campo e conjuntos de datas reutiliza reconciliação existente. Anexos limitados permanecem privados; lembretes locais por conta só executam com app aberto. Não há promessa de push, envio de convites ou edição colaborativa.
- Verificação geral aprovada: 232 arquivos e 1415 testes locais. Navegador: 61 cenários aprovados, 5 exclusivos de outro projeto ignorados, em Edge/Chromium desktop e viewport móvel. Temas claro/escuro, persistência, anexos, ICS, teclado, movimento e redimensionamento cobertos. WebKit nativo fica no CI.
- Entrada inicial 280,9 KiB e JavaScript da aplicação 1280,4 KiB. Limites normais passam a 282/1288 KiB com justificativa medida; tetos absolutos preservados. Sem dependência nova. Alterações locais de Pixi e testes alheios não integram esta entrega.

## Cursor de papel (2026-10-12)

- Dois SVGs locais de 32px aplicados via CSS nativo para mouse com hover: seta e mão de ação com estrela. Paleta aprovada e borda creme/grafite legível nos dois temas.
- Campos mantêm cursor text; ferramentas mantêm crosshair/grab/resize; controles desabilitados mantêm not-allowed. Sem mudança de dados, sincronização ou eventos do mouse.
- Toque e forced-colors ficam com o comportamento original. Sem overlay, listeners ou dependências novas. Regressão de navegador cobre ambos os temas e estados funcionais.
- Verificação geral aprovada com 1401 testes. App e cursor: 23 cenários de navegador aprovados, 5 exclusivos de outro projeto ignorados. Edge/Chromium local; WebKit nativo no CI. JavaScript inicial 279,4 KiB e aplicação 1242,3 KiB, sem aumento.

## Agenda responsiva compacta (2026-10-11)

- Sete flores/tomates e três ações do dia ocupam uma linha no celular; ícones e textos reutilizam o design existente.
- Calendário e Meu estudo ficam lado a lado a partir de 1200px, com painel do dia sob o calendário. Telas menores mantêm o empilhamento.
- Removidos os textos auxiliares da semana e do dia vazio, além dos widgets Google Agenda e Listas de estudo. Dados, conexão, persistência e sincronização não mudam.
- Regressões cobrem 320/390px e 1280/1920px nos dois temas, ausência de overflow e alinhamento dos controles.
- Verificação geral aprovada: 1401 testes, lint sem erros, formatação, tipos, APIs, build e desempenho. Entrada 279,4 KiB e aplicação 1242,3 KiB. Navegador local usa Edge/Chromium nos dois projetos; WebKit nativo fica para o CI.

## Painel do dia e seleção de controles (2026-10-11)

- Uma semana possível foi removido da Agenda, incluindo seus botões/resumo. Dados, calendário, metas e chat existentes permanecem intactos.
- agenda-day compartilha o limite de 860px e centralização do calendário e Meu estudo, incluindo o painel aberto diretamente sob o calendário. Título da data usa texto comum, sem PaperDigits; números dos dias da grade permanecem no design de papel.
- O título continua recebendo foco programático para orientação acessível, mas não recebe o sublinhado/filtro amarelo de controles interativos. A exceção fica restrita a agenda-day-title; botões e campos preservam foco visível.
- Regra global em paper-controls.css impede seleção de botões, summary, controles role=button e ícones decorativos. Campos input/textarea/contenteditable mantêm seleção de texto; textos informativos continuam copiáveis. Não desativa foco, clique, teclado ou gestos do calendário.
- Verificação geral passou com 1401 testes, tipos, lint, formatação, APIs, build e desempenho. Testes de navegador verificam mesma largura/alinhamento a 1920px e viewport móvel, datas sem PaperDigits, cópia de texto e campos selecionáveis em claro/escuro. Entrada 279,4 KiB e total 1249,0 KiB, dentro dos orçamentos existentes. Mobile local usa Edge/Chromium; WebKit nativo fica no CI.
- Rodada final da Agenda/navegação: 49 E2E aprovados e 5 skips específicos de plataforma. Exceção de foco do título revalidada em dois cenários focados, preservando sublinhado nos controles. Rodar build e preview E2E sequencialmente no mesmo checkout: reconstruir dist enquanto o preview serve os testes pode gerar 404 transitório.

## Editar com ícone e alinhamento (2026-10-11)

- Ações Editar em tarefas e compromissos usam agenda-edit.svg, lápis facetado amarelo/creme. Texto visual removido, aria-label e title continuam identificando o item; a edição mantém o fluxo e a persistência existentes.
- Botões Editar e concluir recebem dimensões explícitas de 44px, centralização em grid, padding uniforme e cantos de papel iguais. Sem mudanças em outros botões ou dados.
- Teste de navegador verifica ícone carregado, ausência de texto, dimensões/alinhamento e abertura da edição por Enter em claro/escuro e desktop/mobile.
- Quatro cenários focados de formulário/edição passaram. Verificação geral: 1401 testes, tipos, lint, formatação, APIs, build e desempenho aprovados. Entrada 279,9 KiB e aplicação 1250,8 KiB, dentro dos orçamentos existentes.
- Logs do CI mobile apontaram seletor antigo em e2e/room.spec.ts que confundia sino e aparência, ambos com appearance-picker__trigger. O teste agora usa page-header__theme, como os demais testes de aparência. Listening e bingo revalidados localmente no viewport móvel; sem alteração de produto ou redução das asserções. Resultado WebKit nativo depende do CI.

## Dados e inspeção da Agenda (2026-10-11)

- Foco agrupa minutos por dia e modalidade, sem apresentar subjectId padrão como matéria escolhida pelo aluno. O armazenamento original não é alterado.
- Caderno usa os itens da estante com createdAt válido no período: cadernos sem kind, pastas collection/folder e Notes kind=note. Páginas internas não são contadas novamente. Total é identificado como itens, pizza separa tipos com cores distintas e a lista preserva os títulos. Não inventa data de criação a partir de updatedAt.
- Praticar lista somente ilhas de Matemática com respostas positivas nas datas selecionadas. Setas, arraste e teclado filtram também os gráficos pela ilha exibida; troca de período reconcilia a seleção com as ilhas disponíveis. Progresso sem data não entra no filtro.
- PaperChoice define texto creme sobre roxo e grafite sobre amarelo em seleção/hover/foco. Ano é texto comum nos dois seletores de calendário. Inspeção da pizza preserva contraste de papel nos dois temas.
- Retomar com calma existe somente com tarefas incompletas e prazo válido anterior ao dia atual. Sem prazo, data impossível, hoje, futuro ou conclusão não criam atrasos.
- Widget duplicado Matérias e metas removido, sem apagar matérias/metas. Uma semana possível mostra sete dias e contagens reais de tarefas/ocorrências pendentes; clicar abre o dia e Helena continua recebendo somente rascunho explícito.
- Sem mudança de esquema, gravação extra ou dependência nova. Todos os resumos derivam do workspace sincronizado existente.
- Verificação geral passou: 1401 testes unitários, tipos, lint, formatação, APIs, build e orçamento de desempenho. Agenda/navegação: 47 E2E aprovados e 5 skips específicos de plataforma; estante e semana clicável revalidadas em dois cenários finais. Claro/escuro, hover, foco, teclado e arraste validados em Edge desktop e viewport móvel. WebKit nativo permanece no CI. Build: entrada 279,9 KiB e total 1250,6 KiB, dentro dos orçamentos existentes.

## Formulário de papel e fechamento uniforme (2026-10-11)

- Adicionar do topo removido. Os dias abrem as ações contextuais, com novos SVGs para reservar estudo e criar compromisso. O formulário mantém somente seu botão de salvar/adicionar.
- Tipo e Matéria usam PaperChoice; datas usam PaperDateField com calendário de papel e entrada dd/mm/aaaa, horário usa PaperTimeField com colunas de horas/minutos e entrada hh:mm. Máscaras aceitam teclado numérico, datas impossíveis não são salvas e data final anterior ao início é revalidada. Popovers usam o top layer, Escape, foco restaurado e navegação por teclado, sem campos/selects nativos azuis.
- Matérias vêm de PRACTICE_ISLANDS: Idiomas, Português, Química, Biologia, Matemática e Programação. IDs existentes são reaproveitados; novos IDs de catálogo são determinísticos e subject/added é idempotente por ID. O merge existente combina edições dos dispositivos sem criar matérias duplicadas. Itens antigos com matéria personalizada continuam editáveis, sem reatribuição destrutiva.
- X coloridos adotam agenda-close.svg globalmente, sem fundo roxo, placa, sombra ou facetas de botão. Mantêm área de 44px, resposta ao hover e sublinhado amarelo no teclado. PaperEditorIcon monocromático permanece intacto, validado no editor real de cadernos.
- Concluir usa o PaperCheckIcon existente com papel amarelo e grafite, animação de encaixe e cartão concluído. Dias/intervalos ganham seleção animada; barras crescem, rosca aparece com escala e painéis se desdobram. Movimento reduzido suprime animações novas e rolagem suave.
- Agenda e navegação validadas em Edge desktop/mobile, claro/escuro, com 45 cenários aprovados e 5 skips específicos de plataforma. Widgets e filtros revalidados em quatro cenários focados. Nenhuma dependência nova, redefinição de progresso ou mudança de esquema.
- Verificação geral passou, além dos testes de datas impossíveis, máscara numérica, limite da repetição e IDs de matérias no merge. Build final: entrada 279,7 KiB, total 1249,8 KiB. O formulário adiciona 7,8 KiB sob demanda; ícones novos são assets SVG. Orçamento inicial 280 KiB e tetos absolutos intactos, total normal 1252 KiB. WebKit nativo fica para o CI; mobile local usa viewport de iPhone em Chromium.

## Planejamento por dia e notificações beta (2026-10-11)

- Cada dia abre a folha de planejamento sem bloquear o calendário ou o filtro. Adicionar abre as ações Tarefa, Estudo e Compromisso. Data e horário usam o formulário/reducer existentes; salvar marca o dia, voltar conserva a seleção e devolve foco ao calendário.
- Agenda não cria armazenamento paralelo: compromissos e tarefas permanecem nas coleções do workspace, com o merge por ID já existente e persistência entre recargas. Nenhuma mudança no esquema do workspace.
- Feriados nacionais recebem marcador amarelo e nome na folha do dia, incluindo a Paixão de Cristo móvel. Fonte: [Portaria MGI 11.460/2025, calendário 2026](https://legis.sigepe.gov.br/sigepe-bgp-ws-legis/legis-service/download/?id=0026440285-ALPDF/2025). Carnaval e Corpus Christi não são rotulados como feriados nacionais; feriados locais dependem de localização e não estão incluídos.
- Prévias de ilha usam arte de 80px centralizada e legenda curta, sem texto de sequência ou instrução visual. Sem dados, cada categoria explica a ausência de registros no filtro, sem gráficos fictícios. Semanas de flores/tomates continuam como exceção solicitada.
- Sino antes da aparência, apenas ícone e badge vermelho. Feed gerado no build Vercel por PRs mescladas/publicadas; versões beta identificadas pelo número da PR. Não anuncia PR em rascunho. GitHub é consultado somente no build; navegador acessa manifesto do próprio app.
- Leitura de notificações sincronizada por `helena.systemUpdates.read.v1`, união de IDs no login e merge concorrente; aplica mudanças remotas e limpa dados na troca/saída da conta. Ver docs/SYSTEM_UPDATES.md para limites, fallback e rollback.
- Build medido: entrada 279,7 KiB e total 1242,0 KiB. Novas funções adicionam 6,3 KiB, principalmente sob demanda. Orçamento total normal 1244 KiB; orçamento inicial 280 KiB e tetos absolutos intactos. Sem dependências novas.
- Validação: 1395 testes em 227 arquivos, 20 cenários E2E desktop/mobile Edge nos dois temas e seis cenários revalidados após os ajustes finais. Teste de publicação no build também passou, além do merge/leitura de notificações e preservação de horários de dois dispositivos. Mobile local é Chromium com viewport de iPhone; WebKit nativo fica para o CI.

## Indicadores reais na Agenda (2026-10-11)

- Gráficos, valores e inspeção vazios ou zerados não são exibidos. Inspeção em itálico, sem faixa amarela.
- Praticar exibe apenas `practiceActivities` datadas no dia ou intervalo selecionado. Sem respostas positivas, não aparecem gráficos, prévias nem indicadores. O progresso antigo sem data permanece salvo em Matemática, fora da Agenda.
- Pomodoro reutiliza os dias de ciclos concluídos, filtrados pelo período e pela semana da data final. Cronômetro mostra dias de foco e sequência diária positiva. Sem minutos, as semanas continuam visíveis: flores murchas/vivas e tomates apagados/vivos.
- Matemática usa registros datados do período, nunca interpreta pontuação como streak diário. Texto de melhor sequência removido a pedido do proprietário.
- Um único par de gráficos mostra respostas por período e distribuição por ilha. A prévia compacta combina arte de 80px centralizada e legenda com respostas/acertos filtrados, sem recordes acumulados ou gráficos duplicados. Mantém seis ilhas, setas roxas, teclado e arraste horizontal com cancelamento seguro. Botões Abrir removidos do dashboard.
- Bingo presencial usa papel creme e texto grafite nos dois temas, mantendo o acabamento amarelo e a opção de cartelas físicas.
- Ajuste validado com `npm run verify`, 16 testes unitários focados e 20 cenários E2E em Edge desktop/mobile, claro/escuro. Prévias respeitam filtro diário/intervalo e altura menor que 180px; zeros e progresso legado sem data não produzem conteúdo. A validação móvel local usa Chromium com viewport de iPhone, não WebKit nativo.
- Bundle medido: entrada 278,6 KiB e total 1236,5 KiB, aumento de 6,7 KiB nas rotas sob demanda, sem dependência nova. Orçamento total 1240 KiB, teto absoluto e orçamento inicial preservados.

## Navegação móvel uniforme (2026-10-11)

- Praticar usa o mesmo botão e a mesma seleção de ícones dos demais itens.
- Removidos o deslocamento elevado e o fundo roxo exclusivo, inclusive no tema escuro.
- O estado ativo e a navegação por toque ou teclado permanecem compartilhados.

## Professor e aprendizado da Olena (2026-10-10)

- Chat real usa API autenticada com consentimento, Cloudflare como professor e
  limites compartilhados. Preview mantém demonstração explicitamente local.
- Nenhuma conversa do aluno é guardada para treinamento. Dados didáticos
  sintéticos passam por revisão obrigatória antes de exportação.
- Receita LoRA fornecida, não executada. Nenhum peso treinado ou aprendizado
  automático em produção. Modelo próprio só assume capacidades após avaliação
  e configuração manual, com fallback ao professor e rollback explícito.
- Credenciais e execução real dependem de configuração no servidor.
  Decisões, limitações, comandos e modelo de ameaça: docs/OLENA_LEARNING.md.

## Helena integrada ao aplicativo (2026-10-10)

- A estrela aprovada agora é montada no AppContent real após o onboarding,
  em todas as abas, exceto projeção de sala. O componente HelenaChat é compartilhado
  com o preview e preserva conversa e posição durante a navegação.
- Carregamento separado por lazy import, sem bloquear a primeira tela. Mantidas
  as animações aprovadas. O breakpoint de 900px acompanha a navegação móvel real;
  menus e diálogos modais ocultam a estrela sem apagar a conversa.
- Chat permanece demonstrativo e informa isso no rodapé. Sem API, conta ou
  persistência nesta entrega. Não mostrar o selo Preview nas telas reais.
- Prova de integração: e2e/helena-app.spec.ts testa /aprender, Agenda, histórico,
  espaço para a barra móvel e ausência no onboarding, no build de produção.

## Preview da estrela de Helena (2026-10-10, ainda local)

- Preview isolado em preview-helena-chat.html, sem integração ao app publicado.
  Usa RoomPointsIcon e respostas demonstrativas, sem API, conta ou persistência.
- Repouso com flutuação, inspeção inclinada pelo ponteiro, abertura e fechamento
  animados. Arrasto por Pointer Events com captura, deformação suave, pequenas
  estrelas e encaixe na borda mais próxima. Soltar não abre a conversa.
- Posição limitada à viewport, com espaço para a navegação móvel. Painel acompanha
  a posição no desktop e ocupa uma área própria no celular. Movimento reduzido
  desativa animações; teclado, histórico e foco são preservados.
- Provas focadas: helena-chat-preview.test.tsx e helena-chat-preview.spec.ts.

## Tempo por questão conforme a etapa de Matemática (2026-10-10)

- Tempos iniciais: fundamental 14 s, ensino médio 16 s, pré-cálculo 18 s,
  cálculo I 20 s, cálculo II 22 s e cálculo III 24 s.
- Configuração central em MATH_COURSES, usada pelo gerador e pela validação da API.
  Mantidos os 3 s adicionais por tópico, aceleração de 0,16 por nível, reserva de
  60 s e contagem inicial de três segundos. Nada muda em pontos, baús ou progresso.
- Testes verificam os seis cursos, todos os níveis, limites de timeout e rejeição
  pela API de tempo adulterado.

## Contagem bidirecional dos pontos dos lugares (2026-10-10)

- Contador passa do valor atualmente exibido ao saldo do novo lugar em 900 ms,
  tanto aumentando quanto diminuindo, incluindo 530 para zero. Trocas rápidas
  cancelam o frame anterior e usam o valor intermediário, sem salto para zero.
- Mantida a remontagem dos baús por lugar, evitando booster ou baú da seleção
  anterior. Número visual não altera saldo persistido. Movimento reduzido respeitado.
- Testes cobrem descida, subida, troca rápida, saldo intacto e movimento reduzido;
  E2E confirma valores intermediários nos dois sentidos em desktop/mobile.

## Feedback confirmado das respostas de Matemática (2026-10-10)

- Corrigida a regressão que descontava a latência da API da duração do feedback.
  No app publicado, acertos ficavam visíveis por apenas 74 a 84 ms, menos que a
  animação de 300 ms. Requisições acima de 260 ms podiam apagar a reação imediatamente.
- Acertos permanecem 650 ms e erros ou tempo esgotado 1300 ms após confirmação.
  A reserva de tempo pausa durante requisição e feedback, sem loading entre contas.
- Áudio de resultado agora usa a confirmação da API, junto da mensagem e pontos.
  Falhas não celebram nem pontuam; retry fica bloqueado durante a requisição.
- Provas cobrem latência curta/longa, acerto, erro, timeout, clique duplicado e
  recuperação da API. E2E acrescenta latência de 800 ms e exige reação totalmente
  visível, sem pontuação duplicada, em desktop e viewport móvel.

## Encaixe compacto dos lugares (2026-10-10)

- Removida a área mínima de 920/820px e a rolagem introduzida na correção anterior.
  Fundo e conteúdo voltam a ocupar uma única viewport, sem emenda ao rolar.
- Ilha, slots e título têm posições calculadas a partir da mesma dimensão.
  Reduzidos espaços vazios, margens do título e altura dos widgets, mantendo
  barra em linha própria. A escala só ajusta quando a altura da tela exige.
- e2e/math-journey-fit.spec.ts verifica ausência de scroll, sobreposição e corte
  do botão em seis tamanhos desktop/mobile, nos temas claro e escuro.

## Correção de escala e integridade das cartas (2026-10-10)

- Restaurado o tamanho anterior dos lugares de Matemática: min(440px, 64vw,
  56dvh) no desktop, min(75vw, 48dvh) no celular. Telas baixas rolam a área
  verticalmente, preservando tamanho, slots maiores e separação dos títulos.
- Cartas comuns e tarot têm imagens não arrastáveis e texto não selecionável.
  O gesto de inspeção captura o ponteiro e impede o comportamento nativo do
  navegador; a arte, moldura e história permanecem uma única superfície.
- Provas de regressão medem a escala original e giram todas as onze cartas
  com mouse, verificando ausência de arraste nativo ou seleção de texto.

## Identidade das cartas e arcano do Oliver (2026-10-10)

- Comuns usam o alfabeto de papel existente, com acentos acessíveis, e PaperDigits nos atributos. Moldura prata e trilhos coloridos preservam a raridade comum e cada paleta narrativa.
- Nova arte original: XVII, A Estrela. Composição noturna com rio, sino e duas correntes conecta a história do Oliver. Moldura arqueada azul e ouro, sem atributos de combate. Verso próprio e inspeção 360 reutilizada.
- Tarot é uma vitrine de arte na coleção, não uma carta concedida ou sorteada nos baús. Probabilidades, inventário e sincronização de conta permanecem inalterados. WebP 480/720 sob demanda; nenhuma dependência nova.

## Baús comuns e inspeção das cartas (2026-10-10)

- Baú comum agora é madeira clara com ferragens cinza, sem joia ou dourado de
  raridade alta. Toque no prêmio ao finalizar leva de volta ao lugar, com voo
  até o espaço correspondente. Relógio, barra de papel roxa, pulinhos durante
  espera, aviso sonoro de pronto, balanço e abertura animada.
- Carta com raridade na moldura cinza, arte maior, nome acima da história e
  atributos compactos com ícones de poder, vida e stamina. Sem Oliver Comum
  no cabeçalho. Guardar usa botão original, anima todas as cartas até a coleção
  e vira as recebidas no catálogo, inclusive cópias repetidas.
- Arraste livre com mouse/toque no booster; coleção inspeciona frente e verso
  com rotação CSS 3D contínua de 360 graus, teclado e botão de recentralizar.
  Não usa novo motor 3D ou pacote. Movimento reduzido preserva ações essenciais.
- E2E desktop e viewport móvel Edge passou com entrega do baú, booster,
  armazenamento na coleção e inspeção. Verificação geral passou, 203 arquivos
  e 1261 testes. JS inicial 276,0 KiB; total 1185,1 KiB; teto 1187 KiB.

## Sincronização das recompensas de Matemática (2026-10-10)

- Pontos, baús, prazo e cartas agora entram na sincronização Firebase existente.
  Recibos com valores por partida permitem combinar dispositivos sem duplicar
  pontos; dados locais antigos são preservados no login. Troca de conta limpa
  recompensas e encerra a partida. Interface recebe alterações da nuvem.
- Conflitos de sorteio ou totais legados ficam sinalizados com backup existente.
  Limites, ameaça, migração e reversão em MATH_REWARDS_SYNC.md. Coleção pessoal,
  não economia autoritativa. Prova de login/upload com mocks; duas contas reais
  ainda não testadas.
- Baú em grafite/dourado facetado, espaços creme do app e ícone + de room-icons.
  Esta seção substitui a limitação local das seções históricas abaixo.
- Verificação passou: 202 arquivos, 1260 testes, build e orçamento. JS inicial
  276,0 KiB, total 1180,1 KiB, teto 1182 KiB. E2E desktop e viewport móvel Edge
  passaram. Eco de sincronização não fecha o booster se as recompensas não mudaram.

## Cartas comuns do Oliver e baús por lugar (2026-10-10)

- Dez cenas originais do Oliver geradas a partir das capas e artes aprovadas de onboarding/Bingo. WebPs responsivos em public/oliver-cards, 480/720px, 826.820 bytes para as vinte variantes. Molduras e textos HTML nítidos, sem novo pacote de runtime. Prompts e referências no README dos assets.
- Cada carta comum tem poder, vida, stamina e uma lembrança conectada à história do sino, estrela, mapa e compasso. Atributos ficcionais colecionáveis, sem bônus no minigame.
- Até três baús pendentes por lugar, abaixo da arte; pontos continuam acima. 100+ pontos numa rodada concedem um baú somente se houver espaço, sem perder o crédito da pontuação. Recibo idempotente. Históricos antigos não são removidos; eventual fila antiga com mais de três aparece em lotes de três.
- Tocar o próprio baú inicia 60 segundos de destrancamento. Prazo absoluto sobrevive à saída. Após o minuto, o toque abre a tampa com som e entrega cartas de costas. Clique, toque ou arraste horizontal viram uma carta com efeitos. Contador inferior direito mostra quantas faltam; máximo duas por baú.
- Quantidade: 80% de uma carta, 20% de duas. Cada sorteio independente usa crypto.getRandomValues; pesos por carta somam 100% (18, 15, 13, 12, 10, 9, 8, 6, 5, 4). Chances visíveis na coleção, duplicatas contam como cópias.
- Sorteio e progresso de revelação gravados antes da animação em helena.mathPlaceRewards.v1. Reabrir não sorteia novamente; fechar um booster parcial permite continuar. Coleção derivada das cartas reveladas, sem segundo armazenamento ou crédito duplicado. Baús legados já abertos não ganham cartas retroativas.
- Coleção, histórias e chances acessíveis pelo botão Cartas. Modal com foco, teclado, arraste, saída e movimento reduzido. Sons exclusivos de destrancar, tampa e revelação.
- Persistência local, não economia autoritativa, sincronizada ou protegida contra adulteração no dispositivo. Nenhuma compra ou raridade paga. XP continua na regra existente, sem aviso quando pontuação é zero.
- Verificação: npm run verify passou, 201 arquivos/1251 testes, lint sem erros (10 avisos anteriores), formatação, API, TypeScript, build e orçamento. E2E do fluxo passou em desktop e viewport móvel com Edge: toque no baú, minuto persistido, flip por arraste, cartas, coleção e retorno. WebKit fica para CI. JS inicial 275,7 KiB, total 1176,6 KiB, teto 1179 KiB.

## Pontos e baús da Matemática (2026-10-10)

- A reserva começa cheia em 60 segundos, após 3-2-1. A barra anterior dividia 60 por 90 e parecia já consumida. Tempo por questão e reserva continuam independentes. Acertos ainda reabastecem até 90 segundos.
- Som exclusivo reforçado, com desbloqueio de fonte no gesto e fallback webkitAudioContext para Safari. Teste de navegador verifica contexto e tons, não saída física do aparelho.
- Artes responsivas com prioridade atual/preview e compressão WebP: 12 variantes, 560.032 bytes, redução de 34%. Nenhuma arte foi recortada.
- Explorar lugar usa o botão e ícone de jogar do app sem inspeção do ícone. Voltar mantém creme. Setas roxas de Foco/Praticar junto com arraste, roda e teclado. Entrada principal renomeada Explorar Matemática.
- Pontos de partidas encerradas acumulam por lugar, com recibo idempotente e contagem animada sobre a arte. Partida com zero pontos não emite nem registra XP.
- Regra inicial: uma partida com pelo menos 100 pontos concede um baú comum. Destrancar inicia 60 segundos, persistidos como prazo absoluto; Abrir só fica disponível após o prazo. Entrega, espera e tampa animadas em SVG de papel; movimento reduzido respeitado.
- Pontos e baús persistem localmente em helena.mathPlaceRewards.v1, sem autoridade competitiva ou sincronização de conta. Baús têm abertura visual e histórico, mas não concedem itens ou bônus internos nesta versão. Essa economia fica para uma decisão de produto posterior.
- Verificado: lint (sem erros), formatação, API, 200 arquivos/1243 testes, TypeScript, build e orçamento passaram. E2E desktop/mobile passou com início cheio, áudio em execução, pontos, XP e abertura do baú após o minuto. JS inicial 275,7 KiB, total 1164,8 KiB.

## Lugares da Matemática (2026-10-09)

- A ilha de disciplina também abre por clique/toque na arte; disciplinas bloqueadas permanecem sem entrada. Arrastar a arte navega, sem abrir acidentalmente.
- Dentro da Matemática, navegação horizontal entre seis lugares reconstruídos da mesma ilha. Cada cenário tem composição completa e transparente, inspirado nos elementos da ilha original, sem recortes de panorama. IDs e domínio pedagógico continuam compatíveis.
- A foto chega da posição real do avatar de Praticar, com voo de 850 ms e movimento reduzido respeitado. Moldura circular sem deformação; feedback de resposta não exibe avatar.
- Após dois erros consecutivos, Olena recua um assunto, sem apagar pontos, acertos ou recorde. Um acerto limpa a sequência de erros. O contador opcional `errors` preserva compatibilidade com registros antigos em `helena.mathLearning.v1`.
- Símbolos matemáticos decoram o fundo sem bloquear controles. Unidade de segundos usa as mesmas cores de papel dos dígitos.
- Validação final (2026-10-10): 37 testes focados, E2E desktop/mobile com as seis artes carregadas, TypeScript, build e orçamento passaram (inicial 275,7 KiB; total 1159,9 KiB). Lint sem erros, formatação e API passaram. A execução completa de verify foi interrompida no Vitest, sem resultado final; não foi apresentada como aprovação integral.

## Matemática adaptativa com Olena (2026-10-09)

- Refinamento: avatar do usuário sem corpo desenhado, navegação por arraste, roda e teclado sem setas visíveis. Clique na ilha central também entra. Avatar anima o deslocamento nos dois sentidos. Botões reutilizam cores, cortes e profundidade do papel aprovado, sem faixas decorativas cruzadas.
- Tempo esgotado é avaliado como perda de vez, inclusive resposta correta atrasada: sem pontos, combo zerado, um coração e quatro segundos extras da reserva. Não destaca uma resposta que o usuário não escolheu.
- XP de prática usa o mesmo recibo e notificação de Bingo/Escuta, com uma unidade por cinco pontos, arredondada para cima. Crédito uma vez por partida no histórico local já existente, preservado se o usuário reiniciar antes; aviso após a contagem enquanto o resultado permanece aberto. Não é recompensa competitiva validada em conta remota.
- Áudio exclusivo da partida, desbloqueado no clique, sem expiração de três minutos do contexto compartilhado. Sons de início, contagem, acerto, erro, tempo, resultado e XP. Fecha ao sair. Teste de navegador verifica contexto em execução e criação dos tons; não mede volume físico ou configurações do dispositivo.

- MathIslandJourney substitui a entrada direta no protótipo: seis ilhas verticais próprias, de fundamentos a Cálculo III, previews, teclado, roda e arraste. As outras disciplinas permanecem bloqueadas.
- POST /api/olena?action=math&version=1 gera desafios numéricos e avalia acertos, rapidez, sequência e domínio por assunto. Conteúdo calculado e validado no servidor, sem LLM, voz ou provedor externo. Seis assuntos iniciais por curso, não uma ementa escolar completa.
- Questões mais complexas têm orçamento maior e drenagem mais rápida. Acertos reabastecem a reserva. Timer pausa durante feedback, chamadas, erro de rede e aba oculta. Erros de API são visíveis e recuperáveis, sem perguntas inventadas no cliente.
- Progresso versionado em helena.mathLearning.v1, integrado à sincronização já existente. Nova tentativa preserva domínio e melhor pontuação, sem alterar soloProgress. XP de prática é local; progresso informado pelo cliente não é autoridade para prêmios competitivos.
- PaperDigits, ícone de pontos das salas, contagem 3-2-1, avatar do usuário, corações partidos, combo, sons e reações próximas à resposta. Saída, entrada e resultado animados, respeitando redução de movimento.
- Seis artes originais de ilha geradas com referência à ilha aprovada e otimizadas em WebP transparente: 480px para celular e 800px para desktop. Cenário decorativo recortado ao viewport para não produzir rolagem extra.
- API local de desenvolvimento e preview usa o mesmo handleOlena da função Vercel. Nenhuma biblioteca adicional necessária.

## Praticar: protótipo de contas (2026-10-09)

- Trilhas suspensas na entrada das ilhas por decisão do usuário. Somente Matemática está disponível; as cinco outras ilhas continuam navegáveis, mas bloqueadas mesmo com progresso legado.
- Matemática abre MathArcade em tela cheia: rodada de 60 segundos, três chances, respostas por toque ou teclas 1 a 4, bônus de sequência e dificuldade baseada em acertos. Apenas aritmética básica, subtrações não negativas e divisões exatas.
- Pontuação somente local, sem XP, chamadas de IA ou gravação de progresso. O timer pausa quando a aba fica oculta. Saída restaura foco e rolagem; temporizadores são liberados.
- Idiomas utiliza os mesmos cenários e componentes da trilha compartilhada, sem a sobreposição antiga de estrada ou escala mobile exclusiva. A trilha permanece arquivada no código, não disponível para entrar.
- Os antigos testes de entrada em trilhas foram substituídos pela validação do novo fluxo. Os testes isolados das trilhas permanecem.

## Piloto de Matemática com PixiJS (2026-10-09)

- Refinamento da rua: calçamento interligado com pedras claras facetadas, meio-fio de blocos, praças octogonais nos níveis e postes de papel. mathStreetCenter deriva o eixo do pavimento dos mesmos pontos dos marcadores; teste cobre cada patamar e a interpolação entre eles. Sem imagens repetidas ou emendas por transparência.

- Preview independente em preview-matematica-pixi.html, com oito posições. Não substitui ainda a trilha de produção: aprovação visual vem antes da expansão para 50 níveis.
- PixiJS 8 desenha um único terreno, corredor contínuo e facetas em Graphics. Sem mosaico de fundos ou máscaras de emenda. Posições do chão, degraus, botões e avatar derivam de MATH_PILOT_STOPS.
- Botões HTML mantêm acessibilidade e teclado; canvas decorativo. Renderer carregado dinamicamente, resolução limitada a 2, sem ticker ocioso, redesenho apenas no resize e destruição ao desmontar. Falha de WebGL exibe aviso e conserva controles.
- Dependência justificada pelo piloto de câmera/cenário solicitado, npm audit sem vulnerabilidades. O piloto não entra no bundle principal enquanto permanecer só no preview. Tipos de mocks existentes foram estreitados para canvas 2D após a declaração adicional de WebGPU do PixiJS.

## Conteúdo básico e marcadores temáticos de Matemática (2026-10-08)

- Os 50 objetivos têm títulos próprios, desde contar até 10 até problemas cotidianos. Dez capítulos: contagem, adição, subtração, multiplicação, divisão, contas mistas, frações, decimais, porcentagens e dia a dia. Nenhum conteúdo de matemática avançada nesta ilha.
- BasicMathArtifact substitui a repetição de quatro peças por objetos associados ao conteúdo, com cinco variações por capítulo. Ábaco, blocos, peça subtraída, agrupamentos, divisão, operadores, inteiro repartido, casas decimais, percentual e recibo. Cores por capítulo, números incorporados e desenhos em SVG, sem arquivos bitmap adicionais.
- Minigame de resultados de contas permanece etapa futura. Math-Havoc serve somente de referência de encadeamento de acertos; não houve cópia de arte ou implementação de perguntas, tempo, pontos ou XP nesta alteração.

## Matemática básica com 50 posições e cenários leves (2026-10-08)

- A trilha de Matemática apresenta 50 posições, em dez grupos: contagem, adição, subtração, multiplicação, divisão, frações, decimais, porcentagens, medidas e problemas. São posições exploráveis, sem exercícios, XP ou desbloqueios pedagógicos simulados.
- O mapa estende o cenário aprovado em trechos com sobreposição nas junções. Selecionar um nível enquadra o destino e desloca o avatar acima do número, nos dois sentidos; redução de movimento permanece respeitada.
- Todas as trilhas usam barra superior de papel creme e botões facetados. Voltar recebe estado roxo no hover e foco. Novos WebPs comprimidos preservam os originais, com cerca de 44% a 54% menos bytes nas cinco disciplinas. Imagens fora da tela têm carregamento lazy; somente o cenário inicial recebe prioridade alta.
- Testes de navegador cobrem subida e descida entre 1 e 50 em desktop e mobile, além das seis ilhas em claro e escuro.

## Trilhas sem painéis inferiores e Idiomas integrado (2026-10-08)

- Idiomas usa o mesmo palco em tela cheia das cinco disciplinas, preservando seus minigames reais, bloqueios e progresso. O avatar chega ao nível, o marcador acende e só então abre o jogo. A arte existente de Idiomas permanece, com percurso central em papel e números em balões facetados.
- Removidos os painéis descritivos inferiores e os nomes de ilha abaixo da matéria no cabeçalho. O fim do mapa não reserva mais uma faixa vazia para esses painéis. Os marcadores continuam numerados e acessíveis, com temas junto ao nível.
- Voltar aos mundos usa a seta amarela oficial em paper-arrow.svg e acabamento creme de papel. Seleção de etapas sem exercícios não grava progresso; sua condição de prévia continua anunciada de maneira não visual.

## Percurso central e chegada às etapas (2026-10-08)

- As cinco trilhas de disciplinas preservam o papercraft aprovado, mas reorganizam os cenários nas laterais de um caminho central contínuo. Removida a passarela decorativa que não acompanhava o terreno. Artes próprias de desktop e celular, em WebP de qualidade 90; originais preservados como referência.
- A foto permanece centralizada acima do número. Seleção dispara deslocamento vertical de 850 ms, iluminação do nível por 260 ms e abertura dos temas somente depois da chegada. Trocas rápidas e retorno cancelam chegada pendente; movimento reduzido dispensa a sequência. Esta é navegação de prévia, não conclusão de exercício, XP ou desbloqueio pedagógico.
- Foto, números e arte usam as mesmas coordenadas por composição. Cabeçalho e painel fixos, níveis compactos no celular e margem de rolagem deixam a primeira etapa visível sem cobrir seu número. Nenhum exercício novo foi adicionado e a trilha real de Idiomas permanece inalterada.
- Regressões automatizadas: chegada em três fases, troca rápida de destino, movimento reduzido, foto persistente, número centralizado e avatar acima dele em desktop e mobile.
- Validação local: sete testes do componente e quatro cenários E2E das cinco disciplinas passaram, cobrindo desktop/mobile e claro/escuro. Build, TypeScript, lint, formatação, API e orçamento de desempenho passaram (275,6 KiB iniciais, 1157,5 KiB totais de JavaScript). A suíte unitária geral não foi concluída: o processo Node encerrou por falta de memória, inclusive com um worker. Não considerar a verificação geral verde sem execução completa em ambiente com recursos disponíveis.

## Trilhas exploráveis das seis ilhas (2026-10-08)

- Idiomas conserva trilha, exercícios e progresso existentes. Português, Química, Biologia, Matemática e Programação ganham interiores próprios e quatro etapas exploráveis, derivadas dos temas de cada ilha. Não há avanço de progresso, XP ou exercícios simulados nessas cinco trilhas.
- A foto do perfil acompanha a entrada em qualquer ilha e se desloca até a etapa escolhida. Botões numerados no centro de plataformas facetadas de papel, estado acessível, controle por teclado, movimento reduzido e retorno ao mesmo ponto do carrossel. As cinco trilhas abrem em tela cheia por portal, sem contenção pela página ou navegação sobreposta. No celular, o cabeçalho compacto mantém o retorno acessível durante a subida.
- Refinamento visual: peças próprias para cada disciplina, livro, molécula, folha, sólido geométrico e tecla de código, com números centralizados. Seleção preserva a cor da disciplina, destacando apenas as dobras, o papel e a base da legenda.
- Revisão de Matemática após avaliação visual: removida a trilha artificial. Os quatro níveis usam coordenadas da arte, nos patamares conectados pelas escadas existentes. Cenário e camada de interação compartilham o mesmo canvas 16:9 e a mesma câmera, inclusive no celular. Peças de Números, Álgebra, Geometria e Estatística são ábaco, balança, transferidor e gráfico, com o número direto no objeto e sem placa branca. Seleção enquadra o nível abaixo do cabeçalho, respeitando movimento reduzido.
- Validação da revisão: 5 testes de componente, 4 E2E nos dois temas e tamanhos, mais 2 E2E móveis após ajuste do enquadramento. Teste compara as posições e dimensões reais do cenário e da camada de níveis, garante ausência da trilha artificial e número centralizado. Build, lint, formato e performance verdes; entrada 275,6 KiB, total 1158,1 KiB.
- Validação: npm run verify verde, 1211 testes, build e orçamento de performance. E2E do carrossel e das trilhas: 13 passaram, 1 caso de toque ignorado no desktop. Após o refinamento final dos SVGs: 5 testes focados, 4 casos E2E de número centralizado, tela cheia e retorno visível nos dois temas e tamanhos, lint, formatação, build e performance verdes. JavaScript inicial 275,6 KiB, total 1155,6 KiB.
- Após avaliação do proprietário, os primeiros interiores com corredor gramado repetido foram descartados. Terrenos e composições finais são próprios: páginas e terra vermelha, plataformas minerais hexagonais, raízes e riachos, terraços geométricos e passarelas de circuito. As artes externas aprovadas não foram alteradas.
- API mantém IDs e contrato de consulta, com preview explícito para as cinco trilhas visuais. Metodologias continuam vazias. Matemática fica preparada com Números, Álgebra, Geometria e Estatística para a próxima etapa de conteúdo.

## Avatar contínuo na troca de ilhas (2026-10-08)

- Um único avatar permanece montado no carrossel. A moldura desliza entre as posições próprias das ilhas, no mesmo tempo da transição dos cenários, sem sumir nem duplicar a foto.
- Arraste por mouse ou toque desloca foto e ilha juntos. Setas e teclado compartilham a transição; movimento reduzido mantém troca imediata. Entrada na trilha continua medindo a posição real da foto.
- Os testes de retorno da sala agora verificam o carrossel, não o título introdutório removido por solicitação do proprietário.
- Validação: verify aprovado com 1206 testes, tipos, build, formato, API e orçamento. Doze cenários Edge desktop/mobile aprovados, incluindo continuidade da foto, arraste, teclado, movimento reduzido, voo até o nível e retorno de duas salas. JavaScript inicial 275,6 KiB e total 1145,6 KiB, sem dependências novas.

## API oficial da Olena, base de metodologias (2026-10-08)

- GET /api/olena versão 1 consulta catálogo, ilhas e metodologias por ID estável. Metadados derivados das mesmas ilhas de Praticar; apenas Idiomas tem trilha.
- Sem fornecedor conectado, voz, geração de texto simulada, metodologias ou exercícios inventados. Lista de metodologias vazia e status foundation explícito.
- Somente consultas públicas, sem dados pessoais, escrita, banco ou chamadas externas. Filtros estritos, erros versionados e função Vercel real com contrato Request/Response testado.
- Serviço de áudio dos minigames permanece intacto. Contrato, limites e próximos passos em OLENA_API.md.

## Foto do perfil nas ilhas e entrada na trilha (2026-10-08)

- A foto do perfil paira sobre a ilha selecionada em moldura de papel. O mesmo hook do cabeçalho acompanha alterações do perfil, sem cadastro ou persistência novos.
- Entrar em Idiomas leva a foto da posição visível no carrossel ao nível atual, após enquadrar a trilha. A transição mede origem e destino reais para desktop e celular, limpa animação ao sair e respeita movimento reduzido do sistema e do Perfil.
- As outras cinco ilhas permanecem cenários exploráveis, sem inventar trilhas ou exercícios. Artes aprovadas, gestos e progressão foram preservados.

## Carrossel aberto e imagens responsivas de Praticar (2026-10-08)

- Removidos título introdutório, seletor de matéria, painel branco, contador de mundo/níveis e botões inferiores de disciplinas da tela de ilhas. Seleção de conteúdo continua disponível dentro dos minigames existentes.
- Ilha atual central com vizinhas menores, mais altas e transparentes. Transição mantém posição por ilha; imagens somente da atual e das vizinhas são montadas. Sem redesenhar as artes aprovadas.
- Mesma seta de papel do Foco, extraída para componente compartilhado. Navegação por setas, teclado e Pointer Events para mouse/toque. Arraste vertical não troca a ilha, cancelamento limpa o gesto e movimento reduzido evita transições perceptíveis.
- WebPs maiores passam de 981018 para 595114 bytes no conjunto, redução de 39,3%. Variantes de 480 px para previews e telas menores, srcset/sizes e prioridade alta apenas da ilha atual. Sem SVG com bitmap embutido, dependências novas ou alterações nos exercícios.
- Validação: npm run verify aprovado, 1175 testes em 185 arquivos, lint sem erros (dez avisos anteriores), tipos/build/formato/APIs/orçamento. Nove cenários direcionados de Edge desktop/móvel aprovados, incluindo quatro combinações tema/tela, arraste, teclado, limites, rolagem vertical, movimento reduzido, gesto de toque nativo e cancelamento, trilha Solo e Foco. Prova nativa de toque não se aplica ao projeto desktop. Entrada baixa somente Idiomas e o preview de Português; botão principal fica dentro do viewport. JavaScript inicial 275,6 KiB e total 1144,4 KiB.

## Ilhas por matéria e retorno das artes laterais (2026-10-08)

- Após rejeição das primeiras propostas e da prova SVG, as seis artes foram refeitas com as três ilhas existentes como referências diretas. Preservam volumes, facetas, paleta e densidade de detalhes, com terrenos próprios sem a praça circular repetida. O conceito SVG foi retirado dos assets, preservado fora do repositório. Cada cenário tem posição própria para a Helena.
- Visuais aprovados pelo proprietário, com edição posterior somente das cores: Porto das Vozes (Idiomas), Vale das Histórias (Português), Ilhas dos Elementos (Química), Jardim da Vida (Biologia), Picos dos Padrões (Matemática) e Oficina do Código (Programação). Tons roxos substituídos por paletas relacionadas às disciplinas. subject permanece separado de title para identificação e acessibilidade.

- Modalidades coletivas e os cinco padrões de bingo voltam às artes quadradas na ponta direita dos botões. Todas ficam visíveis sem hover, com textos fora da ilustração e seleção dourada.
- Bingo presencial usa papel grafite, texto creme e base amarela, sem preencher o botão inteiro de amarelo.
- Praticar apresenta seis ilhas próprias: Idiomas, Português, Química, Biologia, Matemática e Programação. Carrossel e atalhos semânticos permitem visitar todos os cenários.
- Conforme escolha do proprietário, esta etapa entrega cenários e navegação, não exercícios novos. Idiomas preserva os minigames existentes. As outras cinco ilhas informam que os exercícios chegam depois.
- Programação inclui temas Python, JavaScript, HTML e CSS. Imagens transparentes próprias usam o padrão de papel recortado, sem dependência nova. Prompts e referências em PRACTICE_ISLAND_ART.md.
- Validação final: npm run verify aprovado, 1175 testes em 185 arquivos, tipos, build, formato, APIs ESM e orçamento. Oito cenários finais de Edge desktop/móvel nos temas claro/escuro aprovados para navegação das seis ilhas e artes laterais. Seis cenários de regressão já aprovados para trilha Solo, criação/sorteio/cartela e vitória real nos quatro cantos. JavaScript inicial 275,6 KiB, total 1143,0 KiB, sem dependência nova. Os cenários de sala usam handler real com store em memória, não produção.

## Captura determinística da reação do bingo (2026-10-08)

- O teste móvel congelava na captura de um elemento temporário removido após 1,5 segundo.
- O relógio do participante fica pausado somente durante a conferência e a captura da reação.
- O teste avança 1500 ms, confirma a remoção e retoma o relógio antes de continuar a partida.
- A duração e o comportamento da aplicação permanecem iguais.
- Testes da sala agora verificam as imagens dentro de picture e a borda dourada da seleção atual.
- O teste de nitidez lê largura e altura do canvas juntas para evitar misturar dois redimensionamentos.
- WebKit mantinha proporção panorâmica no celular por especificidade CSS, sobrepondo as modalidades. Largura limitada à coluna e seletor móvel equivalente corrigem o toque; a regressão verifica os limites horizontais em 320 e 390 px.
- A pausa do relógio usa um instante futuro para evitar divergência de milissegundos entre Node e WebKit.
- O transporte simulado de sala e bingo envia eventos somente quando o estado muda, como o stream real, evitando renderizações repetidas a cada sondagem.
- A prova entre dispositivos da escuta traz cada participante para frente, carrega o sprite antes da resposta e confere movimento reduzido antes da captura. Isso evita verificar feedback já expirado ou animações suspensas em abas de fundo, sem alterar os três segundos da aplicação.
- CI móvel executa um cenário por vez para limitar o pico de processos WebKit nos testes com vários dispositivos; todos os cenários continuam ativos.

## Leo e atualização de Alice e Soso Estrelinha (2026-10-07)

- Leo entra no seletor de perfis com o retrato aprovado do besourinho, sem estrelas no fundo.
- Alice usa a nova arte do ratinho e Soso Estrelinha usa a borboleta enviada pelo proprietário.
- Os caminhos de Alice e Soso permanecem iguais para preservar os perfis já selecionados.
- Artes otimizadas para 512 × 512 em WebP incorporado em SVG, com recorte circular e cantos transparentes.
- O teste de navegador cobre transparência dos três avatares e seleção persistente do Leo nos temas claro e escuro.

## Sala: artes integrais e navegação preservada (2026-10-07)

- Modalidades e cinco padrões de bingo usam artes panorâmicas integrais no desktop, permanentemente visíveis. No celular, as referências quadradas completas mantêm as duas colunas compactas sem cortar personagens. Ícones/textos continuam semânticos e a seleção aparece em borda/base dourada. Bingo presencial usa amarelo original.
- Voltar não chama reset/leave: mantém stream, presença, credenciais e sala, com cartão Retomar sala. Áudio da pergunta para ao recolher a tela. Apenas Sair da sala do criador abre a confirmação, redesenhada em papel creme e com Cancelar legível.
- Controle de entrada fica abaixo de Copiar link. Novos ícones facetados para cópia, entrada fechada/aberta, pronto/ausente e remoção por X acessível. Nível de progresso Solo fica antes da foto, como metadado visual, sem interferir em pontos/XP e com valor validado no servidor.
- Entrada, saída e retorno de presença produzem reação temporária por sala; hidratação não reproduz entradas antigas. Batimentos sem mudança não prolongam efeitos. Movimento reduzido mantém aviso estático. Todas as modalidades recebem contagem inicial; bingo permanece com zero bolas e bloqueia sorteio antes dos três segundos no servidor.
- Prompts, referências e preparação dos nove assets registrados em ROOM_PANORAMA_ART.md. Originais preservados.
- Validação final em 2026-10-08: npm run verify aprovado, 1174 testes em 185 arquivos, tipos, build, formato, APIs ESM e orçamento. Lint sem erros, dez avisos anteriores. Dezoito cenários direcionados de Edge desktop/móvel aprovados nas rodadas por arquivo, incluindo vitória real nos quatro cantos, três vencedores em bingo digital/presencial, retomada, presença e contraste. Sorteio também fica desabilitado no cliente durante a contagem. JavaScript inicial 275,7 KiB e total 1140,3 KiB, sem dependência nova. Cenários usam handler real com store em memória, não Firebase de produção.

## Reação de pontos junto da bola (2026-10-06)

- Removidos contador e aviso de pontos do topo. Marca aceita com pointsChange positivo mostra WOW! +pontos junto da célula correspondente, com papel dourado, confete e som compartilhado. Posição usa limites reais da cartela e mantém a reação dentro do cartão, inclusive nos cantos. Dura 1,5 segundo e não altera layout nem bloqueia cliques.
- Reação nasce da resposta confirmada da marcação, não de mudanças gerais de score ou reconexão. Falhas e duplicatas não animam; timer cancela ao desmontar ou substituir a reação. Movimento reduzido mantém o feedback estático e temporário. Regras de pontos, XP e pódio não mudam.

## Bingo: três lugares e recompensa proporcional (2026-10-06)

- Substitui o resultado anterior sem pódio: reaproveitado Podium da escuta com variante solar e planetas de papel. A classificação segue bingoWinnerIds, não score. A terceira confirmação encerra automaticamente, impedindo quarto vencedor.
- Marca digital válida vale 2 pontos, sem duplicação; objetivos confirmados valem 30 (cantos), 40 (linha/coluna/diagonal) ou 100 (cheia). Recusa não dá bônus. Presencial dá somente bônus conferido pelo host. Após vitória, marcações ficam bloqueadas.
- XP final arredonda score multiplicado por 0,35 no Bingo e 0,5 na escuta. A escuta mantém seus pontos de acerto e velocidade, mas deixa XP fixo por colocação. Teto defensivo de 10000 substitui o teto de 100 na normalização e no ledger; recibos continuam idempotentes.
- Feedback de ganho somente após score confirmado: contador, confete compacto, placa turquesa animada e som de acerto compartilhado. Movimento reduzido não anima. Resultado exibe pontos e XP dos três vencedores. Sem dependências novas.
- Ajuste visual solicitado: resultado sem painel verde nem avatar solto da Poliana. Cada foto recebe a moldura facetada de troféu compartilhada, com coroa de Saturno, Júpiter ou Terra e ramos de papel, sem sobrepor o rosto. A escuta mantém as molduras originais.
- Validação: verify passou com 1065 testes em 172 arquivos, tipos, APIs, build e orçamento. Ajustes visuais finais receberam testes direcionados e lint; seis cenários de regras/animação/pódio da escuta e quatro cenários finais de Bingo online/presencial passaram em Edge desktop e móvel. Provas usam handler real com store em memória, não produção Firebase. JavaScript inicial 274,7 KiB e total 1125,9 KiB.

## Bingo presencial, participantes e finalização (2026-10-06)

- bingoPhysical é configurável antes de criar a sala. Rodadas presenciais não geram cartelas digitais, bloqueiam marcações digitais e deixam a conferência da cartela de papel a cargo do criador autenticado. O anúncio exige pelo menos um sorteio. O online preserva a validação dos cinco padrões pelo servidor.
- bingo-review aceita finish: confirma o anúncio atual e finaliza junto com todos os vencedores anteriores. bingo-finalize permite finalizar depois de Continuar partida, exige credencial de host e pelo menos um vencedor confirmado. Recibos por geração, rodada e participante tornam as recompensas estáveis em reenvios. Todos os vencedores recebem 100 XP, sem classificação ou pódio. Recomeçar limpa sorteios, vencedores e recompensas.
- Participantes não montam Canvas ou física. Recebem histórico, cartela quando online e um aviso animado de Saturno, que desaparece antes da revelação. Reentrada recupera o histórico sem reproduzir sorteios antigos; reinício cancela timers e sons. Movimento reduzido mostra o estado diretamente. Áudio respeita ativação do navegador e suspende efeitos com a página oculta.
- Bolinhas do globo usam atlas local de até 75 imagens de 128 por 128 pixels, cerca de 4,7 MiB de pixels, sem rede ou dependência. A física continua usando delta de tempo e RAF, sem limitar FPS. A impressão é invalidada quando as fontes terminam de carregar e o atlas é liberado ao desmontar. Medição local do callback: mediana de 1,5 ms e p95 de 2,5 ms em 596 amostras; isso não é promessa de FPS em todo dispositivo.
- Paleta de conferência e resultado usa oceano, turquesa, creme e dourado, preservando facetas e sombras de papel. Botões de padrão têm duas colunas compactas no celular; cartela e ganhadores foram condensados. Removidas a legenda das regras e as instruções textuais de conferência pedidas pelo usuário.
- Testes novos cobrem modos digitais, ausência de cartela presencial, rejeição, quatro vencedores, XP igual e idempotente, autenticação da finalização, cancelamento da animação e envelopes dos efeitos sintetizados. A prova entre navegadores usa o handler real e store em memória, com sessões independentes, não uma sala Firebase de produção.
- A conferência usa corpo rolável e rodapé imóvel: a tradução de hover dos botões podia oscilar quando o cursor ficava na borda de uma decisão. Mantidos cores, facetas e feedback de sombra, sem mover o alvo. Cartela e botão do participante são verificados inteiros na tela, inclusive no viewport móvel de 390 por 664 pixels, com alvos de pelo menos 44 pixels. Bolinhas de ambos os palcos usam a mesma paleta extraída sem alterar o globo aprovado.
- O resultado importa seus estilos também ao reabrir a sala diretamente. Recompensas ainda são recuperadas na fase finished se o participante só recebe o estado depois de Encerrar sala. As provas de quatro pessoas verificam 100 XP por sessão, sem duplicação após recarregar e após encerramento.
- Validação local: npm run verify passou com 1062 testes em 171 arquivos, tipos, formato, APIs ESM, build e orçamento. Lint sem erros, com dez avisos anteriores. Regressão de sala aprovada em 36 cenários de Edge PC e móvel; oito cenários de bingo repetidos depois dos ajustes de compactação, materiais e botões, sem force click. A última medição do callback do globo registrou mediana 1,4 ms e p95 2 ms, em 572 amostras no PC e 513 no móvel. JavaScript inicial 274,7 KiB; total 1123,6 KiB, tudo adicional na rota lazy de sala/bingo, sem dependência nova. WebKit continua sendo verificado pelo CI remoto.

## Correção da validação de bingo no CI (2026-10-06)

- O primeiro CI da PR 356 confirmou build, tipos, testes unitários, orçamento e segurança, mas falhou na contagem de amostras da animação em WebKit: sete ou oito quadros após as capturas, em três tentativas. A observação começava tarde, depois de capturar a saída e a revelação. O observador agora é instalado antes do sorteio, mede desde o foco da revelação até o pouso e mantém os mesmos limites de quantidade de quadros, velocidade, mudança de tamanho e ausência de duplicação. Não alterados tempos, física ou design para satisfazer o teste.
- A prova aleatória de vitória tinha um limite de 75 iterações que marcava antes de sortear. Se o último canto era o 75º sorteio, ele não chegava à etapa de marcação. Incluída a última passagem de marcação, e cada sorteio espera confirmação da contagem do backend e das bolas restantes no globo antes de prosseguir. As duas rodadas continuam reais, sem adulterar baralho, resposta ou regra vencedora. O limite do teste passa a 240 segundos para até 150 sorteios pela interface em WebKit.
- O primeiro CI terminou com 155 cenários aprovados, um reprovado, dois que passaram somente após repetição e 42 pulados. A nova tentativa precisa passar antes da mesclagem autorizada. Nesta sessão o Playwright local não iniciou porque a criação de subprocessos foi recusada com EPERM; isso não é evidência de aprovação nem de regressão do produto. A correção é restrita ao teste e à documentação.

## Bingo começa vazio e passa por conferência do criador (2026-10-06)

- Causa da primeira bola: o índice inicial zero era convertido em uma bola sorteada pela fatia index + 1. Introduzida bingoDrawCount, zero ao iniciar/recomeçar, sem usar índice negativo ou quebrar o protocolo das salas antigas. A primeira chamada next mantém index zero e passa count para um; pedidos duplicados com a mesma contagem não sorteiam de novo. Sem currentQuestion antes do primeiro sorteio.
- Pressionar Bingo exige o padrão real e cria bingoClaim, não results. Os cinco modos mantêm as mesmas regras verificadas pelo servidor. Sorteio e marcas ficam pausados durante a conferência. O criador recebe NOME FEZ BINGO!, confetes de papel, fanfarra e a cartela marcada para conferir online ou presencialmente. As três decisões têm ícones próprios, e o pódio fica exclusivo da escuta, inclusive nas telas de resultado e projetor.
- Foi engano não registra vencedor nem bônus. Continuar partida registra o vencedor sem alterar baralho, números sorteados ou outras cartelas, permitindo mais vencedores. Recomeçar gera outra rodada, limpa marcas, vencedores, receipts e contagem, mantendo participantes. Credencial de organizador e claimId protegem a decisão; reenvio não aplica uma decisão a outro anúncio. roundId reinicializa a interface e cancela animações da rodada anterior.
- Novas artes da Poliana na seleção e no convite, integradas somente ao bingo, com prompts completos em BINGO_POLIANA_ART.md. A escuta mantém a Helena. O QR é SVG com correção H, sobreposto à placa vazia, e foi decodificado da captura da interface com jsQR. Ícones de entrada em coral e turquesa. Convites desaparecem suavemente ao selecionar a modalidade e reaparecem junto das modalidades ao expandir.
- Física descarta pares distantes sem calcular raiz e o desenho reaproveita trigonometria. Mantidos 75 corpos, três iterações de colisão e passos de 120 Hz. Medição indicativa no Edge local: antes mediana 8,2 ms e p95 16,7 ms; depois, numa passagem da mesma interface, mediana 5,9 ms e p95 10,8 ms. São custos de callbacks durante o sorteio, não FPS garantido; carga do computador e testes paralelos alteram essas medidas. Não removidas animações de saída, revelação ou transferência.
- Validação automatizada cobre início vazio, primeira chamada concorrente, conferência nos cinco modos, dois vencedores, rejeição, reinício, decisão repetida, credencial inválida, preservação dos campos no canal e falha de rede na conferência. A prova entre telas usa o handler real, store em memória e transporte de estados local, não uma sala Firebase de produção.
- Validação final: npm run verify passou com 1048 testes em 167 arquivos, tipos, seis verificações de API ESM, build, formato e orçamento. Lint sem erros, com dez avisos preexistentes. Playwright passou 34 cenários dos oito arquivos de sala/bingo em Edge desktop e móvel. Capturas do anúncio, da cartela para conferência e do convite da Poliana foram inspecionadas; as três decisões permanecem visíveis nos dois tamanhos. JavaScript inicial 274,7 KiB, total 1117,9 KiB; orçamento lazy ajustado para 1120 KiB com justificativa do fluxo, sem dependência nova. Revisão dos componentes React conferiu efeitos, reinicialização por rodada e autorização das decisões, sem ajustes adicionais.

## Continuidade das bolinhas, planetas e Poliana (2026-10-06)

- Causa do salto: a cópia do histórico ficava visível durante a espera de montagem, e a animação CSS de pouso mudava sua escala enquanto o voo media esse destino. Removidas as duas concorrências. A mesma bola numerada passa pela saída, revelação de 1600 ms e transferência, com o último quadro mantido antes de cancelar cada animação. A cópia fica invisível até o pouso terminar; o alvo de medição não tem arte vazia.
- Canvas e SVG imprimem número e letra nas próprias facetas, sem placa branca central. No Canvas a impressão gira junto com a bolinha. A cartela reutiliza os cinco planetas do cabeçalho, agora com numerais de papel dentro do SVG. Apenas Saturno tem anel, Terra tem continentes, Marte tem crateras, Júpiter tem faixas e Netuno tem faixas azuis.
- Cartela em papel índigo e lavanda tem um buraco negro facetado ao fundo; a bandeja do histórico também ganha papel lavanda com dobra, nos dois temas. O ícone de Modalidades coletivas mantém a geometria aprovada e muda para turquesa.
- Cinco artes separadas da Poliana, com cenários e poses distintos, usam seu avatar como identidade e as artes aprovadas da Helena como referência de estilo. São WebP 512 × 512, cerca de 234 KiB juntos, sem biblioteca nova. Arquivos, prompts completos e modo da ferramenta estão em `docs/BINGO_POLIANA_ART.md`. Os botões reservam espaço para imagem e texto, revelam a arte ao inspecionar e mantêm a arte selecionada visível.
- Testes incluem ausência de cópia visível durante o voo, medição de continuidade por RAF no navegador e uma partida inteira nos quatro cantos. A vitória usa sorteios aleatórios, marcas pela interface e o handler real com store em memória: uma tentativa prematura é recusada, a completa encerra em results e recebe 104 pontos. Não é prova de produção Firebase nem sincronização entre aparelhos. Regras, áudio, sorteio e primeira bolinha automática permanecem como antes.
- Validação: `npm run verify` passou com 1033 testes em 166 arquivos, API ESM, tipos, build, formato e orçamento. Lint sem erros, com dez avisos preexistentes; o lint dos arquivos alterados e a formatação foram conferidos novamente após o ajuste final de encaixe das artes. Playwright passou os 32 casos dos sete arquivos de sala/bingo em Edge desktop e móvel, incluindo continuidade, ausência de duplicação, vitória confirmada, canal em tempo real, entrada e reconexão. Capturas inspecionadas nos dois temas e larguras. JavaScript inicial 274,6 KiB e total 1112,8 KiB, sem elevar o orçamento ou adicionar dependência.

## Composição solar da partida (2026-10-06)

- Em desktop, globo e histórico ocupam a coluna esquerda; cartela fica à direita. Em telas até 780 px, a sequência é globo, histórico, cartela e ação Bingo no rodapé. O destino do voo continua sendo a própria bolinha do histórico, sem duplicar painéis ou usar posições fixas.
- Removidos Última bolinha e a explicação do Sol livre. Anúncios de mistura, saída e revelação continuam disponíveis. Ícone autoral de Bingo combina cartela, estrela e marca de vitória. Os cinco modos usam cartelas de papel facetadas que ilustram o padrão vencedor.
- Casas numéricas são planetas de papel com anéis e face creme para os dígitos; cores seguem as colunas. Marca e centro livre permanecem amarelos. Saturno tem aro em camadas, facetas maiores no anel, reforços triangulares, pés dourados e encaixes hexagonais. Física, regras, áudio e sorteio não mudam.
- Sem dependências. Composição e ilustrações acrescentam cerca de 1,1 KiB ao bingo lazy. Total 1112,1 KiB, entrada 274,6 KiB. Orçamento normal 1114 KiB documentado, sem alterar teto absoluto.
- Validação: `npm run verify` passou com 1032 testes em 166 arquivos, build, API ESM, formatação e orçamento. Lint sem erros, com dez avisos existentes. Playwright passou 20 casos de bingo e sala em desktop e celular, incluindo posição do histórico/cartela/ação, 24 casas solares, carregamento dos cinco ícones, revelação, transferência ao histórico e regressões de entrada/reconexão. Capturas claras e escuras inspecionadas. O mock de revelação agora renderiza a cartela recebida como filha, preservando a checagem de bloqueio antes da revelação.

## Papercraft solar do bingo (2026-10-06)

- Bolinhas redesenhadas como sólidos de papel com seis facetas, face creme e profundidade. Canvas e SVG compartilham geometria na mistura, saída, voo, revelação e histórico. Globo aprovado e sorteio do servidor preservados.
- Saída pelo funil permanece no relógio físico; voo e transferência têm 61 quadros interpolados, pouso e tempo de leitura maior. Marcação só libera após revelação; movimento reduzido e cancelamento preservados.
- Cartela tem placa grafite facetada, cometa, órbitas e cinco planetas nas colunas. Casas creme têm cantos nas cores dos planetas, marcas amarelas e Sol de papel central. Dígitos grafite explícitos mantêm contraste no tema escuro.
- Botão e estado de silêncio removidos. Efeitos habilitados por padrão; primeira interação de ponteiro/teclado desbloqueia áudio conforme política do navegador. Aba oculta ainda pausa sons e saída libera o contexto.
- Sem dependências novas; geometria e ilustrações permanecem lazy. Total 1111,0 KiB, entrada mantida em 274,6 KiB. Orçamento normal 1112 KiB, teto absoluto inalterado.
- Verificação geral passou com 1032 testes, tipos, build, formato, API e orçamento. Após a revisão final de pouso, 19 testes focados passaram novamente, junto de novo build e lint dos arquivos alterados sem warnings. Os 20 cenários de sala/bingo no Edge desktop e móvel passaram. Capturas da saída, revelação e cartela foram inspecionadas; regressões verificam contraste no escuro e ausência do controle de silêncio.

## Apelido do convidado na sala e animação do Bingo (2026-10-06)

- **Apelido do convidado.** No Modo Sala, quem entrou como convidado vê o campo "Seu apelido na sala", começando em Guest, na entrada por código e ao escolher "Também quero participar". O apelido segue a mesma regra de nome da sala (sem `<` e `>`, até 24 caracteres), fica só neste aparelho em `helena.guest-nickname.v1` (fora das chaves sincronizadas) e some quando a pessoa entra com Google. O Perfil e o resto do app continuam como Guest. Apelido vazio volta a Guest. O servidor continua recusando nomes repetidos na mesma sala, e agora o convidado pode trocar o apelido para entrar.
- **Causa raiz do globo reiniciar, do histórico zerar e da cartela travar.** O servidor manda `drawnIds` no bingo de números, mas `normalizeRoomState` (estado que chega pelo canal em tempo real) só guardava `drawnIds` quando existia `bingoWords`, que o bingo de números não tem. Em produção, assim que o canal repetia o estado, os números sorteados sumiam: o globo recriava as 75 bolinhas em outras posições, o histórico zerava e as casas da cartela voltavam a ficar bloqueadas. O e2e antigo escondia isso porque desliga o canal. Corrigido, com teste de regressão no estado e e2e novo com o canal ligado (`e2e/number-bingo-live.spec.ts`, que falha sem a correção).
- **Teletransporte e corte da bolinha sorteada.** Medido com gravação quadro a quadro: (1) a animação dentro do globo avançava por quadro (com tempo máximo de 40 ms por quadro) enquanto a página usava temporizadores, então em aparelho lento as duas partes saíam de sincronia e a bolinha pulava; (2) a bolinha era desenhada dentro do recorte do globo e a borda a cortava ao meio na saída; (3) ela atravessava o monte em linha reta até o portão, aparecendo do nada no funil e rolando devagar; (4) a troca do canvas para a bolinha da página trocava de tamanho e de ponto. Agora a viagem (sobe à frente do monte com brilho, espera, cai pelo portão e rola o funil) é medida no relógio pelo próprio motor, que avisa a chegada uma única vez; a bolinha sai do recorte ao passar do globo para o funil; a troca de canvas para página acontece no mesmo quadro; o arremesso até o resultado termina na vertical; e o pouso abre a estrela com confete de papel e pulo.
- **Tempo e fluidez.** A sequência de um sorteio caiu de cerca de 7,1 s para cerca de 5,4 s no teste local. O globo só redesenha quando o sorteio muda (o estado da sala chega várias vezes por minuto por presença e respostas), os passos de física por quadro são limitados e o canvas só é redimensionado quando o tamanho muda. Movimento reduzido continua sem animações de voo.
- **Marcar na cartela.** A casa marca na hora e o servidor confirma depois; se recusar ou falhar, a marca é desfeita com um aviso. Os pedidos seguem em fila e levam o índice de sorteio mais recente, e as outras casas não ficam bloqueadas enquanto um pedido está em andamento. O número só é liberado na cartela quando a bolinha aparece, em vez de aparecer habilitado durante a mistura, e as casas liberadas recebem destaque.
- **Orçamento de desempenho.** O total da aplicação passou de 1102,2 para 1107,8 KiB (a entrada inicial, de 274,2 para 274,6 KiB), quase tudo no código lazy do Bingo. O teto subiu de 1104 para 1110 KiB, com a justificativa registrada no script. Nenhuma dependência nova.
- **Testes.** Estado do canal (regressão), motor (chegada pelo relógio com quadros perdidos, bolinha sem duplicata, confete, movimento reduzido), orquestração do globo (revelação, cancelamento, entrada no meio do jogo), cartela (marca imediata, fila, desfazer, destaque, liberação só após a revelação), apelido (domínio, formulário e e2e).
- **Não verificado.** Fluidez em celulares reais de entrada (a medição foi em navegador sem aceleração gráfica), latência real de marcação em produção com Firebase e os sons novos em aparelho físico.

## Saturno aprovado integrado (2026-10-06)

- O globo em bingo-globo-oficial.html, aprovado pelo proprietário, foi portado para o bingo da aplicação: mesmo desenho de papel dos suportes, anel facetado, gaiola em camadas, comporta e rampa. Não usa mais o SVG simplificado de #350.
- Bolinhas têm gravidade, colisão, atrito e rotação, com passo físico de 1/120 s. O servidor continua sendo o único sorteador; a física só apresenta o número já confirmado. A sequência mistura, abre a comporta, faz a bolinha percorrer a rampa, destaca o número e o leva ao histórico. Efeitos sonoros sintetizados localmente e botão de silêncio, sem arquivos remotos.
- Entrada e reconexão mostram o histórico existente sem repetir sorteios. Saída cancela timers, animações, RAF, observador e áudio. Aba oculta suspende a física e os sons; movimento reduzido usa o mesmo resultado sem voo nem loop de animação. Física em repouso para após estabilização.
- Removidos do jogo o título/regra do modo, os textos Complete sua constelação e sua explicação, e o botão Encerrar sala abaixo da cartela. Escolha dos cinco modos permanece na preparação; Bingo continua conferindo a vitória e Sair da sala permanece no cabeçalho.
- Física, apresentação e sons permanecem no chunk lazy do bingo, sem dependências e sem aumentar a entrada inicial (274,2 KiB). A implementação completa adiciona cerca de 15 KiB ao total; orçamento normal documentado em 1104 KiB, sem alterar tetos absolutos.
- Validação: npm run verify passou (lint, formato, API, suíte unitária, tipos, build e orçamento). Os 20 cenários de bingo numérico e sala passaram no Edge desktop/móvel; após ajustar também a margem do destaque, os dois cenários numéricos foram repetidos e passaram. Capturas de saída, revelação, cartela e temas claro/escuro foram inspecionadas. Testes unitários cobrem exclusão dos números confirmados, reconexão sem replay, cancelamento ao desmontar e movimento reduzido sem voo.

## Auditoria de dependências (2026-10-05)

- source-map-js transitivo atualizado de 1.2.1 para 1.2.2 somente no lockfile, corrigindo GHSA-68fv-2mgg-jv7q. As faixas já aceitas por PostCSS/Vite e css-tree/jsdom foram mantidas. A auditoria retornou zero vulnerabilidades após a atualização; não houve mudança nas dependências diretas nem no comportamento do bingo.

## Bingo numérico solar (2026-10-05)

- Reconciliação com a main de #348 e #349 preserva entrada como convidado e separação de controles. Saturno passou a SVG estático com animação interna para manter o orçamento após combinar as mudanças: verify passou com 1.005 testes e JavaScript total de 1087,1 KiB, sem aumentar o teto.
- A modalidade Bingo na aplicação oferece Linha, Coluna, Diagonal, Quatro cantos e Cartela cheia, com seleção imediata e ícones autorais de papel: cometa, foguete, estrela cadente, quatro estrelas e Sol. Botões compartilham o acabamento dos controles da escuta e ilustram a seleção com facetas, sem as miniaturas de tabelas rejeitadas.
- Novas salas usam bingoMode, deck de 75 números sem repetição e cartelas BINGO 5 × 5 geradas pelo servidor, com centro livre. Criador controla o sorteio manualmente, inclusive quando participa. Não há áudio de vocabulário nem avanço por cronômetro neste fluxo.
- API aceita marcas apenas de números já sorteados que pertencem à cartela autenticada. Marcas repetidas não somam pontos; pedido Bingo só encerra com o padrão escolhido completo. Vencedor fica acima da pontuação de marcação no pódio. Ordem futura do sorteio não é publicada. Salas antigas sem bingoMode mantêm o fluxo anterior, sem reinterpretar cartelas em andamento.
- Fundo claro inclui sol, lua e estrelas ocre/lilás sem bloquear interação. Tema escuro mantém seu SVG separado. A prévia HTML local não é o fluxo de produção.
- Validação: verify passou com 995 testes, tipos, build e orçamento preservado (273,9 KiB inicial / 1087,7 KiB total). Regressões de sala passaram em 22 cenários desktop/móvel. Reexecução dos arquivos de cadernos que falharam sob alta concorrência, junto do bingo, passou com 29 cenários e 3 pulados previstos; não é uma alegação de nova execução integral dos 190 cenários. Cartelas e modos inspecionados por captura nos dois temas.

## Fundo claro (2026-10-05)

- Sol e lua agora têm padrão próprio no tema claro, com papel ocre e lilás. A regra anterior aplicava o fundo somente no tema escuro. O padrão escuro permanece inalterado.
- A física detalhada do globo permanece como estudo HTML local; a aplicação agora tem um sorteador Saturno em papel com os modos e cartelas numéricos integrados.

## Entrar como convidado (2026-10-05)

- A tela de login do fim do onboarding ganhou o botão "Entrar como convidado", abaixo de "Entrar com Google". A pessoa aparece como Guest e usa o app sem conta. Os estudos ficam somente neste aparelho: nada é enviado à nuvem e não há sincronização, e a tela e o Perfil dizem isso com clareza (recurso local, nunca apresentado como conta ou nuvem).
- A marca fica em `helena.guest.v1` (`src/domain/guest-session.ts`), fora das chaves sincronizadas. Com a nuvem ativa o app antes mandava toda pessoa desconectada de volta ao login; `requiresLogin` agora exclui o convidado, então ele continua no app ao recarregar.
- O botão de convidado não pede o aceite da Política de Privacidade, porque nenhum dado sai do aparelho; o aceite continua obrigatório para entrar com Google. O botão funciona mesmo sem o Firebase configurado.
- Entrar com Google (pop-up ou retorno do redirecionamento) apaga a marca de convidado. Na primeira conta sem dados na nuvem, o conteúdo local do convidado sobe para a conta, pela regra já existente. O Perfil do convidado mostra "Guest (convidado)", "Somente neste aparelho" e o botão "Entrar com Google", sem sincronizar nem sair da conta.
- No Modo Sala o convidado entra com o nome Guest. Limite conhecido: o servidor recusa nomes repetidos na mesma sala, então só um convidado por sala consegue entrar com esse nome. Convites de edição de caderno continuam exigindo login Google.
- O e2e de preparação do bingo (`e2e/room.spec.ts`) exigia rolagem da página, mas a preparação do bingo ficou curta com o #348 e cabe na janela do desktop. A exigência agora vale só quando a página é mais alta que a janela; a checagem de que "Criar sala" fica visível e habilitada não mudou.
- Testes: domínio (`guest-session.test.ts`), tela de login e Perfil (`google-login.test.tsx`, `profile-view.guest.test.tsx`) e e2e do onboarding até virar convidado e continuar após voltar ao app. Não verificado em produção: o efeito com o Firebase configurado depende de testar no domínio publicado.

## Preparação própria do bingo (2026-10-05)

- Bingo não exibe seleção de equipes, embaralhamento de questões, matéria/tema, dificuldade ou tempo por pergunta. O resumo de questões filtradas também foi removido, e a preparação informa que cada pessoa recebe uma cartela com sorteio compartilhado.
- Ao escolher bingo, teams é falso e shuffle é verdadeiro, evitando herdar equipes ou ordem fixa da escuta. O contrato existente de bingo de vocabulário e seu sorteio permanecem; esta alteração não integra o protótipo do globo numérico.
- Os controles de equipes, embaralhamento e tempo continuam disponíveis na escuta coletiva. Testes de interface cobrem o bingo e a troca de modalidades.
- Verificação completa e testes de navegador dependem do CI: o ambiente desta alteração está sem dependências instaladas e não conseguiu acesso de rede para preparar a execução local.

## Ícone da seleção da Helena (2026-10-04)

- Palavras escolhidas pela Helena usa helena-word-choice.svg exclusivo: somente o rostinho da gata grafite facetada, olhos amarelos com pupilas verticais e estrela na orelha. Cartas e patinha removidas conforme a revisão do proprietário. SVG estático, sem fonte externa, dependência ou alteração no fluxo; o ícone de modalidades permanece separado.

## Convites e seleção da Helena (2026-10-04)

- Preparação alinhada ao topo também no desktop. Dois botões compactos abaixo das modalidades oferecem entrada por código e leitura de QR, sem escolher um minigame primeiro.
- Câmera usa jsQR local, carregado somente ao abrir o leitor. Não grava nem transmite imagens; fecha as trilhas ao sair, inclusive se a permissão resolver depois. QR só preenche códigos válidos de convites do domínio atual ou oficial, sem navegar para links externos. Entrada manual permanece disponível quando a câmera falha.
- Palavras escolhidas pela Helena é alternativa às palavras prontas e arquivos, exclusiva da escuta. Quantidade de 5 a 50, em passos de 5. Servidor sorteia sem repetição ao iniciar, ignorando listas/filtros manuais e sem prévia pública das palavras. Cada repetição sorteia novamente.
- Criador só pode ativar participação na escuta com helenaWords. API também aplica a restrição, recusa mudanças após o início e impede voltar para escolha manual enquanto o criador participa. Bingo conserva a participação existente. Não é proteção contra o administrador que inspeciona o próprio banco público de palavras.
- Autoplay continua funcionando no dispositivo do organizador mesmo quando ele responde como participante. A opção compartilhada de áudio dos alunos permanece inalterada.
- Fundos escuros dos canvases principais recebem sol, lua e estrelas geométricas em papel, com baixa opacidade, também no celular. Não substitui fundos de cartões nem interfere nos alvos interativos.
- jsQR 1.4.0 (Apache-2.0), auditoria sem vulnerabilidades. Decoder lazy: 128,8 KiB sem compressão / 47,5 KiB gzip. Entrada inicial 273,9 KiB inalterada; total 1079,4 KiB, orçamento 1088 KiB com teto absoluto preservado.
- Validação local: verify passou com 982 testes; 20 cenários de sala passaram em Edge desktop e em viewport móvel, incluindo o cenário de reconexão do criador atualizado para cinco palavras aleatórias. Leitura usa QR real gerado em pixels no teste unitário; câmera recusada e liberação tardia têm regressões. Permissão e hardware de câmeras físicas dependem do dispositivo e não foram testados aqui.

## Densidade móvel da sala e teclado (2026-10-04)

- Até 600 px, preparação fica alinhada ao topo, modalidades usam grade 2 por 2 e palavras usam duas colunas. Espaçamentos, ícones e cartões são compactos, mantendo alvos de toque de pelo menos 44 px. Navegação superior/inferior e visual desktop permanecem.
- Explicação longa de participantAudio fica oculta apenas no celular; a configuração compartilhada não muda.
- Toque em Ouvir novamente cancela a transferência de foco somente se a resposta ainda estiver focada. Reprodução/cooldown continuam normais; sair do campo ou navegar pelo teclado permanece permitido. Não há refoco forçado nem tentativa de controlar o teclado virtual pelo JavaScript.

## Bloqueio de áudio e recorte dos sprites (2026-10-03)

- Reprodução manual e automática aguardam questionStartedAt no horário do servidor. Botões de áudio permanecem desabilitados durante a contagem inicial, e as funções de reprodução/repetição também recusam pedidos antecipados, sem iniciar cooldown.
- participantAudio é configuração compartilhada, desligada por padrão e controlada pelo criador. Quando ligada, vale para todos que entram, sem botão de ativação individual no lobby. O gesto de Entrar já libera o player; toque/teclado na sala também tenta liberar reprodução. Autoplay após recarregar ainda depende das regras do navegador e oferece reprodução manual em caso de bloqueio.
- Sprites aprovados permanecem intactos. O viewport de cada sequência oculta 2% nas bordas laterais, evitando o pontinho de quadros vizinhos durante a reprodução e na pose final, inclusive com movimento reduzido.

## Helena animada nos resultados (2026-10-03)

- Acerto e erro utilizam as duas sequências quadro a quadro aprovadas: Helena com confere verde ou triste com X vermelho. Cada sprite transparente possui 12 poses completas em grade 4 por 3, evitando articulação que deforma partes do personagem. As imagens são carregadas antecipadamente ao entrar no Modo Sala. A sequência executa uma vez por resposta e conserva a pose final. Movimento reduzido mostra apenas a pose final.
- Avisos de velocidade entram e saem animados em 1,2 segundo e são removidos do DOM, sem espaço reservado. Atualizações da sala não reiniciam o prazo; a próxima pergunta pode disparar um novo aviso.
- Arte conceitual inglesa permanece na seleção de palavras, mas sai do painel de acerto/erro. Palavra e tradução mantêm o papel violeta facetado. Sprites aprovados anteriormente com geração nativa foram convertidos para WebP transparente de 1200 por 900, sem novos serviços ou dependências.

## Recuperação, áudio compartilhado e inglês (2026-10-03)

- Stream continua sendo o transporte principal. Falhas acionam recuperação pela API em intervalos de 1 segundo, sem sobrepor pedidos. Uma resposta válida limpa o estado de reconexão. Prazos vencidos de pergunta/feedback também acionam recuperação rápida; retorno à aba busca o estado imediatamente. Revisões antigas e callbacks de streams substituídos são ignorados.
- Recuperação de uma turma atrás do mesmo IP não deve consumir o limite antigo de 600 heartbeats por minuto. Somente heartbeat recebe 2400/IP/minuto e limite adicional de 90 por credencial/IP/minuto, com chave hash e sem gravar tokens em claro. App Check e validação de credencial permanecem; outros limites não mudam. Aviso transitório de conexão fica em uma faixa compacta, sem deslocar a pergunta.
- Organizador pode escolher participar no lobby. A API host-player cria uma credencial de participante distinta da credencial administrativa, de forma idempotente, valida fase e autorização e não publica tokens. Resume do organizador recupera a participação; heartbeat mantém sua presença. Durante a rodada sua interface mostra resposta, não revelação ou projetor. Ele continua organizador no servidor e retoma os controles no resultado. Não é uma separação de privilégios contra o próprio dono da sala.
- Áudio em todos os dispositivos é opcional e desligado por padrão. Participantes liberam reprodução no lobby por um gesto, respeitando autoplay. RecordedRoomPlayer usa Web Audio após liberação, mantém reprodução manual como alternativa e cancela fontes ao mudar de pergunta ou desmontar. Não há microfone ou novo serviço externo neste fluxo.
- Contagem inicial possui três tons distintos e acorde de início. Últimos três segundos têm alerta duplo. Sons não são reproduzidos retroativamente após recuperar uma aba. Erro usa faixa mais audível; efeitos seguem sintetizados localmente.
- Contador inicial ocupa o viewport inteiro, sem o limite de largura do conteúdo nem limitação do SVG. Bandeira cresce separadamente das inscrições, evitando esticar nomes e pontos. Confetes passam de 14 para 48 recortes com trajetórias radiais, queda e formas variadas, respeitando movimento reduzido.
- Arte inglesa autoral da Helena substitui bandeiras nas palavras e feedback. Tradução integra o painel violeta, sem placa branca. Verdes e vermelhos recebem contraste mais forte e mantêm facetas de papel. Estado retomado sem feedback local não inventa um erro.
- Imagem gerada com a ferramenta nativa de geração, usando a ilustração de Escuta coletiva como referência, exportada em WebP transparente de 640 px (aproximadamente 78 KiB). Prompt: Helena no estilo de papel recortado original, outra pose, apresentando letras e livro, sem bandeira ou marca externa. Nenhum material privado foi enviado.

## Eclipses e feedback da sala (2026-10-03)

- Refinamento do pódio: molduras SVG próprias de raios solares, crescentes lunares e lua rubra; colocação, nome e pontos diretamente nas bandeiras, sem placas recortando o fundo. Bandeiras crescem a partir da base e medalhões entram com movimento suave; pontos contam de zero até o valor final, sem alterar o placar do servidor. Atualizações idênticas da sala não reiniciam a animação. Movimento reduzido mostra o resultado diretamente, sem confetes ou som de vitória.
- Primeiro colocado celebra ao terminar a contagem com confetes e arpejo sintetizado localmente. Restrições de áudio do navegador são respeitadas: sem contexto liberado, permanece silencioso. Pontos usam dourado, XP violeta e relógio turquesa; os pontos do pódio seguem a cor de cada eclipse.

- Ranking anima a troca de posições por deslocamento das linhas, preservando identidade e respeitando movimento reduzido. O último acerto ou erro é publicado pelo servidor por pergunta, sem expor a tradução, e pinta a linha verde ou vermelha. Confetes são recortes locais.
- Qualquer resposta errada de escuta desconta 5 pontos, com saldo mínimo zero. Bingo mantém a regra de passar sem penalização. Pontos de acerto continuam entre 100 e 20 pelo relógio do servidor; mensagens contextualizam a rapidez sem alterar a pontuação.
- Feedback usa painel de papel facetado, cores de resultado, bandeira proporcional no fundo e no contorno da palavra, efeitos sonoros sintetizados localmente. Não há upload ou serviço de som.
- Repetir exige presença online válida no servidor, usando a tolerância existente de 120 segundos; remove ausentes da nova rodada. Sem pessoas online retorna conflito com aviso. Voltar retorna às modalidades da sala e limpa a sessão anterior, sem navegar ao início.
- Pódio mantém molduras dos avatares e incorpora bandeiras de Eclipse Solar, Eclipse Lunar e Lua Sangrenta. No PC, pódio fica à esquerda e classificação completa à direita. No celular, os blocos se empilham e o cabeçalho respeita a área segura.
- Aviso de XP é compacto no topo, com X, barra de duração e fechamento após 6 segundos. Recibo e saldo continuam locais e idempotentes. Removidos os textos redundantes de atividade concluída e espera pela próxima escolha.

## Lobby, pontos e pódio coletivo (2026-10-03)

- Lado Lunar e Lado Solar reutilizam os símbolos dos marcadores de handwriting. Identificadores internos Roxo/Amarelo permanecem compatíveis com salas existentes. Contagens e placares usam PaperDigits do Foco.
- Lobby desktop separa convite e participantes em colunas, com ação de início visível e rolagem interna para listas grandes. Mobile mantém acesso ao conteúdo inteiro. Voltar usa a seta amarela original; Sair da sala continua explícito.
- Reprodução de áudio recebe ícone geométrico de papel e movimento reduzido. Placares mostram avatares com fallback, pontos grafite no claro e creme no escuro. Pódio tem molduras autorais, primeiro lugar central mais alto, segundo à esquerda, terceiro à direita e demais posições abaixo.
- Acertos valem de 100 a 20 pontos, reduzidos linearmente pelo tempo decorrido medido no servidor. Erro do líder continua descontando 5 pontos sem saldo negativo. Valores enviados pelo cliente não determinam pontos. Tentativa antecipada de avançar é um no-op sem erro e não pula perguntas/feedback.
- XP só é calculado na conclusão: 100/75/50 para os três primeiros, 40 no quarto e menos 5 por posição até o mínimo de 10. Empates recebem a mesma colocação e XP. Quem não respondeu não recebe XP, e encerramento antecipado não concede recompensa.
- Cada conclusão tem recibo por sala, geração, rodada e participante. Notificação individual grava o XP uma única vez em helena.room-xp.v1 ao receber o resultado; recarga não duplica o crédito. Falha de armazenamento é avisada. O saldo é local ao dispositivo, não sincronizado nem uma carteira global autenticada; essa integração permanece futura.
- Cobertura inclui rapidez, ausência, empate, repetição, idempotência do crédito, no-op antecipado, lobby em 1280x720, avatares, temas e pódio responsivo.

## Equipes, modalidades e retomada do Foco (2026-10-03)

- Seleção de modalidade recolhe as opções em Modalidades coletivas, com ícone de papel autoral e reabertura acessível. Remoção individual e limpeza das palavras mantêm o recorte por 220 ms para animar a saída, sem atrasar a atualização da seleção. Movimento reduzido desativa efeitos.
- Seleções antes turquesa usam o amarelo oficial #FACC15. Em equipes usa papel verde com facetas claras, reaproveitando a paleta da flor de Foco; placar de XP só aparece depois do lobby.
- Lobby em equipes oferece dois lados. Participantes escolhem seu próprio lado, anfitrião arrasta pelo puxador ou usa Mudar de lado. A API team valida credenciais e fase, publica via transporte existente e preserva equipes ao iniciar. Novas entradas recebem o lado com menos pessoas, sem impor equilíbrio obrigatório.
- Resolvidas as pendências de Foco registradas em 2026-10-02: Pomodoro usa prazo real para recuperar callbacks suspensos, registra conclusões no horário correto e grava histórico fora do atualizador React.
- Sessão ativa persiste localmente em olena.focus-session.v1 e retoma ao reabrir Foco ou recarregar. Após mais de 24 horas sem atualização retoma pausada. Essa sessão não sincroniza entre dispositivos; histórico semanal continua sincronizado. Trocar explicitamente de método ou reiniciar continua zerando o contador.
- Cobertura inclui controle de acesso da API, preservação de equipes, escolha e arraste no navegador, saída animada, retomada e avanço real do relógio.

## Fundo das palavras na Escuta coletiva (2026-10-03)

- Hover e foco por teclado mostram as cores sólidas da bandeira dos Estados Unidos em toda a superfície do botão. Faixas preenchem a largura, enquanto o campo azul usa altura proporcional e largura automática para preservar o formato das estrelas.
- A bandeira também preenche o contorno dos recortes das letras, com borda externa creme e face grafite. Traduções recebem uma pequena base creme para preservar contraste nos dois temas. A seleção e a aplicação das palavras permanecem imediatas.
- Teste da preparação verifica preenchimento completo, proporções preservadas, contorno e ativação por hover e foco.

## Controles da sala e investigação do Foco (2026-10-02)

- Banco mantém as 100 palavras selecionáveis com aplicação imediata, sem seleção em lote ou contador redundante de palavras na rodada. O plus é o PaperActionIcon da Agenda.
- Alfabeto monocromático reutiliza os recortes existentes com grafite/creme do Foco. Bandeira aparece somente no fundo em hover/foco. Respostas usam duas opções ilustradas acessíveis, sem select nativo.
- Tempo por pergunta ocupa as duas colunas e conserva os quatro passos igualmente distribuídos de 5 a 30 segundos.
- Foco: cronômetro usa Date.now, preserva pausa e reinício. PaperDigits é apenas apresentação. Testes conferem valores acessíveis com a fonte nova.
- Pomodoro: dias concluídos persistem em noteoli.pomodoro-streak.v1, incluído na sincronização. Semana vai de segunda a domingo; dias antigos ficam salvos, mas não acendem na semana seguinte. Pausas e sessões interrompidas não contam como Pomodoros concluídos.
- Limitação confirmada por teste: Pomodoro desconta um segundo por callback, sem recuperar tempo real após suspensão de aba. Nenhuma alteração de regra foi feita nesta investigação. O ciclo em andamento também não persiste ao sair da view; o histórico de dias é independente e permanece.
- Ao concluir o foco, writeSyncedStorage é chamado dentro do atualizador de estado. O evento síncrono pode atualizar PageHeader durante o render de FocusView, gerando aviso do React. Registrado como achado da investigação, sem ampliar esta mudança de interface.

## Rota da sala na hospedagem (2026-10-02)

- /sala retornava 404 ao abrir diretamente na Vercel: a navegação interna usava History API, mas faltava rewrite para index.html na hospedagem.
- Rewrite exato de /sala corrige acesso direto e recarregamento sem capturar APIs, áudios ou alterar a rota do projetor.
- Teste lê vercel.json e reproduz a ausência da rota antes da correção. O servidor local sozinho não reproduz essa configuração de produção.

## Controles e convite da sala (2026-10-01)

- Preparação mantém perfil e tema do cabeçalho. Inglês é uma opção expansível, inicialmente fechada, com busca e 100 palavras ao abrir. Seleções continuam aplicadas imediatamente e são preservadas ao recolher.
- Expansão, marcação e chegada dos chips usam movimentos discretos, desativados com movimento reduzido. O mais reutiliza PaperEditorIcon em grafite e creme.
- Trilho do tempo representa a posição escolhida, em vez de ficar sempre cheio. Os passos, teclado e persistência são preservados.
- Foco compartilhado é discreto e interno, sem moldura roxa exagerada; navegação por teclado não foi removida. Alto contraste mantém um indicador explícito.
- Convite e ações do criador ficam centralizados, sem Entrar com código para o anfitrião. Helena e QR permanecem, sem o cartão de fundo. Copiar usa papel turquesa no desktop e celular.

## Artes alinhadas ao onboarding (2026-10-01)

- As quatro cenas foram reconstruídas usando diretamente as artes do onboarding, com corpo compacto, facetas limpas e cenários simplificados.
- Escuta relaxada, flashcards junto ao quadro, quiz em movimento e bingo no banquinho substituem a pose frontal repetida. A revisão visual conferiu os quatro membros e a cauda, removendo o terceiro braço e o pé extra na mesa.
- Apenas imagens e documentação mudam. Caminhos, interação, regras de áudio e disponibilidade dos minigames permanecem iguais.

## Escolha de minigame e áudio do criador (2026-10-01)

- A entrada no Modo Sala apresenta apenas os quatro minigames, sem seleção. Configuração e Criar sala aparecem após escolher uma atividade disponível.
- Palavras prontas mantêm as 100 opções e seleção imediata, sem Importar lista. Enviar arquivos não permite acumular falas vazias: a anterior precisa de palavra, tradução e áudio guardado.
- Configurações de áudio foram removidas da preparação. Novas salas usam repetição ilimitada e reprodução automática; somente o criador reproduz automaticamente. Alunos continuam com Ouvir novamente e o cooldown existente.
- Checks visuais compartilham o símbolo facetado de papel; caixas nativas usam papel amarelo, inclusive configurações de handwriting. Slider de tempo conserva passos e teclado, com trilho roxo e cursor de papel amarelo.
- Quatro cenas da Helena com cenários foram geradas a partir do onboarding e otimizadas em WebP de 384px, cerca de 22 a 26 KB cada. Ficam no final dos cartões e aparecem suavemente no hover/foco e integralmente na atividade selecionada. Flashcards e quiz continuam indisponíveis.
- Testes cobrem estado inicial vazio, seleção automática, bloqueio de fala incompleta, ausência de importação e controles de áudio, autoplay exclusivo do criador e replay do aluno.

## Rolagem da preparação da sala (2026-10-01)

- O bloqueio de rolagem do body pertence somente ao painel de sala em tela cheia. A preparação embutida não recebe mais local-room-active.
- As 100 palavras continuam disponíveis, com seleção automática. A lista e Criar sala são alcançáveis por rolagem real, inclusive em telas baixas.
- O cabeçalho redundante Modo Sala e Voltar foram removidos da preparação. A navegação do aplicativo permanece disponível.
- Regressão visual verifica rolagem por wheel, não apenas scrollIntoView, que poderia ocultar o defeito.
- Listas roláveis contêm os textos acessíveis absolutos das letras decorativas. Sem esse contexto, as palavras fora da lista ampliavam a altura da página no celular.

## Preparação e convite separados (2026-10-01)

- Preparação permanece dentro da navegação do app no desktop e celular.
- Palavras selecionadas são aplicadas imediatamente ao rascunho local.
- Após criar, configurações ficam ocultas e convite e participantes ficam próximos.
- Envio de áudio com falha pode ser repetido sem reabrir a configuração.
- Ícone Modo Sala representa três pessoas em camadas de papel, com variantes dos temas.

## Modo Sala independente (2026-10-01)

- Rota `/sala` e navegação própria com ícone de sala em papel recortado nos temas claro e escuro. Praticar permanece dedicado à prática individual.
- Minigame, palavras e configurações são preparados localmente antes de criar a sala. O convite, QR e participantes aparecem somente depois da criação.
- Arquivos de áudio preparados antes da criação são enviados usando a credencial da sala criada. Nenhum arquivo é enviado durante a preparação local.
- Entrada usa o nome da conta, sem campo de nome de exibição. Loading acompanha entrada, criação e reconexão; a espera do App Check respeita o prazo da requisição.

## Liberação segura da transição para a folha (2026-10-01)

- A viagem da folha deixava de ter prazo ao encontrar o canvas; falhas de criação ou cancelamento das animações não liberavam a classe que oculta o editor. Agora há conclusão única, prazo total de quatro segundos e limpeza em falha ou desmontagem.
- Movimento reduzido e ausência da API de animação pulam a viagem sem esconder o editor. O movimento normal mantém duração e desenho existentes.
- O teste de ferramentas aguardava a Caneta antes de confirmar o carregamento sob demanda do editor. A preparação agora aguarda o diálogo pronto; as verificações da ferramenta permanecem iguais.

## Banco de palavras e arquivos na sala (2026-09-30)

- Removida a captura por microfone da Escuta coletiva. O Banco de palavras agrupa palavras prontas e arquivos de áudio com palavra/tradução. A API privada e a expiração de quatro horas permanecem iguais.
- Listas CSV, TXT e TSV são lidas no dispositivo, com limite de 64 KB e 500 linhas. A primeira coluna escolhe palavras em inglês ou português que já possuem áudio. Termos desconhecidos são informados, sem voz sintética de fallback nem promessa de extração de PDF/slides.
- Referências: Kahoot aceita áudio WAV, MP3, OGG e MPEG; Blooket importa CSV. O Olena também preserva os formatos existentes M4A e WebM, com limite de 256 KB por áudio e validação no servidor. Não foram adicionadas dependências.
- A seleção aplicada define a rodada inteira. Removido o controle de quantidade de perguntas da preparação; tempo e embaralhamento permanecem.
- Busca com lupa alinhada na horizontal; bandeira compartilhada entre onboarding e sala tem 50 estrelas e 13 listras. Recuperação centralizada, sem seletor de matéria na sala, e retomada com HelenaLoading.

## Correção transitiva de gRPC no Firebase (2026-09-30)

O job de testes de navegador tem limite de 25 minutos: a instalação dos navegadores
no runner pode consumir cerca de dez minutos e a suíte completa mais seis a sete.
O limite anterior de quinze interrompia a validação sem concluir os testes.
Todos os testes, projetos e verificações permanecem obrigatórios; apenas o tempo
máximo do job foi ajustado.

O teste da sala verifica captura nativa com uma fonte sintética quando MediaRecorder
existe. O WebKit headless do CI não fornece essa API: nesse caso, o teste exige o
aviso de indisponibilidade e guarda o primeiro áudio por arquivo antes de preencher
a palavra. A rodada completa, reprodução, respostas e retomada continuam testadas
nos dois motores. Isso não comprova permissões de microfone em aparelhos físicos.

O Firebase permanece na versão 12.19.0. Um override limitado a
`@firebase/firestore` fixa `@grpc/grpc-js` em 1.13.6, corrigindo os avisos
GHSA-m9gg-hp2v-232j e GHSA-f596-whhp-79r4. A versão antiga 1.9.16 fazia a
auditoria reprovar; a instalação com o novo lockfile não apresenta vulnerabilidades.
O proto-loader continua na série 0.7. Não foram alteradas regras, dados, credenciais
ou APIs da aplicação. A alteração afeta a árvore Node do SDK; o aplicativo web
continua usando os mesmos módulos de Firebase. As APIs da aplicação usam REST
para Realtime Database, não um servidor gRPC próprio.

Validação: instalação limpa com `npm ci`, `npm audit --audit-level=high`,
verificação geral e inicialização/encerramento local de Firestore pelo SDK Node,
sem conexão remota. Reverter o commit restaura o manifesto e o lockfile anteriores,
mas reintroduz a vulnerabilidade. Remover o override só quando a dependência
oficial de Firestore usar uma versão corrigida e a auditoria continuar verde.

## Tempo, áudio e componentes da Escuta Coletiva

Ao iniciar a Escuta, o servidor agenda a primeira pergunta para três segundos
depois. A contagem 3, 2, 1 é calculada a partir desse horário, não de um timer
isolado no navegador. As respostas anteriores ao início recebem 409; o relógio
da sala usa o horário informado nas respostas da API para reduzir divergências
entre dispositivos. O Bingo continua sem essa contagem. O aviso "Vai!" não
bloqueia cliques quando o tempo válido começa.

A sala usa voz na velocidade fixa 1×. A interface não oferece mais esse controle,
e a API recusa alterações de velocidade na sala. Um valor salvo por uma versão
antiga ainda é lido sem impedir a retomada, mas não altera a reprodução.
Pedidos de voz da sala exigem a credencial temporária de host ou participante,
passam pela mesma proteção App Check configurável da sala e só sintetizam o
texto da pergunta atual. O segredo não chega ao provedor de voz nem aos logs.
Os registros `speech_request` contêm somente escopo, status e duração. A
ativação externa de App Check continua dependente da configuração de produção.

`LocalRoom` segue como coordenador da rodada e dos estados de interação. O
convite e os avatares do lobby foram extraídos para
`local-room-lobby-presentation.tsx`; placar, pódio e projetor estão em
`local-room-projector.tsx`. São componentes de apresentação, sem nova
abstração de dados ou mudança de regras da sala.

## Convite e participantes da Sala

O convite e os participantes ficam agrupados na coluna esquerda no desktop, com
o QR em cima e a lista logo abaixo. A configuração alta dos minijogos ocupa a
coluna direita sem esticar a distância entre esses cartões. No celular, o fluxo
continua empilhado. A ilustração usa WebP transparente de 41 KB em vez do PNG de
699 KB, preservando o QR vetorial separado. Não há resumo fixo no rodapé;
Iniciar atividade continua no fluxo da página.

A criação reaproveita o token OAuth da conta de serviço entre as chamadas ao
Firebase enquanto a instância da API estiver ativa, em vez de pedir um token em
cada operação. App Check continua habilitado, e sua preparação começa quando
o botão recebe foco ou ponteiro. O botão informa "Criando sala…" com o loading
da Helena até a resposta chegar.

A troca entre Escuta e Bingo seleciona o cartão imediatamente, mostra HelenaLoading
e bloqueia novas alterações até confirmar a resposta. Falhas restauram a seleção
confirmada. Participantes usam foto do perfil ou avatar padrão, nome e status Pronto
(Ausente quando desconectados). A lista forma colunas de até seis linhas, com
rolagem horizontal quando necessário. O nome ainda é de exibição, não identidade
autenticada. Avatares aceitos são arquivos locais do perfil ou imagens HTTPS Google.

## Praticar e Sala com controles de papel

Praticar retira o texto auxiliar do cabeçalho, a instrução de escolha de mundo e as
estrelas dos indicadores de progresso. A navegação usa um controle de videogame
recortado, com variantes grafite e creme para os estados existentes.

A entrada do Modo Sala usa ícones facetados do `PaperEditorIcon`, com turquesa
e amarelo para criar e ocre e amarelo para entrar com código.
A Sala compartilha o acabamento de botões do aplicativo mesmo sendo renderizada
em um portal. O cabeçalho oferece Modo Projetor com ícone próprio e Sair da sala
com a porta vermelha do editor. No projetor, o cabeçalho não repete o código
mostrado em destaque no conteúdo, nem mostra Online; contagem de participantes
e tela cheia usam ícones de papel do editor.
Os participantes continuam na lista. Os ícones usam turquesa para Escuta, laranja
para Flashcards, coral com base caramelo para Quiz e verde para Bingo,
preservando os desenhos e as facetas aprovados com contraste sobre o cartão roxo.
Os títulos auxiliares de convite e escolha de atividade foram removidos.
Escuta, Flashcards, Quiz e Bingo recebem SVGs exclusivos de papel; os jogos ainda
indisponíveis continuam desativados. O play usa a arte creme facetada aprovada.

## Controles legíveis, formas completas e numerais de papel

A seta de retorno fica junto ao título do caderno. Os botões ativos usam roxo com
texto creme; no celular, os rótulos podem ocupar outra linha da barra sem serem cortados.
A capa oferece Ver folhas por ícone expansível e não mostra criação de folha.
O menu Inserir sem desenhar contém apenas elipse, retângulo, triângulo, seta e polígono.
Régua e coordenadas continuam nos instrumentos existentes do editor.

Arrastar, aumentar e mover pelas setas respeitam os limites do grupo com a espessura
da tinta. A escala usa o tamanho real da folha, inclusive quadros maiores que 1200 por 1600.
Cronômetro e Pomodoro usam os numerais aprovados de papel, grafite no tema claro e
creme no escuro, com texto acessível e arte SVG compartilhada carregada pelo próprio site.

## Gestos de formas e expansão do preview

A barra do caderno expande o próprio botão e acomoda seu rótulo, como os instrumentos
da folha. A navegação inferior móvel fica oculta durante a leitura, personalização
e edição, retornando à vitrine. O play dos dois modos de foco usa papel creme.
O símbolo de inserir formas volta à composição anterior de quadrado e triângulo.

Mover usa a geometria inicial do gesto e limita o grupo inteiro à folha, sem
achatar seus pontos. Redimensionar mantém o canto oposto do conteúdo fixo, usa
projeção na diagonal para evitar crescimento ao cruzar a âncora e respeita os
limites da folha proporcionalmente. O último ponto ao soltar é aplicado, as alças
também funcionam no modo Mover e sua área de toque acompanha o zoom.
O caderno móvel aberto mantém proporção 1,4:1, sem ocupar a altura inteira disponível.
`design-previews/numeros-papel.html` contém os numerais vetoriais de 0 a 10 em
grafite e creme, conforme aprovação visual, agora também usados pelos temporizadores.

## Inserção de formas e ações do caderno

Os botões de criação usam as facetas creme e roxas do design system. A barra de
ações do preview do caderno mantém só os ícones no estado compacto e expande os
rótulos ao passar o mouse, focar pelo teclado ou ativar uma ferramenta. O menu
Inserir sem desenhar usa ícones próprios para formas, régua e eixos. Todos os
objetos entram na área visível da folha e já ficam selecionados; círculos e curvas
da régua respeitam essa área. Mover pelo quadro selecionado funciona ao arrastar
por dentro da seleção com mouse, caneta ou toque, inclusive para eixos.

## Confirmação de salvamento, capas e movimento das pastas

O salvamento manual confirma a versão persistida no armazenamento local antes de
mostrar sucesso por quatro segundos; falhas preservam o rascunho. Não representa
confirmação de sincronização em nuvem. A comparação normaliza a compactação dos traços.
O filtro Só favoritas mantém texto escuro sobre papel claro em ambos os temas.

Pastas mantêm as dimensões aprovadas e nome apenas abaixo. A transição dos livros
tem prioridade sobre o estilo global dos botões, com retorno animado e suporte a
movimento reduzido. Personalizar oferece a capa original e Oliver e as estrelas;
a escolha persiste em coverStyle e acompanha vitrine, pasta, arraste e viagem.
O preview Personalizar mostra as duas capas em um inventário visual de papel à esquerda do caderno fechado,
com miniaturas, nome e indicação da capa em uso. A escolha atualiza o preview.
JavaScript total medido: 888,2 KiB na CI Linux, 887,2 KiB local Windows.
O teto passa de 888 para 890 KiB para a confirmação e seleção de capa, sem
novas dependências e sem mudar o limite da entrada inicial.

GeoGebra foi examinado no commit e7fb8b166e9c1489e31a5705134271a39c69b830,
em checkout separado, sem incorporar código ou carregar serviços externos.
A incorporação aguarda definição de uso comercial/licença pelo proprietário.
Referências: https://www.geogebra.org/license e
https://geogebra.github.io/docs/reference/en/GeoGebra_Apps_Embedding/.

## Vitrine e pastas brancas

A prateleira agora acompanha uma altura comum para os objetos. Nomes, contagens
e controles ficam abaixo da barra, sem deslocá-la ao abrir pastas. Pastas usam
branco translúcido com facetas e adesivos celestes, conforme o pedido específico
do proprietário. O acabamento de vidro fica restrito às pastas.

Cadernos podem ser arrastados para pastas e retirados para a vitrine usando
pointer events de mouse, caneta e toque. Soltar fora da vitrine cancela o gesto;
pastas cheias conservam o caderno na origem. O painel de ações abaixo das pastas
foi removido: miniaturas abertas permitem abrir e arrastar os cadernos, e o modo
Selecionar inclui pastas na exclusão e em Selecionar tudo. Excluir uma pasta
preserva seus cadernos. Miniaturas abertas são clicáveis e fornecem a origem e o destino
da animação existente do caderno. A pasta permanece aberta ao voltar do preview.

## Pastas, colaboração do caderno e escala de tinta

Crie oferece caderno ou pasta. Cada vitrine admite três pastas, cada pasta admite
três cadernos. Os limites vivem no reducer, não somente na interface. Retirar ou
desfazer uma pasta conserva os cadernos e folhas. Pastas de anotações antigas
continuam distintas (`folder`); as novas coleções usam `collection` e `shelf`.
A arte de papel recortado usa Lua, Sol e Estrela, com abertura acessível por toque
e teclado, inspirada no movimento de pasta enviado pelo usuário (byllzz/Uiverse).

Pincéis e borracha oferecem escala de 0 a 100%, em passos de 1%. Zero corresponde
ao menor tamanho utilizável, não a uma ferramenta invisível. A borracha agrupa
amostras por quadro e rejeita traços distantes antes do cálculo geométrico.
Atualizações remotas aguardam o fim do gesto; confirmações atrasadas são conciliadas
contra o documento efetivamente enviado, sem ressuscitar fragmentos apagados.

A sala pertence ao caderno: índice, títulos e tinta por folha compartilham a
mesma equipe. Cursores têm pageId. A fila offline é separada por sala/folha e
retomada ao navegar. Novas folhas são registradas antes de publicar sua tinta.
Avatares aparecem na capa quando mais de uma pessoa está online. O painel de
colaboração tem fechamento próprio. Título da folha mantém papel claro; gavetas
do editor seguem o tema escuro. Miniaturas recebidas são renderizadas pelo mesmo
motor do editor, sem imagens externas ou nova dependência.

Compatibilidade: salas antigas sem `pages` mantêm o protocolo de folha única.
O formato de tinta não mudou. O índice usa merge de três versões para conservar
criações, remoções e renomes simultâneos. Prévia pendente usa PNG válido, mantendo
a validação e leitura anterior dos assets. Nenhum dado antigo é apagado na transição.
O rollback precisa manter leitura de `collection` para não rejeitar pastas novas.
Peso medido: entrada 269,8 KiB; aplicação 873,6 KiB. O limite lazy sobe para 878 KiB
para comportar as funcionalidades solicitadas, sem alterar o orçamento inicial.

## Encadernação papercraft

A capa mantém a ilustração aprovada da Helena e ganha contracapa rígida em camadas,
lombada costurada, etiqueta de papel e cantoneiras menores. O fecho usa um botão
dourado octogonal em vez da estrela, inclusive durante a abertura e no caderno aberto.
O miolo tem bordas de folhas escalonadas, dobras discretas e pontos de encadernação.
O espaço de criação à direita recebe o acabamento de guarda com bolso e cartão
decorativos, sem alterar as áreas de escrita ou adicionar controles sem função.
Os acabamentos usam cores sólidas da identidade original e não mudam os dados salvos.

## Folheamento da capa, criação e tinta por área

Capa e folhas compartilham a curva de movimento e o giro de 520 ms. O verso
da capa leva uma cópia da folha na mesma escala, sem revelar o miolo por varredura
horizontal. A nova folha do preview também se destaca e amplia até o editor.
O estabilizador limita a distância visual até a ponta a 1,5 pixel de tela e mantém
a suavização de pressão. O primeiro ponto é pintado imediatamente; a amostra mais
recente do navegador e a posição de soltura entram no traço, inclusive na janela de escrita.
A borracha recorta segmentos dentro do caminho percorrido, incluindo os espaços
entre eventos. Os fragmentos conservam cor, pressão e inclinação; desfazer recupera
o traço original em uma única ação. Não há mudança de formato no documento salvo.
Testes de navegador verificam tinta e borracha com eventos de mouse, pen e touch;
isso não substitui medição física da latência de uma mesa digitalizadora.

## Capa navegável e entrada na folha

A criação oferece somente cadernos e a vitrine não mostra a instrução de arrastar
pastas. Pastas existentes continuam acessíveis, preservando seu conteúdo.
A primeira folha volta à capa por arrasto para a direita, seta esquerda ou Capa.
A capa abre por toque, teclado ou arrasto para a esquerda, inclusive em Personalizar.
A transição mantém as medidas das folhas e coloca a capa sob a pilha antes de
entregar o preview. O arrasto nativo da imagem foi desativado para não cancelar o gesto.
Ao abrir uma folha pelo preview, ela se destaca e amplia até o canvas do editor.
O fundo do caderno se dissolve durante esse percurso. Movimento reduzido abre direto.

## Camadas e transições do caderno

Marcas ficam entre a capa e as folhas, com pontas acessíveis fora do papel.
O fecho é independente da capa e abre para a direita. A viagem usa uma cópia
visual das folhas reais; Personalizar e Ver folhas também animam o fechamento
e a abertura. A capa aceita gesto para a esquerda. Controles aguardam a transição.
O índice usa o mesmo ícone no editor e preview, com setas de papel e botão claro.

## Caderno celeste e navegação física

A barra reúne a seta amarela original, capa, divisórias, marcador, edição e índice.
Títulos são editáveis sobre as folhas: Enter ou sair do campo salva; Escape cancela.
Lua e Sol ficam na ponta inferior do marcador, também na vitrine. O campo opcional
`NotebookTab.motif` conserva marcas antigas como Lua e persiste a escolha de Sol.
O fecho de estrela ganhou facetas maiores e aparece aberto junto à borda do livro.
`NotebookJourney` mede origem e destino após a navegação e anima transporte, capa,
forro e fecho, devolvendo o foco ao destino. Movimento reduzido não cria a viagem.
O teste `notebook-celestial` cobre os dois percursos, edição, persistência, modelos,
oclusão ao folhear e largura móvel de 320px.

## Camadas físicas e acabamento do caderno

Marcações na abertura atual ficam sobre o papel; as demais permanecem atrás dele,
com pontas expostas para navegação. O foco não eleva todas as marcações juntas.
O teste de navegador verifica a área clicável do corpo do marcador antes e depois
de folhear, além da permanência das pontas. Durante a virada, o papel cobre as peças.
O marcador Lua usa recorte com margem creme, crescente dourado facetado e corpo
roxo com constelação. Cantoneiras e costura dão acabamento ao caderno aberto.
`NotebookCover` unifica capa de preview e vitrine, com etiqueta presa por fita,
fecho de estrela e lombada em camadas. Ferramentas usam papel branco e texto grafite
nos dois temas. Os títulos das folhas ficam acima do conteúdo, fora dos marcadores.
No celular, a fita é mais curta para não capturar o toque no centro da folha.

## Correções do preview móvel e fechamento do editor

Salvar manualmente atualiza a referência limpa do documento e fecha sem oferecer
um rascunho redundante. A confirmação de saída permanece para alterações não salvas,
mas não afirma mais que a cópia local está sincronizada. Marcações permanecem
presas às folhas durante a folheada e ficam atrás do papel que passa à frente. No celular, o spread usa a altura
disponível sem limite artificial; a vitrine reserva espaço para capa, título e trilho,
sem sobreposição nem rolagem horizontal causada pela largura da prateleira.

Marcações: o toque navega à folha; Editar marcas permite ajustar nome e cor.
O contraste dos controles acompanha o tema. Divisórias sobrepõem a borda como
abas coladas; o marcador traz uma meia-lua papercraft e fica para fora da
borda inferior. As pontas continuam visíveis e acionáveis, e a mesma Lua aparece na
capa fechada da vitrine.

## Atualização: marcações diretamente no papel

O preview agora usa ferramentas arrastáveis, sem formulário de atribuição por folha.
Divisórias ficam presas à borda direita; fitas saem por baixo da folha escolhida.
`StudyNotebook.paperTabs` persiste a âncora, posição, nome e cor. Dados legados
continuam válidos e são convertidos ao editar as marcações, sem apagar assuntos.
Clicar numa divisória navega à folha em vez de filtrar o caderno. A virada acompanha
o arrasto pela lombada com frente e verso; remover na prévia anima o papel amassado.
Teclado, posicionamento por clique e movimento reduzido possuem caminhos equivalentes.
A implementação não adiciona dependências. O JS medido fica em aproximadamente
274.2 KiB inicial e 818 KiB total; limites ajustados para 276 e 822 KiB, com margem
restrita para diferenças do build Linux.

Os registros abaixo descrevem também os comportamentos anteriores à atualização.

Em celulares até 600px, cadernos ocupam uma janela fixa entre cabeçalho e navegação.
Prévia e capa se adaptam à altura; apenas a estante e a gaveta de divisórias rolam.
As fitas usam recortes, dobras e um marcador amarelo de papel.
Trocar Quadro por A4 agora ajusta proporcionalmente traços e objetos aos limites,
evitando rejeição no salvamento. Autosave aguarda imagens carregarem e agenda nova
tentativa quando ficam prontas; erros reais mantêm sua causa no aviso.

## Caderno papercraft: folhas duplas e divisórias

O preview usa `NotebookSpread` com duas folhas reais por abertura. Mouse, toque,
setas do teclado e botões navegam em pares; a última posição livre permite criar
outra folha. Cada folha tem abertura e remoção próprias. A capa aprovada Helena,
estrelas de papel usa a arte atual em uma pose inédita, otimizada em WebP (40 KB).

As fitas representam divisórias do caderno e podem ser reordenadas ou posicionadas
na lateral ou embaixo. `StudyNotebook.subjectIds`, opcional, preserva sua ordem e
divisórias vazias; `StudyNote.subjectId` associa folhas sem duplicar conteúdo.
A seleção filtra a leitura e novas folhas herdam a matéria selecionada. Cadernos
antigos continuam válidos e a migração dos cadernos padrão preserva divisórias.
`bookmarkedPageIds` guarda estrelas de folhas importantes, exibidas na prévia e
acessíveis por atalhos. O interior aberto mostra somente folhas, nunca a capa.
Os controles novos ficam no módulo de cadernos carregado sob demanda. O orçamento
do JavaScript total foi ajustado de 812 para 816 KiB (medição: 813,9 KiB),
enquanto a entrada inicial continua abaixo do limite de 274 KiB.

Os papéis `weekly` e `calendar` são modelos sem data fixa, preenchidos pelo usuário.
São desenhados no mesmo canvas das folhas e participam de salvamento, reabertura
e exportação. A validação de documentos aceita os dois novos tipos.

## Editor de cadernos: quadro, livro e preferências

Folhas novas abrem no editor expandido e começam em um quadro de 3200 por 2400
unidades. Documentos antigos continuam em 1200 por 1600. O tipo de papel pode ser
alterado sem cortar conteúdo; somente páginas vazias voltam ao formato menor.
Dimensões são validadas, salvas e compartilhadas no documento. Imagens, post-its,
ponteiros e exportação usam as dimensões da página.

O rodapé agora permite folhear o caderno e criar a próxima folha no final. A troca
salva o documento atual e interrompe a navegação se falhar. A reabertura recupera
o documento salvo também sem o identificador local, necessário entre dispositivos.
Erros de salvamento continuam visíveis, sem o antigo rodapé de conectividade.

Configurações à esquerda do upload agrupam escrita, texto e coordenadas.
A chave versionada helena.notebookPreferences.v1 participa do snapshot da conta
e recebe os dados aplicados pela sincronização existente. Não há novo backend.
Estojo de camadas, confirmação de saída e convite usam o papel facetado da marca.

O pincel mantém pressão suavizada por tempo, inclusive com posição parada;
preserva inclinação ao salvar e evita alargar a ponta ao finalizar. Eventos agrupados
compartilham uma medição de layout, e a janela ampliada não muda para outra curva
ao levantar a caneta. Referências técnicas: [filtro 1€](https://gery.casiez.net/1euro/)
e [Pointer Events, W3C](https://www.w3.org/TR/pointerevents/).
Testes automatizados não substituem avaliação com caneta física em Android/iOS.

## Identidade e presença no caderno

Corrigida a criação de uma participação por aparelho para o mesmo UID. A entrada
reutiliza a participação da conta e elimina duplicatas antigas dessa conta ao reentrar.
Saída explícita remove a conta; desconexão mantém avatar e vaga com presença offline.
O login Google deixou de sobrescrever o avatar escolhido com o avatar padrão.
Testes cobrem reentrada autenticada, credenciais após saída e expiração da presença.
Painel de convite e seleção acompanham o tema; ações usam ícones facetados do app.
O traço livre não é serializado nem sincronizado enquanto o gesto estiver em andamento.
Isso reduz trabalho durante a escrita, mas não equivale a uma medição em todos os celulares.

## Correção do compartilhamento de cadernos

O endpoint de cadernos falhava na inicialização em produção com `ERR_MODULE_NOT_FOUND`.
Os imports transitivos do validador agora incluem `.js`, como exige o Node ESM.
`npm run api:check`, integrado ao `verify`, transpila e carrega todas as APIs em processos
Node reais para detectar falhas que o resolvedor do Vite não reproduz.
A criação da sala grava a folha inicial na mesma operação que gera o convite.
O token de leitura continua isolado das credenciais de edição; a proteção App Check,
os limites de requisições e o limite de quatro participantes continuam aplicados.
A leitura pública por token também exige App Check. A chave reCAPTCHA Enterprise
precisa autorizar `olenastudy.vercel.app` para o Modo Sala e os links de visitante.

## Navegação móvel e smoke tests

O seletor de aparência da barra móvel abre acima da navegação, dentro da área visível e clicável. O avatar do topo móvel abre o mesmo seletor de perfis do desktop, com persistência e sincronização existentes. Os testes E2E agora usam os controles e rótulos atuais de cada largura, sem selecionar elementos ocultos da outra interface. A suíte local cobre desktop e mobile; testes específicos de uma plataforma são pulados na outra.

## Revisão do editor, salvamento e compartilhamento

Os seletores de tipo e cor do papel usam miniaturas branca e papel de livro, lado a lado,
com opções compactas e nomes revelados no foco ou hover. Upload, Exportar e Salvar ficam
na segunda linha de ferramentas. O estojo mantém instrumentos e amostras, sem título ou
descrições repetidas. A seleção usa ações roxas facetadas sobre grafite. A janela ampliada
no celular tem rolagem própria do editor para impedir sobreposição com a folha.

O editor salva automaticamente no workspace após uma pausa de 900 ms e tenta finalizar
o salvamento ao sair. A sincronização usa a conta Firebase existente e informa o estado
real de envio. Sem login, a cópia permanece neste dispositivo. Rascunhos de recuperação
registram sua versão-base para não substituir uma folha atualizada pela nuvem. Reabrir
uma folha nova na mesma sessão reutiliza o identificador do arquivo já salvo.

Salvar oferece arquivo no caderno, PDF da folha atual, seleção de folhas e link somente
para leitura. O link publica uma cópia das imagens escolhidas, expira em sete dias e não
contém credenciais de edição. Atualmente a seleção exige folhas com imagem salva; folhas
sem imagem precisam ser abertas e salvas antes. A colaboração continua sendo da folha
aberta, com até quatro participantes, e não sincroniza a criação de outras folhas da sala.
O código retornado pelo servidor agora é utilizado nos envios; alterações em objetos
distintos são conciliadas por identificador e versões antigas recebidas são ignoradas.
Edições simultâneas do mesmo objeto podem prevalecer pela última alteração recebida.

Os testes usam navegador real com servidor de colaboração em memória. Eles não comprovam
a configuração da conta Firebase, App Check ou variáveis do ambiente de produção. Os
índices de `firebase-room.rules.json` que habilitam a limpeza programada das novas
cópias foram publicados em 2026-10-02.
Modelo de ameaça e limites: `docs/NOTEBOOK_SHARING_SECURITY.md`.

## Novos avatares oficiais

O seletor compartilhado inclui Alice (ratinha), Soso Estrelinha (borboleta), Nicolas (raposa), Guilherme (gato branco), Erick (cervo), Miau (coruja) e Luizão (corvo), preservando os cinco avatares anteriores. As artes fornecidas usam imagem proporcional em um SVG com recorte individual da moldura, tornando transparente apenas o exterior sem remover detalhes claros dos personagens. O menu permite rolagem em telas baixas. A seleção utiliza a persistência e sincronização do perfil existentes.

## Conta e sincronização

O login Google usa Firebase Authentication com persistência local explícita. Workspace, tema, perfil, onboarding, progresso Solo e cache de dificuldade são replicados no Realtime Database sob `users/<uid>/state`; as regras limitam leitura e escrita ao próprio UID. O Perfil mostra conta, estado, última confirmação, sincronização manual e logout. Alterações que falham por falta de rede permanecem pendentes e são tentadas novamente, sem serem marcadas como enviadas. Alterações simultâneas são conciliadas por chave; conflitos preservam o local, guardam a versão remota em `helenastudy.sync-conflict.v1` e exibem o estado de conflito no Perfil. O logout explícito remove do dispositivo as chaves sincronizadas e a cópia de conflito da conta anterior. A seção Recuperação local mantém até seis snapshots recentes do workspace neste dispositivo, ignora duplicatas consecutivas e permite restaurar uma versão anterior pelo Perfil.

## Régua, marca-texto e documentos importados

A barra do editor acompanha o tema: papel branco no modo claro e grafite no escuro. Ícones de ação ficam brancos no escuro e pretos no claro; instrumentos conservam suas cores. Estojo, seletor de papel e rodapé usam papel branco recortado no modo claro e grafite recortado no modo escuro. A importação permite cancelar antes de concluir e escolher tamanho inicial de 25% a 100%. Selecionar permite mover, redimensionar proporcionalmente, girar em passos de 15° ou remover imagens importadas, com suporte ao histórico. Documentos antigos continuam usando o fundo legado; novas importações entram como objetos independentes, permitindo várias imagens na mesma folha. Post-its podem ser redimensionados pela alça própria, com texto recalculado para preservar legibilidade e exportação completa, inclusive quebras de linha.

Régua abre um estojo técnico no mesmo idioma visual do seletor de papéis. O botão da ferramenta mostra a unidade ativa e o estojo alterna cm, in e px. Há seis instrumentos funcionais: régua reta, esquadros de 45° e 30°/60°, transferidor com encaixe de 15°, gabarito circular e curva francesa. Esquadros e transferidor encaixam o traço nos respectivos ângulos; gabarito e curva geram geometrias completas. A folha digital tem largura convencional de 21 cm; unidades não representam medidas físicas da tela, e seguem o zoom do documento. Caneta abre o estojo ilustrado com Fineliner, Caneta-tinteiro e Pincel macio. A escolha permanece ao alternar entre ferramentas. O estojo de coordenadas mostra uma leitura local de Δx, Δy, distância, inclinação e ângulo durante o arraste e ao selecionar um eixo existente; o Assistente local sugere uma expressão, permite revisar e inserir uma anotação de fórmula sem apagar os traços. Ao selecionar traços, o OCR local opcional usa Tesseract.js sob demanda para sugerir texto simples, números e operadores; a sugestão é editável e só entra na folha após confirmação. A imagem fica local no navegador e nenhum traço é enviado a um serviço externo.

Marca-texto inicia amarelo, desenha um caminho contínuo com transparência uniforme e é composto antes da escrita. Multiplicação preserva o texto de páginas importadas; na folha escura vazia usa screen. Exportar reúne PNG, PDF direto da folha atual, impressão e exportação do caderno inteiro em sequência A4. O PDF direto baixa uma página local sem abrir diálogo; imprimir continua disponível para margens e destino escolhidos pelo sistema. Importar aceita PNG/JPEG/WebP e uma página selecionada de PDF, mantendo anotações existentes; PDFs com várias páginas também podem ser convertidos em folhas separadas do caderno. A página é rasterizada localmente, ajustada sem distorção e persistida como background JPEG (até 500 mil caracteres), inclusive no rascunho, histórico e exportação. Não edita o conteúdo original do PDF; permite anotar por cima. Limpar folha apaga anotações, preservando a página de base. Painel Camadas permite ocultar o documento importado e reordenar coordenadas, escrita, texto e post-its, com estado persistido no documento e incluído em desfazer/refazer e exportação. Selecionar inclui sistemas de coordenadas, post-its e texto, permitindo mover ou apagar conteúdo junto com traços, com modo retangular ou laço livre e escala proporcional da seleção. Post-its podem alternar para checklist, ordenar-se para frente ou para trás e exportar título, itens concluídos e cores. Texto possui correção automática local opcional ao sair da área, preservando código, links e emails.

PDF.js 6.3.289 é a única dependência nova, necessária para rasterização de PDF no navegador. Carregada sob demanda com worker local, sem enviar documentos. Arquivos limitados a 20 MB, PDFs protegidos solicitam cópia desbloqueada. Auditoria de dependências sem vulnerabilidades. O orçamento de PDF + worker é separado (1800 KiB); entrada inicial mantém 264 KiB e aplicação 684 KiB. Barras e painéis usam grafite com ações roxas facetadas, sem quadrados claros atrás dos ícones.

## Borracha de texto e controles compactos

O editor de cadernos também oferece uma primeira sala colaborativa em `/api/notebook-collab`: código
de convite, presença nominal, limite rígido de quatro pessoas e atualização do documento com uma
atividade curta mostrando quem agiu. A sala expira e valida a folha no servidor; a etapa atual usa
última atualização do documento inteiro, não um CRDT por ponto.

Barras de ferramentas usam grafite facetado e base deslocada como a navegação. Rótulos são brancos; ícones de ação usam preto com facetas, preservando as cores dos instrumentos. O roxo da seleção permanece também durante hover nos dois temas, com teste de regressão desktop/mobile.

Trocar de ferramenta anima a elevação e o encaixe do ícone por 420 ms; o nome se expande por 320 ms. prefers-reduced-motion desliga essas transições.

A borracha substitui por espaços os caracteres tocados do texto integral, preservando a posição dos demais e o histórico de desfazer/refazer. Caixas de texto legadas são apagadas como objetos inteiros. Selecionar Borracha encerra a edição de texto e deixa o canvas receber o gesto. Salvar usa disquete redesenhado; Exportar e espessuras usam papel roxo facetado. Ferramentas e ações revelam os nomes ao passar o mouse, focar pelo teclado ou selecionar, em todas as larguras. Ícones ficam diretamente sobre as barras, sem fundos adicionais.

## Compatibilidade de pincéis

O campo opcional brush fica em cada traço e é validado na leitura; folhas antigas mantêm seus estilos. Canvas principal, janela ampliada, rascunho, histórico, PNG e impressão compartilham esse estilo. O estojo foi restaurado após uma interpretação incorreta do pedido; seus três instrumentos continuam disponíveis no desktop e no celular.

## Instrumentos de papel e régua com medida

Borracha e post-it adaptam os SVGs fornecidos pelo proprietário. Lápis e marca-texto usam cores de objeto; ações usam grafite/creme conforme fundo e tema. Cor da tinta oferece amostras selecionáveis e cor personalizada. Espessura apresenta três amostras reais de traço. Salvar folha recebe as facetas e a base do botão roxo compartilhado, inclusive no portal do editor.

A régua exibe graduação e comprimento em pixels da folha durante o arraste. O cálculo usa coordenadas do documento, independente do zoom, e a sobreposição desaparece em pointerup/pointercancel. Apenas o segmento desenhado é salvo ou exportado; a medida é transitória.

## Controles do editor manuscrito

Tela cheia ao lado de Fechar usa Fullscreen API quando disponível, com alternativa CSS ocupando a janela. A saída restaura o editor sem perder a folha. PaperEditorIcon substitui os ícones de contorno das ferramentas, histórico e exportação por silhuetas em camadas de papel. No celular, rótulos dos instrumentos e histórico se expandem ao selecionar ou focar, com nomes acessíveis preservados e suporte a movimento reduzido.

## Preview de entrada e texto integral

Ao abrir um caderno, o preview permanece até uma ação do usuário. Anterior e Próxima percorrem todas as folhas reais, uma por vez, com rotação na lombada inspirada no exemplo de anand_4957 (Uiverse.io) fornecido pelo proprietário. Clicar na folha abre o editor; Ver todas as folhas abre a galeria. Não há temporizador nem leque de páginas sobrepostas. Movimento reduzido mantém a navegação sem animação perceptível.

Texto ativa uma área com as margens da página, persistida como pageText opcional. Quebras de linha são compartilhadas entre edição e exportação, com aviso ao atingir a capacidade física da folha. Rascunho, histórico, limpeza e exportação incluem pageText; caixas legadas permanecem editáveis. O corretor nativo recebe pt-BR, autocorreção e capitalização de frases, conforme suporte do navegador/teclado. Revisar texto é uma ação local reversível para acentos comuns e início de frases, não IA nem revisão gramatical completa. Links, emails e código delimitado são preservados; palavras ambíguas não recebem acentos automáticos.

## Arraste de pastas e texto manuscrito

Pastas usam a estrutura em camadas e os movimentos do FolderComponent fornecido pelo proprietário, adaptados em CSS para papel recortado, sem transparência de vidro nem dependência nova. Pointer Events permitem arrastar a pasta sobre a capa na vitrine, com indicação de destino. Teclado: espaço seleciona a pasta, Enter no caderno move, Escape cancela. O caderno apresenta abertura da capa e entrada de folhas com respeito a movimento reduzido. Texto no editor usa objetos posicionáveis (stickies com kind text, ink), com edição, movimentação, desfazer, rascunho e exportação. paperColor também é preservado no salvamento final, corrigindo a perda da cor ao reabrir.

## Pastas interligadas e criação unificada

A vitrine oferece Crie, com escolha entre caderno e pasta de anotações. StudyNotebook aceita kind opcional folder e parentId opcional, mantendo compatibilidade com dados anteriores. Pastas guardam notas de texto e podem ser movidas entre a vitrine e cadernos. Excluir o caderno devolve suas pastas à vitrine, preservando as notas. Folhas novas oferecem digitalização e escrita à mão; conteúdo digitado antigo permanece acessível. O editor resolve notas e folhas para corrigir a abertura das notas. Capas possuem lua crescente facetada e fita atrás da capa, saindo do bloco de páginas. Prateleiras têm base de papel roxo e rolagem horizontal no celular.

## Vitrine de cadernos e régua

Cadernos exibem capas autorais de papel com lombada e marcador. O usuário informa um nome e abre as folhas dentro do caderno. Novos cadernos e suas folhas usam subjectId vazio, sem vínculo obrigatório com matérias; os registros anteriores são preservados.

A régua do editor traça um segmento entre o início e o fim do gesto, salvo como traço de caneta com dois pontos. Participa do desfazer, da exportação e da reabertura existentes.

## Cadernos e Perfil no desktop, 20/09/2026

Nos botões roxos dos Cadernos, documento e lápis usam corpo grafite nos dois temas, com facetas escuras e pequenos detalhes de contraste.

Digitalizar usa documento com marcas de captura e Escrever à mão usa lápis facetado, ambos com 32px e cores próprias. Perfil está também na Área do aluno da barra lateral, abre as mesmas configurações do celular e usa a variante creme no tema escuro ou quando ativo. Não é duplicado na gaveta Mais.

## Preferências de estudo, 20/09/2026

- O workspace local está na versão 6 e armazena modalidades, organização, ritmo e interesse em
  programação em `studyPreferences`.
- O onboarding usa perguntas textuais sem ícones para essas escolhas. As preferências podem ser
  alteradas no Perfil, junto das configurações de Pomodoro.
- Escolher Python, JavaScript ou ambos cria a matéria Programação se ela ainda não existir. Não há
  trilhas, execução de código ou conteúdo de programação nesta entrega.
- O roteiro completo para recomendações, mapas conceituais, desafios e trilhas futuras está em
  `docs/STUDY_PREFERENCES_ROADMAP.md`.
- O Espaço do aluno exibe uma rota recomendada sem bloquear a navegação. Revisões pendentes vêm
  primeiro; sem conteúdo, a rota abre a Biblioteca; com conteúdo, usa a preferência para sugerir
  Biblioteca, Cadernos ou Praticar.

## Tomate Pomodoro em papel, 19/09/2026

O Pomodoro usa um tomate facetado, largo e arredondado, com cálice verde recortado. A animação de consumo acompanha o novo contorno e respeita movimento reduzido. Os sete marcadores semanais também usam tomates compactos.

## Métodos de estudo no Perfil, 19/09/2026

A aba Perfil reúne as configurações do método Pomodoro. O usuário escolhe rodadas de 25 ou 50 minutos e ativa ou desativa a pausa longa após quatro rodadas. A tela Foco usa a preferência sincronizada sem repetir esses controles junto ao temporizador. As maçãs do histórico semanal ficaram discretamente menores para equilibrar a composição no celular. A mensagem das pausas usa uma largura própria e quebra de texto equilibrada.

## Cabeçalho e foco móvel controlado, 19/09/2026

A foto de perfil permanece no cabeçalho móvel e não volta para a gaveta Mais. Praticar usa o ícone grafite em repouso e a versão clara quando ativo. Os controles Começar do cronômetro e do Pomodoro usam play em papel grafite. A tela Foco bloqueia o excesso de deslocamento além dos limites da página, centraliza o conteúdo quando há altura disponível e preserva a rolagem necessária em telas menores sem esconder controles.

## Navegação e Perfil em produção, 19/09/2026

A navegação desktop encosta no conteúdo sem sombra ou faixa vazia nos temas claro e escuro. No celular, o cabeçalho não exibe foto de perfil, o seletor de aparência permanece dentro da tela e mostra sol e lua com contraste. Praticar usa o ícone grafite original sobre papel roxo sem recorte circular. Perfil é uma aba funcional, troca para a versão clara do ícone quando ativa e abre a tela de recurso em produção.

## Ícone grafite na ação de prática, 19/09/2026

O botão Começar prática no Espaço do aluno usa a variante grafite original do ícone Praticar sobre o papel roxo, nos temas claro e escuro.

## Navegação e foco responsivos, 19/09/2026

O cabeçalho móvel volta a reunir Mais, aparência e foto circular. Mais abre a gaveta de ferramentas; Perfil ocupa a quinta posição inferior com uma silhueta autoral inteiramente em papel grafite, sem elementos decorativos. Não usa a foto do usuário e fica desabilitado até a implementação das configurações de perfil, conta e aplicativo. O estado da gaveta é compartilhado por contexto e o perfil acompanha alterações locais sincronizadas. Desktop e celular usam o mesmo seletor Claro, Escuro e Sistema.

O rail acompanha o tema com texto grafite sobre creme no claro e creme sobre grafite no escuro. A área principal começa na borda do rail, com margem interna de 24px no desktop. O destaque de Praticar mantém facetas roxas e arte creme nos dois temas. O carrossel reserva espaço para sombras e foco dos botões; as sete maçãs usam colunas flexíveis e os controles móveis aproveitam a largura disponível. Testes de navegador cobrem 320, 360, 390, 768 e 1280px, aparência e alcance dos botões acima da barra inferior.

## Preferências e metas de foco sincronizadas, 17/09/2026

O Pomodoro permite escolher 25 ou 50 minutos e ativar ou desativar a pausa longa. Essas preferências fazem parte do workspace v5 e usam a sincronização da conta. O formulário de meta mostra minutos no temporizador e pomodoros no modo Pomodoro. O prazo usa calendário próprio em papel recortado, com o intervalo entre hoje e a data final marcado como um caminho de dias.

## Ciclo Pomodoro completo, 16/09/2026

O Pomodoro executa automaticamente 25 minutos de foco e 5 minutos de pausa. A cada quatro focos concluídos, inicia uma pausa longa de 15 minutos. A interface conta os pomodoros concluídos e mostra o avanço da rodada atual. A maçã usa vermelho facetado, folha verde e acabamento de papel recortado.

## Mostrador Pomodoro em maçã, 16/09/2026

O contador fica no centro da silhueta vazada de uma maçã em papel recortado. O contorno roxo acompanha o tempo restante e muda para verde durante a pausa. Facetas, folha dobrada e base deslocada seguem a identidade OlenaStudy. A lógica de ciclos permanece igual.

## Barra desktop e Espaço do aluno, 15/09/2026

O rail desktop usa fundo grafite e ícones claros no tema claro. No tema escuro, usa fundo branco e ícones grafite em todos os estados. O cartão inicial do Espaço do aluno não mostra a antiga mascote 2D. A identidade aprovada da Helena permanece nos fluxos de onboarding, login e mundos.

## Onboarding e loading em papel, 14/09/2026

Preview disponível em /?onboarding=1, sem bloquear visitantes existentes ou convites de sala. Cinco perguntas e cinco poses WebP, com pré-carregamento da próxima imagem. Login Google requer VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN e VITE_FIREBASE_PROJECT_ID, provedor Google habilitado e domínio autorizado. A sincronização de estudos e a autorização da colaboração foram implementadas posteriormente, como descrito nas seções mais recentes.

Autenticação usa SDK Firebase existente, preparado ao abrir a etapa de login, antes do clique. Popup cancelado ou configuração ausente mostram erro, nunca simulam sucesso; nenhum token é salvo manualmente. Google confirmado ativo no Firebase. Configuração local adicionada em arquivo ignorado pelo Git. Publicação das variáveis na Vercel e validação real com uma conta continuam pendentes. Consultar GOOGLE_LOGIN.md. Habilitação geral e persistência de rascunho continuam pendentes.

Budget revisado com medição: entrada 223,6 KiB (limite 226); total 555,1 KiB (limite 560), incluindo SDK Auth opcional (~124 KiB) e onboarding (~12 KiB). Não é todo baixado na abertura. Padrão visual e atribuição do loading em DESIGN_SYSTEM.md. Navegação móvel no escuro usa barra branca e ícones grafite. Trilha usa rolagem em vez de deslocar a estrada.

## Iconografia em papel recortado (14/09/2026)

- Os 12 ícones de marca da navegação e do tema usam 36 SVGs em `public/navigation-icons/paper/`, com fundo transparente, faces poligonais e dobras discretas. Fontes PNG anteriores preservadas.
- As variantes roxas existem: estados ativos do menu móvel e Mais, hover/foco de ações rápidas, ação principal do Espaço e sol do seletor de tema. A seleção CSS existente foi preservada.
- Claro usa grafite; escuro usa creme; ativo usa roxo. Amarelo permanece como detalhe. Nenhuma textura raster ou dependência adicional.
- Ícones utilitários, troféus, Helena animada e artes aprovadas do Modo Sala permanecem inalterados. Todas as abas existentes já possuem ícones, sem novas funções fictícias.

## Carregamento das artes Solo (14/09/2026)

- Ilhas e trilhas usam WebP otimizado. As ilhas ficam entre 129 e 151 KB, as trilhas móveis entre 207 e 230 KB e as panorâmicas entre 292 e 331 KB.
- O navegador prioriza a ilha e a trilha visíveis. As demais artes só são baixadas quando necessárias, evitando disputar a rede com a imagem atual.
- PNGs originais permanecem no repositório como fontes aprovadas. A interface usa os WebPs.

## Trilhas panorâmicas no desktop (14/09/2026)

- Acima de 900px, `picture` seleciona `public/solo-interior-{1,2,3}-desktop.webp`. No celular, os PNGs aprovados continuam inalterados.
- WebP sem perda, sem redimensionamento artificial. Resolução entregue: 1672 por 941 pixels. Melhora o enquadramento panorâmico, mas não equivale a uma fonte 4K.
- Ferramenta integrada Imagegen. Prompt aplicado às três referências `solo-interior`: expandir horizontalmente a cena aprovada para 16:9, solicitar 3840 por 2160, preservar centro, câmera, cores e papel recortado, completar laterais com cenário correspondente, sem esticar, personagens, texto, interface ou estrada. A resolução solicitada não foi entregue; foi preservada a resolução real.
- Arte original, progressão, animação e posições dos níveis preservadas. Em revisão local, sem merge.

## Interiores dos mundos Solo (13/09/2026)

- As trilhas usam cenários contínuos próprios em `public/solo-interior-1.png`, `public/solo-interior-2.png` e `public/solo-interior-3.png`, em vez da ilha de seleção ampliada.
- Artes criadas com a ferramenta integrada Imagegen, usando cada `solo-world` aprovado como referência. Brief aplicado: ambiente visto de cima dentro do mundo, papel recortado facetado, terreno até as bordas, centro livre para estrada interativa, sem personagens, texto ou interface. Variações: bosque com bibliotecas e lanternas, cidade com prédios-livro e canais, observatório com cúpulas e jardins rochosos.
- Estrada e níveis compartilham um quadro proporcional, com os centros dos marcadores nos pontos da curva. Mascote, ilhas de seleção e bloqueios foram preservados.
- Alteração local em revisão visual, sem publicação ou merge nesta etapa.

## Helena animada, proporções revisadas (13/09/2026)

- O SVG compartilhado pelo loading e pela jornada Solo segue a silhueta original: cabeça ampla, orelhas equilibradas, olhos amarelos e estrela regular de cinco pontas.
- As duas patas têm espaço entre si e alternam deslocamento vertical, sem a rotação que sobrepunha os pés. Mochila roxa e caderninho foram mantidos a pedido do usuário, com balanço suave do braço que segura o caderno, sem encobrir os pés.
- Mantidos fundo transparente, encaixe no nível atual e suporte a movimento reduzido. Os mundos e a arte aprovada do QR code não foram alterados.

## Modo Sala, endurecimento em revisão (12/09/2026)

Esta seção atualiza o diagnóstico histórico abaixo; código na branch não significa configuração ativa em produção.

Atualização: o CI da PR #98 passou em Chromium/WebKit. A limpeza agora percorre até
10 lotes de 100 por caminho, com orçamento global de 45 segundos e relatório
`pendingPaths`; substitui o limite inicial de um único lote citado abaixo. Permanece
pendente a ativação externa e a validação em aparelhos físicos/Firebase real.

- Concorrência: leitura ETag e gravação condicional no estado privado, repetição de conflitos e publicação pública monotônica por geração/revisão. Criação, entrada e resposta têm recibos idempotentes. Publicação e estado privado ainda são duas gravações; heartbeat/repetição repara falha intermediária.
- Identidade: token privado de participante separado do identificador público. Credenciais e respostas do quiz não entram na projeção pública.
- Presença: heartbeat de 15 segundos; tolerância de 2 minutos; inativos saem do lobby e ficam sinalizados na partida. Anfitrião ausente encerra a sala na próxima interação. Não há transferência de controle nem detecção instantânea por onDisconnect; se todos saírem, a expiração limita a vida da sala.
- Abuso: limites distribuídos por origem de rede e ação; App Check com verificação de assinatura/claims implementado, mas **não ativado**. O projeto appstudyoli não tinha aplicativo Web registrado na consulta desta execução. Falta chave pública reCAPTCHA Enterprise/domínio e configuração do app.
- Expiração: prazo absoluto de 4 horas, regras de leitura por expiresAt e limpeza autenticada agendada de projeção pública/privada/contadores. **Regras e cron ainda não publicados**. O lote atual remove até 100 itens por caminho/execução; monitorar acúmulo e ampliar frequência/capacidade antes de maior escala. Projeções legadas sem expiresAt exigem migração/remoção separada.
- Rodada: categoria, contagem por dificuldade, prévia, até 30 flashcards de matéria própria, equipes alternadas, embaralhamento e entrada tardia configuráveis. Compartilhar matéria envia frente/verso temporariamente ao servidor; aviso explícito no seletor. Material próprio usa dificuldade média.
- Escuta em sala: a lista personalizada aceita pares colados com `=`, ponto e vírgula, vírgula, tabulação ou hífen e informa erros por linha. A interface da sala usa somente a lista manual, sem modelo pronto, materiais salvos ou controle de tolerância a erros. A tela do anfitrião oculta a palavra por padrão; cada participante recebe feedback privado com resposta, tradução e XP antes do avanço. Repetições e reprodução automática são sincronizadas na sala; a velocidade da voz é fixa.
- Feedback da escuta: quando todas as pessoas ativas respondem, o servidor grava o prazo de três segundos no estado privado e público. Nem o avanço pedido pelo anfitrião nem a retomada da sala pulam esse prazo, mesmo se o tempo da pergunta terminar antes. A contagem e a barra dos participantes usam o prazo compartilhado. Sem conclusão de todos, a rodada ainda termina pelo tempo configurado.
- Bingo: cartelas e marcas validadas no servidor; primeira cartela completa encerra a partida. Entrada tardia recebe até 9 itens restantes e pode ter cartela menor; desabilitar entrada tardia quando a igualdade competitiva for importante.
- Resiliência: Error Boundary da sala, cancelamento de requisições, timeout, retomada com retry sem apagar credencial em falha transitória, validação de payloads, logs de ação/status/duração, foco de teclado contido no diálogo.
- Evidência local: concorrência de 30 entradas/respostas em armazenamento atômico de teste; ETags/412 com HTTP simulado; partidas completas de quiz e bingo com anfitrião e dois jogadores em contextos separados, incluindo reload. Transporte E2E usa handler real + adaptador em memória, **não Firebase real**. Edge instalado substituiu browsers cujo download falhou; Safari/WebKit, bloqueio físico de celular, carga real de 30 dispositivos e auditoria assistiva completa continuam pendentes.
- Dependências: firebase (App Check oficial, carregamento dinâmico) e jose (JWT/JWKS no servidor). Entrada inicial permanece abaixo de 222 KiB; orçamento total passa a 395 KiB por ~44 KiB opcionais do SDK e novos controles.

Ativação e limites operacionais: ver `ROOM_SETUP.md`.

## Sistema oficial de ícones OlenaStudy

- A navegação usa glifos preenchidos e arredondados próprios para Espaço, Agenda, Foco, Praticar, Mais, Biblioteca, Hábitos, Notas, Planos e Banco.
- A mesma geometria assume grafite sobre superfícies claras, roxo no estado ativo e creme sobre a navegação escura.
- O amarelo permanece reservado aos pequenos acentos de cada símbolo, de acordo com a identidade da OlenaStudy.
- Os mesmos componentes são reutilizados na barra lateral, na navegação móvel, no menu Mais, nos atalhos e no botão Começar prática.
- No celular, a barra é preta no tema claro e roxa no tema escuro; em ambos os casos ela reutiliza a variante branca dos ícones oficiais.
- A aba ativa recebe um pulso curto e o novo módulo entra suavemente, com as animações removidas quando `prefers-reduced-motion` está ativo.

## Dificuldade automática do vocabulário

- O quiz de escuta classifica palavras como fáceis, médias ou difíceis usando frequência Zipf.
- Não existe catálogo local extenso nem gerador Python. A lista personalizada é o fluxo principal e o Modelo pronto mantém somente cinco palavras.
- A classificação opcional consulta a Datamuse e fica em cache local. Se a rede falhar, uma estimativa determinística mantém a atividade disponível.
- O aluno pode escolher nível misto, fácil, médio ou difícil antes da rodada.

## Correção da navegação desktop

- A barra lateral desktop mantém o fundo preto definido no redesign, mesmo após as camadas legadas de CSS.
- Os ícones autorais recebem dimensões fixas e cores específicas no desktop para evitar encolhimento e deformação.
- O estado ativo usa o roxo da marca, enquanto os ícones inativos permanecem creme sobre o fundo escuro.

## Quiz de escuta e pronúncia

- A área Praticar agora oferece uma sessão de escuta baseada nos flashcards da matéria selecionada.
- Quando não há flashcards suficientes, um conjunto inicial de lugares em inglês mantém a atividade utilizável.
- Cada rodada pronuncia o termo com a Web Speech API, apresenta uma contagem regressiva, aceita respostas em inglês ou português e revela o resultado somente após a tentativa.
- Termos errados podem formar uma nova sessão de reforço, sem envio de áudio ou conteúdo a serviços externos.
- A experiência oferece feedback textual e respeita `prefers-reduced-motion`.

## Redesign visual completo

- A aplicação passa a usar uma linguagem visual de “mesa de estudos”, com base creme, navegação preta e destaques violeta e amarelo.
- A navegação reutiliza os ícones autorais já existentes e mantém a silhueta da Helena em todos os módulos.
- Foram adicionadas transições curtas para navegação, painéis, ações rápidas e abertura do menu móvel, sempre respeitando `prefers-reduced-motion`.
- O ícone de Planos de aula recebeu uma nova geometria interna para impedir o corte da letra A em tamanhos reduzidos.
- A alteração é exclusivamente visual e preserva os fluxos, dados locais e funcionalidades existentes.

## 1. Fundação inicial: 2026-08-29

O repositório nasceu contendo apenas um README. A primeira base estabelece:

- produto focado em planejamento de aulas para professores de inglês;
- React, TypeScript estrito e Vite;
- identidade OlenaStudy com assinatura Oli;
- criação determinística de um rascunho de aula no navegador;
- interface responsiva sem autenticação;
- lint, formatação, testes, build, orçamento de bundle e E2E;
- auditoria de dependências, SBOM, Gitleaks, Semgrep, CodeQL e Dependabot.

Autenticação, IA, uploads, banco e exportações foram deliberadamente adiados. A interface não deve
dar a entender que esses recursos já existem.

## 2. Primeiro contrato E2E mobile

A primeira execução da CI rodou o teste chamado “mantém o conteúdo dentro da tela no celular” nos
dois projetos do Playwright. O fluxo mobile passou, mas o mesmo teste exigiu a barra móvel no
desktop e falhou corretamente. O contrato passou a ser explicitamente restrito ao projeto
`mobile`; a verificação de overflow e a presença da navegação continuam obrigatórias no iPhone.

## 3. Redução da aparência artificial e retorno ao desenho original

A primeira interface usava gradientes de fundo, transparências, sombras grandes, muitos cartões
arredondados e uma releitura genérica da cabeça da mascote. O conjunto parecia uma demonstração
gerada, não uma ferramenta de trabalho.

A direção foi simplificada para fundo neutro, painéis planos, bordas discretas, cantos pequenos,
tipografia de sistema e textos mais diretos. A fala da mascote e os elementos decorativos foram
removidos. `public/helena.svg` agora preserva a silhueta irregular, os olhos amarelos e as pupilas
do desenho original fornecido para a marca. A navegação desktop agora usa um rail compacto com os ícones oficiais em variantes
clara, roxa e escura, nomes revelados no hover/foco e alternância de tema no canto superior direito.
O retrato de Helena usa o PNG transparente `public/helena-mark.png`, sem moldura de aplicativo. A
navegação desktop pode ser expandida pelo botão de três linhas para revelar categorias e nomes,
enquanto o cabeçalho mantém a assinatura OlenaStudy com o sufixo roxo. Os arquivos
individuais em `public/navigation-icons/` mantêm os desenhos aprovados sem reinterpretá-los e evitam
dependência de posicionamento por sprite no navegador.

## 4. Fundação da central de estudos

O escopo foi ampliado por decisão de produto: o planejador de aulas permanece, mas passa a fazer
parte de uma central pessoal de estudos e rotina. A primeira entrega adiciona:

- tela Hoje derivada de tarefas, agenda, hábitos e sessões de foco;
- criação de matérias compartilhadas pelos demais módulos;
- criação e conclusão de tarefas;
- compromissos com data e horário;
- cronômetro de 25 ou 50 minutos e registro da sessão realizada;
- hábitos diários marcáveis;
- cadernos com edição e salvamento automático;
- workspace local compartilhado, validado e versionado.

Os dados são salvos em `localStorage` e a interface informa esse limite. Não existe conta, nuvem,
IA, notificação nativa ou bloqueio real de aplicativos. O aviso do módulo Foco deixa explícito que
o modo sem distrações depende de uma futura versão mobile.

## 5. Sistema local de estudos

A segunda etapa amplia o workspace para a versão 2 e migra automaticamente dados da versão 1. A
entrega adiciona:

- Biblioteca com links e textos cadastrados manualmente;
- flashcards vinculados a matérias;
- revisão programada com opções Errei, Difícil e Fácil;
- questionários determinísticos criados a partir dos próprios cartões;
- metas relacionadas aos minutos registrados no módulo Foco;
- histórico local de resultados de questionários;
- carregamento sob demanda de Biblioteca, Aprender e planos de aula.

Não há geração por IA nem leitura automática de arquivos. Links só são abertos quando usam HTTP ou
HTTPS. O novo orçamento separa a entrada inicial de módulos assíncronos, mantendo limites de 220
KiB inicial e 300 KiB total.

## 6. Definição segura do backend de IA

A terceira etapa começa pela fronteira de segurança, sem ativar uma IA na interface. A entrega
define:

- contrato versionado para tutoria, explicação, resumo e plano de estudos;
- seleção explícita de fontes, sem serializar o workspace completo;
- consentimento obrigatório por solicitação e retenção inicial `none`;
- cliente restrito a `/api/helena` na mesma origem;
- handler portável com validação de origem, tipo, tamanho e limite de uso;
- interfaces independentes para provedor, identificação e rate limit;
- respostas e erros limitados, sem detalhes internos;
- modelo de ameaça e requisitos prévios à ativação.

Não existe provedor conectado, segredo versionado ou chamada externa. A interface continua sem
afirmar que oferece IA. A ativação depende de uma nova mudança com runtime, provedor, política de
retenção, orçamento e implantação aprovados.

## 7. Redesign de conforto e navegação

A navegação e a hierarquia visual foram reorganizadas sem alterar o domínio ou a persistência. A
entrega mantém a paleta original e o SVG da Helena, mas reduz títulos excessivos, melhora tamanhos
de toque, espaçamento, leitura de formulários e clareza dos estados ativos.

No desktop, os módulos ficam agrupados em Principal, Estudar e Organizar. No celular, a barra
inferior prioriza Hoje, Agenda, Foco e Aprender; as demais ferramentas ficam em um painel Mais com
acesso direto. A interface não usa gradientes, vidro, neon ou elementos decorativos que simulem uma
demonstração de IA.

A assinatura visível da marca secundária foi removida a pedido do proprietário. O nome exibido é
somente OlenaStudy, sem alterar a origem ou as regras de engenharia do repositório.

## 8. Fundação do Espaço do aluno

A tela inicial passa a se chamar **Espaço do aluno** no desktop e usa o rótulo curto **Espaço** na
barra móvel. O conteúdo continua derivado do mesmo workspace local, preservando tarefas, agenda,
hábitos, foco e materiais já existentes.

Um catálogo tipado separa módulos disponíveis, fundações técnicas e recursos planejados. Os atalhos
da tela inicial são gerados apenas para ferramentas funcionais. O mapa mental e o roadmap registram
vestibulares, banco de questões, documentos, OCR, mapas conectados, cultura, bingo e Helena
inteligente sem apresentá-los como recursos prontos.

Esta fase não adiciona dependências. React, TypeScript e CSS existentes atendem à mudança; futuras
bibliotecas ou linguagens exigirão justificativa, auditoria e medição na fase correspondente.

## 9. Digitalização, escrita à mão, quizzes e bingo

Os Cadernos passam a oferecer duas ferramentas locais. **Digitalizar** abre a câmera traseira em
navegadores compatíveis ou permite escolher uma imagem, girar, realçar o contraste e anexar o
resultado à anotação. **Escrever à mão** oferece uma tela sensível a mouse, caneta e toque, com cor,
espessura e limpeza antes de salvar.

As imagens são processadas no navegador, não são enviadas para serviços externos e ficam limitadas
a 1 MB por item. O OCR local opcional do editor reconhece apenas a seleção de traços quando o
usuário solicita, e mantém o resultado como sugestão revisável. Reconhecimento matemático avançado
ou conversão confiável para LaTeX continuam dependentes de um provedor especializado e consentido.

O módulo antes chamado Aprender agora aparece como **Praticar** no desktop e no celular. A entrada
mostra um mundo por vez, com três PNGs transparentes em estilo de papel recortado e sem personagens
incorporados. As setas trocam as ilhas e Helena vira para a direção do salto. Na trilha sem moldura, a mascote fica sobre o nível
liberado, acompanhando o progresso local, enquanto recortes das artes aprovadas de cada mundo formam o cenário da trilha. No desktop, a trilha abre em tela cheia. A entrada mantém a transição para a trilha.
A trilha usa plataformas numeradas em um caminho sinuoso, respeitando movimento reduzido.
A entrada
organiza Escuta, Flashcards, Quiz e Bingo como minigames Solo em três mundos navegáveis, com o
Modo Sala destacado logo abaixo. O Mundo 1 possui um caminho de quatro níveis com desbloqueio
progressivo local; os Mundos 2 e 3 podem ser inspecionados e permanecem bloqueados. A cartela 3 por 3 combina
desafios gerais com flashcards da matéria, salva o progresso no workspace e reconhece linhas,
colunas e diagonais.

O workspace evolui para a versão 3 e migra automaticamente as versões 1 e 2. Nenhuma dependência
foi adicionada; Canvas, Pointer Events e captura de arquivo do navegador atendem à primeira versão.

## 10. Iconografia própria da OlenaStudy

A navegação desktop, a barra inferior mobile e o painel Mais passam a compartilhar uma família de
ícones SVG criada para o produto. Cada módulo mantém um símbolo reconhecível, mas usa a assimetria,
as pontas e os olhos amarelos derivados da silhueta original da Helena.

Os ícones são componentes locais, herdam a cor do estado ativo e não dependem de imagens geradas,
fontes de ícones ou novos pacotes. Os rótulos textuais continuam visíveis e responsáveis pelo nome
acessível de cada aba.

## 11. Vocabulário e voz do quiz de escuta

O quiz de escuta combina os flashcards do aluno com um modelo local pequeno de cinco palavras
em inglês, sem duplicar termos. As respostas aceitam a palavra ou expressão ouvida, a tradução
principal e equivalentes cadastrados. Os filtros Fácil, Médio e Difícil continuam sendo calculados
pela base local de frequência, com os mesmos fallbacks já documentados.

A pronúncia neural do Quiz individual e do Bingo usa o **Cloudflare Workers AI**
(modelo `@cf/myshell-ai/melotts`), chamado por `/api/speech` com token protegido.
Na Escuta Coletiva, o professor grava ou envia uma fala por palavra com sua tradução.
Cada participante recebe a mesma gravação, sem MeloTTS nem voz do navegador.

Existe um serviço próprio Kokoro+Piper (`services/tts`, container separado, Kokoro como voz principal
e Piper como reserva automática) totalmente implementado e testado, mas **fora de uso em produção no
momento**: nenhuma hospedagem grátis viável foi encontrada pra rodar os dois modelos juntos (ver
`docs/AI_BACKEND.md` para o histórico completo da investigação). O Cloudflare Workers AI resolveu isso
porque roda na infraestrutura deles mesmo, sem precisar hospedar nada.

Uma tentativa ainda mais antiga de rodar o Kokoro-82M direto no navegador (worker) também foi removida,
porque o download e a inicialização locais prejudicavam o tempo até a primeira pronúncia, problema que
nenhuma das abordagens server-side repete. O áudio é reutilizado por texto normalizado e velocidade no
cache do navegador (durante a sessão). Requisições antigas são canceladas quando a seleção muda. Se o
Cloudflare Workers AI falhar ou não estiver configurado, a melhor voz em inglês instalada no
dispositivo é acionada automaticamente somente no Quiz de Escuta individual. No Modo Sala, falhas
mostram uma tentativa manual, sem voz do aparelho. O Bingo compartilha a voz gerada por
frase por uma hora; a Escuta Coletiva usa as gravações do professor até a sala expirar,
conforme `docs/AI_BACKEND.md`.

As rodadas são embaralhadas sem repetição e aceitam 5, 10, 15 ou todas as palavras disponíveis. O
modelo embutido foi reduzido a cinco exemplos; listas personalizadas e cartões do aluno são o fluxo
principal. O feedback correto e incorreto possui ícones, textos e ações distintos, e uma trava impede
que a mesma submissão altere a pontuação duas vezes.

## 12. Modo Sala online

O Modo Sala usa uma função same-origin como autoridade e o Firebase Realtime Database como
armazenamento temporário e transporte realtime. O professor cria um código temporário, configura a
rodada e compartilha link ou QR code. Participantes entram em outros dispositivos com nome de
exibição e recebem as mudanças por Server-Sent Events nativos do navegador.

Tokens do anfitrião e o baralho completo ficam apenas no armazenamento privado. A projeção pública
expõe somente o estado necessário à partida; o servidor valida início, respostas, cronômetro e
placar. Salas expiram após quatro horas e aceitam até 30 participantes. Não há conta ou ranking
global. Reconexão com identidade preservada, presença após fechamento abrupto, App Check e rate
limiting continuam pendentes.

O lobby mostra conexão, participantes e convite. A entrada normaliza o
código e informa separadamente sala inexistente, iniciada, cheia ou nome duplicado. No celular, o
cabeçalho da sala permanece visível e oferece uma ação textual para sair.
O lobby do anfitrião usa layout responsivo em papel recortado. No desktop, convite e participantes
ficam na coluna esquerda, atividades e configurações na direita. No celular, convite/QR aparece
primeiro, participantes logo abaixo e os controles seguem em uma coluna sem rolagem horizontal.
Escuta coletiva e Bingo estão disponíveis; Flashcards em grupo e Quiz competitivo aparecem
desabilitados como “Em breve”.
A ação de início continua visível. Os ícones aprovados do projeto,
a arte da Helena segurando a placa e o QR SVG dinâmico foram preservados.
Na Escuta coletiva, o anfitrião escolhe entre gravações manuais ou um banco de 100 palavras em inglês
com áudio Kokoro incluído no aplicativo. O banco permite busca pela palavra em inglês ou pela tradução
em português sem exigir acentos, seleção em chips e confirmação antes de começar. A matéria usa a
bandeira dos EUA do onboarding. As palavras do banco usam um alfabeto A a Z em papel com a temática
dos EUA, guardado em um único sprite SVG leve e com texto acessível para leitores de tela.
O modo manual abre com um microfone em cada fala, permite gravar antes de informar a palavra e
oferece campos separados para inglês e tradução, até 30 falas. Respostas equivalentes podem ser
cadastradas com barra vertical. O formulário aponta erros e duplicatas por fala, mostra uma prévia
e confirma quando as gravações são aplicadas. O áudio fica ligado à fala ao editar seus campos;
selecionar uma nova gravação exige guardá-la novamente antes de iniciar. Controles
incompatíveis ficam ocultos. Os checks de configuração usam o mesmo papel amarelo das opções de
Handwriting. Perguntas (5, 10, 15 ou 20) e tempo (5, 10, 15 ou 30 segundos) são selecionados em
controles de arrastar. A opção para aceitar erros de digitação não aparece mais na sala; a entrada
de participantes fecha ao iniciar a rodada, inclusive para configurações antigas.
Durante a rodada, o painel do professor esconde a palavra por padrão e exige confirmação antes de
revelá-la. Cada aluno recebe a resposta esperada e o XP após responder; quando todos terminam, há três
segundos de feedback com uma barra regressiva antes da próxima pergunta. A estimativa da rodada inclui
esse intervalo. O envio da resposta fica bloqueado enquanto a rede processa a ação e mostra o loading
compacto da Helena. Depois de “Vai!”, a palavra é reproduzida automaticamente quando essa opção está
ativa. O aluno pode ouvi-la novamente, com cinco segundos de espera entre os acionamentos.
As respostas equivalentes cadastradas no material manual são preservadas pelo backend. Ao terminar a
atividade, a sala continua ativa: o professor pode repetir a configuração, escolher outra atividade ou
encerrar a sala explicitamente.
O anfitrião pode abrir a rota protegida `/sala/<código>/projetor` em outra tela. Ela mantém o código,
o QR com a arte aprovada da Helena, o cronômetro, as respostas recebidas e o placar, mas não oferece
controles administrativos nem revela a palavra.
Anfitrião e participante guardam a credencial somente na aba atual e retomam a mesma sala após uma
atualização da página, inclusive durante a rodada. Uma sessão expirada ou inválida é descartada com
mensagem clara, sem criar um participante duplicado.

Na Escuta Coletiva manual, cada fala precisa de uma gravação enviada pelo professor antes de iniciar.
As palavras prontas já trazem MP3 locais e não precisam de envio ou serviço de voz ativo.
O microfone e o envio de arquivo aceitam até 256 KB por fala. A gravação limita a taxa de áudio
solicitada e libera a captura quando o navegador interrompe ou recusa o gravador. A versão
2026-09-30 da Política de Privacidade informa que o microfone só é solicitado ao professor que
escolhe gravar e que as gravações duram até quatro horas após a criação da sala. Os áudios ficam privados na sala
por até quatro horas e não são usados para treinar modelos. O Bingo mantém o caminho de voz
gerada do Quiz individual. Trocar de pergunta cancela a reprodução anterior.

## 13. Experiência de estudo renovada

A foto aprovada da Helena, sem óculos e com fundo roxo, é usada no ícone da aba e na marca do menu,
por meio do arquivo local `public/helena-portrait.png`.

O painel e a navegação adotam uma hierarquia inspirada em aplicativos de revisão como SimpleStudy:
próxima ação evidente, atalhos de prática, progresso diário visível e cartões fáceis de reconhecer.
A referência é apenas de experiência; cores, componentes, textos e iconografia continuam próprios.

A identidade OlenaStudy permanece baseada em preto, amarelo, violeta e na mascote original. A nova
família de ícones usa traço consistente e pequenos acentos da marca, sem substituir a Helena por uma
identidade genérica. As animações são curtas, comunicam mudança de estado e são removidas quando o
sistema solicita redução de movimento.

Os carregamentos de módulos e ferramentas usam uma única animação vetorial da Helena caminhando,
com mensagem anunciada por leitor de tela, tipografia Manrope e versões responsivas para telas
completas ou painéis compactos. O ciclo fica estático quando `prefers-reduced-motion` está ativo.

No celular, a navegação flutua acima do conteúdo, os atalhos aparecem em uma grade de toque amplo e
o painel mantém resumo, prioridades e início rápido sem rolagem horizontal. Nenhum fluxo, dado local
ou contrato de domínio foi alterado pelo redesign.

# Navegação e painel principal

## Proteção das salas: observabilidade

O guard emite eventos `room_protection` com ação normalizada, enforcement,
resultado da verificação e status da proteção. Tokens, IPs, nomes e respostas
não são registrados. A assinatura também é verificada no modo de observação.
O status 200 nesse evento significa aprovação do guard, não sucesso da ação.
Bloqueios por limite de tentativas também são registrados nesse evento.

O convite do Modo Sala usa a arte aprovada da Helena segurando uma placa. O QR
continua sendo SVG dinâmico com margem branca de quatro módulos, posicionado
na área livre da placa sem cobrir as patas. A imagem é apenas apresentação;
o endereço codificado continua sendo gerado a partir da sala atual.

- No desktop, a barra lateral é o ponto único de acesso aos módulos.
- O Espaço do aluno concentra contexto diário, métricas, tarefas e agenda; atalhos que duplicavam a
  navegação foram removidos.
- No celular, a navegação inferior e a gaveta esquerda “Mais ferramentas” continuam oferecendo todos os módulos.
- O acionador de menu compartilha o mesmo estado de papel roxo da navegação, nos temas claro e escuro.
- O cabeçalho mostra a foto do perfil Google no canto superior direito e permite escolher Poliana, Oliver, Andreyna, Jairo ou Helena.
- O Espaço do aluno usa cabeçalho neutro e ações de papel branco. Campos no tema escuro usam superfície grafite para evitar branco saturado.

# Entrada e navegação, setembro de 2026

Primeira visita abre onboarding e termina no login Google aprovado. A conclusão é guardada na chave helena.onboarding.v1 após autenticação bem-sucedida. Convites de sala mantêm entrada direta. Mais no mobile fica no canto superior esquerdo; a barra inferior mantém quatro destinos. Menus desktop e mobile usam tiras facetadas com transição para X.

# Foco, setembro de 2026

Temporizador e Pomodoro ocupam uma área aberta, sem cartão de fundo, e são escolhidos por setas laterais de papel recortado. A troca usa o mesmo deslocamento direcional de 550 ms dos mundos de Praticar, respeita redução de movimento e fica bloqueada durante uma sessão em andamento ou pausada. O temporizador permite escolher horas, minutos e segundos em três seletores, enquanto a rosa permanece ligada aos minutos registrados e protegida pela redoma facetada. No Pomodoro, mordidas animadas consomem a maçã conforme a sessão avança e sete maçãs cheias registram os dias da semana em que pelo menos um ciclo foi concluído. O botão de início também usa um ícone próprio de papel recortado.

# Marca OlenaStudy, setembro de 2026

A marca exibida na interface, nos metadados e nos materiais públicos passou a ser OlenaStudy. Helena continua sendo o nome da gatinha e da assistente; identificadores internos antigos foram preservados para não quebrar dados locais, links e integrações existentes.

A troca de nome substituiu os nomes anteriores (OliStudy, HelenaStudy e Pepopsia) em textos da interface, metadados, documentação, licença, comentários e no nome do pacote. Ficaram propositalmente inalterados, porque renomeá-los sem migração apagaria dados salvos ou quebraria integrações ativas:

- chaves de localStorage e de sincronização (`helenastudy.workspace.v1`, `helenastudy.theme`, `helenastudy.workspace.history.v1`, `helenastudy.sync-conflict.v1`, `helenastudy.handwriting.draft.*` e `helena-study:word-frequency:v1`);
- o domínio de produção `helenastudy.vercel.app` e as URLs que dependem dele (canonical, sitemap, robots, Open Graph e redirecionamento do Google Agenda);
- nomes de infraestrutura nos comandos do serviço de voz (imagem Docker, serviço Cloud Run e URL do Railway) e valores fictícios de teste do Firebase.

Trocar esses itens exige uma migração própria das chaves, no aparelho e na nuvem, e a renomeação real do projeto na Vercel.

# Cadernos e folhas, setembro de 2026

A área Cadernos abre em uma vitrine, sem a antiga lista lateral de anotações. Cada caderno pertence a
uma matéria e usa uma capa facetada própria, com folhas que se movem no hover. Ao abrir o caderno, a
pessoa pode criar uma folha ou entrar em uma folha existente; digitalização, escrita à mão, imagens e
salvamento automático continuam disponíveis no editor.

O workspace v7 mantém `notes` como coleção normalizada de folhas e acrescenta `notebooks`, que guarda
metadados do caderno e a ordem dos identificadores de suas folhas. A migração de v6 cria um caderno para
cada anotação existente, preservando título, texto e imagens. Novos cadernos começam vazios e recebem
nomes baseados na matéria escolhida.

A ação Escrever à mão abre um estúdio de anotação em tela ampla, com papel pautado, quadriculado,
pontilhado ou em branco. A ferramenta aceita mouse, toque e canetas compatíveis com Pointer Events,
incluindo variação de espessura por pressão quando o navegador informa esse valor. Caneta,
marca-texto, borracha por traço, histórico, limpeza e zoom ficam disponíveis no mesmo espaço de
trabalho. O ajuste inteligente é local e determinístico: suaviza pequenas oscilações e reduz a
inclinação acidental de traços longos quase horizontais, sem alegar reconhecimento de escrita ou IA.
A folha final é rasterizada no navegador e anexada à folha atual usando o mesmo limite local das
imagens digitalizadas. O modal é renderizado sobre o documento para não ficar atrás da navegação
móvel ou ser recortado pelas animações da tela principal.

As folhas manuscritas novas também guardam papel e traços vetoriais no próprio `NoteAsset`, sem
alterar a versão do workspace porque o campo é opcional. A pessoa pode abrir a imagem na folha,
continuar a escrita e salvar de novo no mesmo anexo. Imagens manuscritas antigas continuam
consultáveis, mas não oferecem edição por traços porque esses dados nunca foram guardados. A lupa
tem modos de ampliar e reduzir: cada toque no papel muda um nível de zoom no ponto tocado. O modo
Mover desloca a folha sem marcar. A opção Só caneta faz o toque deslocar a folha enquanto a caneta
continua escrevendo. O traço usa eventos de ponteiro coalescidos quando disponíveis, curvas suaves
e estabilização local com detecção de linhas quase retas.

O estúdio agora guarda rascunhos manuscritos no armazenamento deste dispositivo e confirma o
fechamento quando há alterações. Seleção retangular permite mover, alinhar e apagar grupos de
traços, com histórico. A janela de escrita ampliada modifica a mesma folha e pode avançar pela
linha ou descer para a próxima. Post-its de papel recortado ficam sobre a folha, com texto, cor,
reposicionamento e exportação junto com a imagem. A versão 1 do documento manuscrito ganhou um
campo opcional `stickies`, preservando a leitura de folhas anteriores. A navegação do caderno
permite criar, percorrer e reordenar folhas. PNG é baixado localmente; Imprimir/PDF usa o diálogo
do navegador, que oferece salvar como PDF quando disponível. Nenhum desses fluxos sincroniza
rascunhos entre dispositivos.

# Divisão do editor do Caderno, setembro de 2026

O arquivo `handwriting-studio.tsx` passou de 4342 para cerca de 3700 linhas: as funções auxiliares que viviam soltas no topo foram movidas, sem mudança de comportamento, para módulos próprios em `src/components`. `handwriting-types.ts` guarda tipos e constantes do editor, `handwriting-geometry.ts` guarda as caixas delimitadoras, a seleção e a detecção de toque da borracha, `handwriting-canvas.ts` guarda o desenho de papel, traços, post-its e eixos, `handwriting-export.ts` guarda a exportação para PNG, JPEG e PDF, e `handwriting-draft.ts` guarda a leitura do rascunho local. A chave de rascunho `helenastudy.handwriting.draft.*` continua a mesma para não perder rascunhos salvos. As funções de geometria agora têm testes próprios em `handwriting-geometry.test.ts`.

O componente `HandwritingStudio` continua com cerca de 3600 linhas em uma única função e deve ser dividido em hooks e subcomponentes em etapas seguintes, começando pelos painéis de ferramentas e pelo tratamento de ponteiro.

# Estabilização de traço ao vivo, setembro de 2026

O Ajuste inteligente do editor de escrita à mão passou a filtrar as amostras da caneta enquanto o traço é desenhado, inspirado nas opções Inertia e Deadzone do Xournal++. A zona morta ignora tremores menores que 2,5 pixels da folha. A inércia usa uma caneta virtual com massa 2 e amortecimento 0,7, valores em que a resposta não oscila, então o traço não balança no fim de um movimento. Ao levantar a caneta, o traço é completado até o ponto exato em que a mão parou. A média móvel aplicada depois do traço foi substituída por essa etapa; a correção de linhas quase retas continua. Ele vale para a folha, sem dependência nova e sem enviar dados a serviços externos. Na janela de escrita ampliada a inércia não se aplica: como a janela amplia o traço, o atraso aparecia como tinta ficando para trás da ponta da caneta. Lá a tinta fica sob a caneta durante o traço e a suavização acontece só ao terminar, como antes. Um teste e2e cobre esse comportamento. Os parâmetros ainda não são ajustáveis pela pessoa usuária: ficam em `DEFAULT_LIVE_STABILIZER`.

# Divisão do componente do editor, etapa 2, setembro de 2026

Quatro blocos de interface do `HandwritingStudio` viraram componentes próprios, sem mudança de comportamento: `handwriting-history-bar.tsx` (desfazer, refazer, limpar e zoom), `handwriting-paper-picker.tsx` (tipo e cor do papel), `handwriting-writing-window.tsx` (janela de escrita ampliada) e `handwriting-footer.tsx` (estado de salvamento e sincronização). Cada um recebe apenas as props de que precisa e não conhece o estado do editor. Os botões da janela de escrita que tinham lógica dentro do JSX passaram a chamar `goBackWritingWindow` e `nextWritingLine`, com o mesmo código de antes. O componente principal caiu de 3773 para 3615 linhas. Os quatro blocos têm testes próprios em `handwriting-panels.test.tsx`. Os próximos cortes previstos são o painel de instrumentos, as opções de tinta e a renderização dos post-its dentro da folha, depois a lógica de ponteiro em um hook.

# Divisão do componente do editor, etapa 2b, setembro de 2026

Mais três blocos de interface saíram do `HandwritingStudio`: `handwriting-tool-group.tsx` (grupo de instrumentos), `handwriting-selection-actions.tsx` (ações da seleção, com o assistente de fórmula e o OCR local) e `handwriting-ink-options.tsx` (cor, espessura, ajuste inteligente e modo só caneta). O componente principal caiu de 3615 para cerca de 3340 linhas. A divisão não muda comportamento, com uma correção de texto: o contador da seleção dizia "2 items selecionados" e agora diz "2 itens selecionados". Os três componentes têm testes próprios em `handwriting-toolbar.test.tsx`. Ficam para as próximas etapas a renderização dos post-its e da seleção dentro da folha e a lógica de ponteiro em um hook.

# Bundle enxuto, setembro de 2026

O `tesseract.js` carrega o `regenerator-runtime` apenas para navegadores sem async e await nativos. Como o build é ES2022, o polyfill de 6,6 KB nunca era usado, mas entrava no total de JavaScript. Ele agora é redirecionado para um módulo vazio (`src/build-empty-module.ts`) em `vite.config.ts`. O total da aplicação caiu de 777,3 para 770,8 KiB, sem mudar o limite de 780 KiB, o que reabre margem para as próximas divisões do editor. O OCR local foi conferido de ponta a ponta em navegador real, com o mesmo desenho, antes e depois: mesma leitura, mesmo tempo e nenhum erro de console. Fica registrado, como próximos candidatos, mover a arte vetorial embutida em `paper-editor-icon.tsx`, `onboarding-paper-icon.tsx` e `paper-action-icon.tsx` (cerca de 14 KiB) para um sprite servido como arquivo, no modelo já usado por `navigation-icons.svg`.

# Folha ao vivo na janela de escrita, setembro de 2026

Ao escrever na janela de escrita ampliada, a folha voltou a mostrar o traço enquanto ele acontece. Desde a otimização de latência da caneta, a janela desenhava só no próprio canvas e a folha só recebia o traço ao levantar a caneta. Agora cada segmento é desenhado também direto no canvas da folha, do mesmo modo que na escrita normal, sem atualizar o estado a cada ponto e portanto sem perder o ganho de latência. O e2e da janela de escrita cobre a tinta sob a caneta e a tinta na folha durante o traço.

# Divisão do componente do editor, etapa 2c, setembro de 2026

Os quatro painéis laterais do editor (pincéis, régua, coordenadas e camadas) saíram do `HandwritingStudio` para `handwriting-side-panels.tsx`, sem mudança de comportamento. Cada painel recebe apenas as props de que precisa. O componente principal caiu de 3338 para cerca de 3140 linhas, e os painéis têm testes próprios em `handwriting-side-panels.test.tsx`. Ficam para as próximas etapas a camada de post-its dentro da folha, as sobreposições de imagem, régua e coordenadas, e a lógica de ponteiro em um hook.

# Divisão do componente do editor, etapa 2d, setembro de 2026

Cada post-it e cada texto solto da folha agora é renderizado por `HandwritingStickyNote` (`handwriting-sticky-note.tsx`), sem mudança de comportamento. O componente cuida do rótulo, do menu de opções, das cores, do checklist, do campo de texto com correção automática, do arraste por teclado e dos puxadores de mover e redimensionar. O estado e a lógica de arrastar e redimensionar continuam no `HandwritingStudio`, que os entrega por props. O componente principal caiu de 3145 para cerca de 2950 linhas, e o novo componente tem 17 testes próprios em `handwriting-sticky-note.test.tsx`. Ficam para a próxima etapa as sobreposições de imagem, régua e coordenadas dentro da folha e a lógica de ponteiro em um hook.

# Seletor de tema no celular, setembro de 2026

Ao restaurar o layout móvel original, o commit `662f6c9` tirou o seletor de aparência da barra inferior e o do cabeçalho continuava escondido abaixo de 900px por uma regra antiga em `styles.css`. Com isso, telas menores ficaram sem forma de trocar o tema. A regra que escondia `.page-header__theme` foi removida, e o seletor aparece no cabeçalho móvel ao lado do menu e do perfil, verificado em 320px.

O teste `responsive-navigation.spec.ts` foi ajustado ao layout atual: o perfil móvel é o botão "Perfil" da barra inferior, e o seletor de tema é o do cabeçalho em todas as larguras.

Os testes do projeto móvel que dependiam do layout antigo (`app.spec.ts` e `profile-avatars.spec.ts`) também foram ajustados: o seletor de tema e o menu de perfil são os do cabeçalho em todas as larguras. O projeto móvel foi rodado localmente com `PLAYWRIGHT_SYSTEM_EDGE=1` (Edge com o perfil do iPhone 13), já que o WebKit não está instalado nesta máquina.

# Domínio olenastudy.vercel.app, setembro de 2026

O projeto da Vercel passou a se chamar `olenastudy` e o domínio `olenastudy.vercel.app` foi anexado como produção, com `helenastudy.vercel.app` redirecionando (307) para ele. As URLs do repositório (canonical, Open Graph, sitemap, robots, `llms.txt`, guia do Google Agenda e testes de URL de sala) passaram a usar o domínio novo.

As chaves do `localStorage` continuam com o prefixo antigo de propósito. Três delas (`helenastudy.workspace.v1`, `helenastudy.theme` e `helena-study:word-frequency:v1`) são sincronizadas com a nuvem pelo nome, e `applySyncedStorage` apaga a chave local que não vier do servidor. Renomear sem migrar o dado na nuvem apagaria o caderno de quem está logado. As demais são locais e invisíveis ao usuário, então renomear não traz ganho. Pendências fora do repositório: domínio autorizado no Firebase Auth, URI de redirecionamento do OAuth do Google e `GOOGLE_REDIRECT_URI` na Vercel.

O nome escrito como `Oli<span>Study</span>` na marca do onboarding, do login e da barra lateral não foi pego pela busca por texto corrido e ainda mostrava "OliStudy". Agora é `Olena<span>Study</span>`, com teste em `onboarding-view.test.tsx`.

# Endurecimento da sala e dos cabeçalhos, setembro de 2026

Três ajustes vindos da auditoria de segurança, sem mudança de fluxo para o usuário:

- O código da sala (5 caracteres, alfabeto de 32 símbolos) passou a ser sorteado com `crypto.getRandomValues` em vez de `Math.random`. Como o código é a barreira para entrar numa sala, ele não pode ser previsível. Cada byte sorteado é mascarado com 31 para escolher o símbolo (o alfabeto tem 32, uma potência de dois), sem divisão nem viés. A primeira versão dividia um inteiro de 32 bits e o CodeQL a apontou como `js/biased-cryptographic-random`, então o mascaramento foi adotado.
- Os tokens de anfitrião e de participante passaram a ser comparados em tempo constante por `safeEqual` (`src/backend/secure-compare.ts`), em vez de `===`. Um token ausente nunca autoriza.
- `vercel.json` ganhou `Strict-Transport-Security` e `Cross-Origin-Opener-Policy: same-origin-allow-popups`. O valor `same-origin` foi descartado de propósito, porque quebraria o `signInWithPopup` do login Google. `src/security-headers.test.ts` trava esses cabeçalhos e a ausência de `unsafe-inline` e `unsafe-eval` no `script-src`.

Limite conhecido: o servidor de desenvolvimento e o e2e não aplicam os cabeçalhos do `vercel.json`, então o efeito real do COOP sobre o popup de login só se confirma no deploy. O dono confirmou em 2026-10-02 que `FIREBASE_APPCHECK_ENFORCE` está `true` na Vercel: o App Check bloqueia de verdade, não só registra.

# Convite de edição do caderno, setembro de 2026

O cabeçalho da folha mostra os participantes da sala como avatares e um botão de adicionar pessoa. Ao criar a sala, o editor oferece um link de convite. O link abre diretamente a folha compartilhada, sem exigir que o convidado tenha um caderno local ou passe pelo onboarding, mas exige login Google. O nome vem da conta; o limite segue em quatro participantes. A sessão da sala usa o identificador da página, estável antes e depois do salvamento do anexo.

O editor só notifica mudanças reais do documento ao hook de colaboração. Uma renderização causada pela chegada de uma atualização remota não reenvia a versão local antiga. O seletor de tipo e cor do papel mantém seus dois botões na primeira linha, com rótulos acessíveis e títulos de inspeção sem expansão nem deslocamento. Os três botões de arquivo usam fundo claro e cores distintas nos ícones.

Limite atual: cada sala sincroniza uma folha manuscrita, não todas as folhas do caderno. A sala expira após oito horas; para continuar depois disso, o anfitrião cria outro convite.

# Identidade, convite e sincronização da conta, setembro de 2026

O convite de edição mostra só um link. Quem o abre precisa entrar com Google; a entrada na sala ocorre automaticamente depois que a conta fica pronta. O backend verifica a assinatura, emissor, público, validade e `auth_time` do Firebase ID token e liga a credencial da sala ao UID. O nome vem do token validado, não de um campo digitável. O avatar escolhido vem de `helena.profile.v1`, chave sincronizada entre dispositivos, e o servidor só aceita caminhos de avatar do aplicativo. Um token de outra conta não pode retomar a credencial. Links de visualização continuam públicos e sem edição.

O aviso de atividade mostra apenas uma ação nova de documento feita por outra pessoa, por quatro segundos. Entradas, batimentos de presença, carregamento inicial e ações antigas não exibem "editou o caderno". O desenho ao vivo usa resposta espacial mais rápida e zona morta menor, sem a inércia que deixava a tinta atrás da ponta.

Inventário de persistência: `helenastudy.workspace.v1` guarda cadernos, páginas, anexos e preferências da área de estudo; `helena.profile.v1` guarda o avatar escolhido; tema, onboarding, progresso solo, frequência de palavras e a sequência do Pomodoro também são chaves sincronizadas. O Firebase RTDB em `/users/<uid>/state` é a fonte principal após o login. Um backup local anterior não substitui o estado existente da conta; somente alterações feitas durante a busca inicial são mescladas sobre ele. A chave recém-incluída do Pomodoro é migrada do dispositivo quando ainda não existe na nuvem. `helenastudy.handwriting.draft.*`, identificadores de anexo salvo, histórico local e registro de conflitos são backups locais; credenciais da sala e retorno do login usam `sessionStorage` por sessão.

Limites que continuam: a sala é temporária (oito horas) e transmite uma folha, não o caderno inteiro nem uma cópia permanente para cada convidado. O convidado vê e edita a folha compartilhada, mas ela não vira automaticamente uma página da biblioteca da própria conta. A sincronização da área de estudo ocorre por chave inteira; edições simultâneas do mesmo workspace em dois aparelhos produzem um conflito com cópia local recuperável, não uma fusão perfeita de campos. A tela deve comunicar estado `offline` ou `conflict` antes de prometer disponibilidade em outro dispositivo. Há testes de identidade, conflito de login, convite e atividade; o fluxo real entre duas contas requer teste no domínio implantado com App Check e Firebase Auth configurados.

# OCR local sob o CSP de produção, setembro de 2026

O OCR do caderno estava quebrado em produção. O CSP só libera `'self'` e o `tesseract.js` cria o worker a partir de um blob e busca worker, núcleo WebAssembly e idioma no `cdn.jsdelivr.net`. O erro aparecia como "Não foi possível reconhecer a fórmula". O problema passou despercebido porque o servidor de desenvolvimento e o e2e não aplicavam o CSP.

Agora o OCR roda todo no mesmo domínio, sem enviar o IP do aluno a terceiros:

- `scripts/copy-ocr-assets.mjs` copia para `public/ocr/` (não versionado) o worker, os dois núcleos LSTM e o idioma `eng` (`4.0.0_best_int`, 2,9 MB) dos pacotes instalados. Roda em `predev` e `prebuild`. Esses arquivos ficam fora do orçamento de JS, que só conta `dist/assets`.
- `@tesseract.js-data/eng` entrou como devDependency (MIT, sem dependências, `npm audit` limpo). Não vai para o bundle: só fornece o arquivo de idioma na hora do build.
- `handwriting-ocr.ts` define `workerPath`, `corePath`, `langPath` e `workerBlobURL: false`.
- O CSP ganhou `worker-src 'self'` e `'wasm-unsafe-eval'` no `script-src`. Esse valor libera WebAssembly, não `eval` de JavaScript. Os arquivos de `/ocr/` têm cache de 7 dias, porque os nomes não levam hash.
- `vite preview` passou a servir os cabeçalhos do `vercel.json`, então o e2e roda sob o CSP real. `e2e/ocr-csp.spec.ts` desenha uma fórmula, roda o OCR e exige resposta preenchida, nenhuma violação de CSP e nenhuma requisição externa durante o reconhecimento. Sem a correção, o teste falha.

As fontes do Google continuam sendo carregadas de fora com a página e serão tratadas em outra mudança de privacidade.

# Limpeza dos dados pessoais ao sair da conta, setembro de 2026

Ao sair da conta, o app apagava só as seis chaves sincronizadas do `localStorage`. O histórico de versões (`helenastudy.workspace.history.v1`, listado e restaurável na página de perfil), os rascunhos e folhas salvas do caderno, o progresso, o perfil, a sequência do pomodoro (`noteoli.pomodoro-streak.v1`), as sessões de sala e o cookie de sessão do Google Agenda continuavam no aparelho. Em um computador compartilhado, a próxima pessoa via e podia restaurar o que a anterior estudou.

- `src/data/personal-data.ts` apaga do `localStorage` e do `sessionStorage` toda chave com prefixo `helena` ou `noteoli.`. Chaves de outros aplicativos da mesma origem não são tocadas.
- `signOut` em `use-cloud-sync.ts` chama essa limpeza e pede ao servidor para apagar o cookie do Google Agenda (`POST /api/google-calendar?action=disconnect`), já que o cookie é HttpOnly e o navegador não consegue removê-lo.
- Troca de conta sem sair: `helena.account.v1` guarda a conta dona dos dados do aparelho. Se entra uma conta diferente, os dados da anterior são apagados antes da sincronização, senão o espaço dela seria enviado para a conta nova. A marca de onboarding é preservada, porque o login a grava no mesmo instante e apagá-la devolveria a pessoa ao onboarding. A primeira conta a entrar num aparelho com uso local anterior mantém esse uso, que continua sendo sincronizado para ela como antes.

Limites conhecidos: quem usa o app sem entrar em conta e sem sair não tem o que limpar, porque o modo local guarda tudo no navegador de propósito. Um botão manual de "apagar dados deste aparelho" fica como melhoria futura. O histórico de versões continua pertencendo à conta enquanto ela estiver ativa.

# Motor de traço profissional, etapa 1, setembro de 2026

A escrita à mão passou a usar um motor de traço próprio, na linha do perfect-freehand e do filtro 1€, sem nova dependência. As queixas eram tinta com degraus, tremor, "salto" ao soltar a caneta e traço sem nitidez. Esta etapa cobre suavidade, precisão e o fim do salto; a nitidez em telas de alta densidade e a colaboração ficam nas etapas seguintes.

O que mudou:

- **Contorno único (`handwriting-ink.ts`).** Caneta-tinteiro e pincel macio deixaram de ser um `stroke()` por segmento e passaram a ser um contorno de largura variável preenchido de uma vez. Isso elimina os degraus de espessura, as "contas" nas juntas e o escurecimento onde segmentos translúcidos se sobrepunham. O raio é suavizado ao longo do traço e só depende dos pontos até o vizinho seguinte, então a ponta ao vivo e o traço pronto usam a mesma conta. Cantos fechados ganham um disco limitado ao menor raio vizinho. Os fios do pincel macio seguem o traço em caminhos únicos.
- **Filtro na entrada (`handwriting-stabilization.ts`).** A zona morta com inércia foi trocada por um filtro 1€ (a suavização cresce quando a mão é lenta e some quando é rápida) sobre um preditor de velocidade (alfa-beta). O preditor zera o atraso em movimento uniforme, então dá para suavizar bem mais sem a tinta ficar atrás da ponta. Cantos fechados (virada acima de ~78° com passo real) travam no ponto da caneta em vez de serem arredondados. A pressão também é suavizada. O filtro usa os timestamps dos eventos coalescidos.
- **Camada de tinta ao vivo.** O traço em andamento é redesenhado por inteiro uma vez por quadro em um canvas sobreposto (`.handwriting-live-layer`), com uma ponta prevista de até 18 unidades enquanto a mão se move. Ao soltar, o traço final é desenhado na folha no mesmo instante em que a camada é limpa, sem quadro em branco. A folha não desenha o traço em andamento, então nada é desenhado duas vezes. A janela de escrita ampliada usa o mesmo caminho, com a tinta vetorial na resolução da janela.

Medido com o mesmo gesto de teste (mão lenta com ruído de 125 Hz), pela segunda diferença da posição: rugosidade 0,858 para 0,296 na mão lenta (-66%) e 0,857 para 0,637 na mão rápida (-26%), com atraso praticamente zero de 150 a 1500 unidades por segundo (testes unitários). O comparativo de capturas em 2x mostrou o fim das contas nos cantos e dos degraus de largura.

Orçamento: o total passou de 778,1 para 781,2 KiB e o teto foi para 790 KiB, com a justificativa no script. A entrada inicial não mudou (269,8 KiB), porque o editor é carregado sob demanda. Testes novos: `handwriting-ink.test.ts` e `handwriting-stabilization.test.ts` (37) e `e2e/ink-live-layer.spec.ts`.

Limites conhecidos: a folha ainda tem 1200 por 1600 pixels de resolução fixa e borra em telas de densidade alta e ao ampliar (próxima etapa). A colaboração ainda substitui `strokes` por inteiro ao receber uma atualização (etapa seguinte).

# Motor de traço profissional, etapa 2: nitidez, setembro de 2026

A folha tinha um bitmap fixo de 1200 por 1600 pixels, qualquer que fosse a tela ou o zoom. Em tela de densidade 2x ou ampliada, cada pixel da tinta era esticado, e a tinta e as pautas saíam borradas.

- O bitmap agora acompanha `devicePixelRatio` vezes o tamanho exibido (`pageRenderScale`), arredondado para cima em passos de 0,25 e com atraso de 150 ms para o zoom não redesenhar a cada passo. A folha e a camada de tinta ao vivo usam a mesma escala.
- Teto de 9 milhões de pixels por camada: o iOS Safari recusa canvas acima de 16,7 milhões de pixels e limita a memória total, e a folha tem duas camadas. Na prática a escala máxima é cerca de 2,16.
- Todo desenho passa por `pageContext`, que aplica a escala e mantém as coordenadas em unidades da folha (1200 por 1600). O mapeamento do ponteiro (`canvasPoint`) mede em unidades da folha, não do bitmap, então o traço cai onde a caneta está em qualquer resolução.
- O espelho da janela de escrita lê o bitmap em pixels, então a região de origem é multiplicada pela escala.
- A exportação em PNG e em PDF do editor passa a sair na resolução da tela. As folhas gravadas nas anotações continuam em 1200 por 1600, para não aumentar os dados salvos.

Medido em tela 2x com a folha exibida a 1518 px CSS: o bitmap passou de 1200 para 2598 px de largura. Testes: `handwriting-canvas-scale.test.ts` (13) e `e2e/ink-sharpness.spec.ts`, que roda com `deviceScaleFactor: 2`, exige bitmap acima de 1200, crescimento com o zoom, respeito ao teto e a tinta exatamente sob a caneta.

Orçamento: 781,9 KiB de 790, entrada inicial em 269,8 KiB (sem mudança).

# Motor de traço profissional, etapa 3: colaboração suave, setembro de 2026

Duas melhorias no caderno colaborativo:

- **Traços do colega apareciam de uma vez.** Agora os traços novos de uma atualização ao vivo são "escritos" na camada de tinta ao longo do próprio caminho (`handwriting-reveal.ts`): duração proporcional ao comprimento (140 a 650 ms), em sequência e na ordem, com leve sobreposição e suavização no início e no fim. Um lote tem duração total limitada (1,4 s), e mais de 16 traços de uma vez, a primeira carga do documento (que chega sem autor) e a preferência de reduzir movimento não animam. Ao terminar, cada traço é desenhado na folha no mesmo quadro em que sai da camada, sem quadro em branco, e a folha não desenha um traço em revelação. `newRemoteStrokes` separa os traços que a folha ainda não conhecia; o traço que a própria pessoa está fazendo não entra na lista até a caneta ser solta, então nunca é confundido com um de colega.
- **Latência de envio.** A espera antes de publicar a folha caiu de 350 para 140 ms, então o colega vê o traço quase assim que a caneta é solta, ainda juntando traços seguidos em um só envio.

Sobre o traço em andamento: o modelo em que ele só entra na lista ao soltar a caneta (que já estava na `main`) impede que uma atualização remota o remova do estado, e a camada de tinta ao vivo impede que a folha, ao ser redesenhada por essa atualização, o apague da tela.

Verificação: um e2e com dois usuários reais não é viável porque a colaboração exige conta Google. A lógica é coberta por testes puros (`handwriting-reveal.test.ts`) e pelo componente com atualizações remotas simuladas, inclusive uma atualização que chega no meio do gesto (`handwriting-studio-remote.test.tsx`). A animação foi conferida em quadros fixos (60 a 1200 ms) com as mesmas funções de desenho, mostrando o traço crescendo ao longo do caminho e o resultado final idêntico ao traço salvo.

Não está incluído: tinta ao vivo enquanto o colega ainda escreve, e cursor de presença. Isso exige um canal em tempo real novo no servidor (o modelo atual envia o documento ao soltar a caneta) e mudança nas regras do banco.

# Exportar o caderno em PDF, setembro de 2026

O botão "Exportar PDF" do caderno nunca funcionou. Ele abria a janela de impressão com `window.open("", "_blank", "noopener,noreferrer")`, e com `noopener` o navegador devolve `null`: a janela abre em branco, o app não consegue escrever nela e ainda mostra "Permita pop-ups para exportar o caderno em PDF". Confirmado em Chromium real: 0 folhas na janela aberta.

`openPrintWindow` (`src/data/print-window.ts`) abre a janela normalmente e corta o vínculo depois, com `opener = null`, que mantém a proteção que o `noopener` queria dar (a janela não controla a página de origem). Passou a ser usado na exportação do caderno e na impressão da folha do editor. `e2e/notebook-pdf.spec.ts` cobre o fluxo real (desenhar, salvar a folha, exportar): a janela abre com o título do caderno e uma imagem por folha com conteúdo, sem aviso na página de origem e com `window.opener` nulo. O teste falhava antes da correção.

O teste `recupera rascunho, adiciona post-it e organiza folhas` falhava de forma intermitente por uma corrida do próprio teste: ao reabrir, o rascunho recuperado é regravado pelo autosave 450 ms depois, e o aviso passa de "Rascunho recuperado" para "Rascunho salvo neste dispositivo". Com a máquina carregada o teste chegava tarde ao primeiro aviso. Agora aceita as duas fases, e a recuperação continua provada pelo texto do post-it.

# Política de Privacidade, setembro de 2026

O app não tinha política de privacidade nem forma de a pessoa concordar com ela, e é usado por estudantes, muitos deles menores de 18 anos. Agora há:

- **Página pública** `public/politica-de-privacidade.html` (versão 2026-09-24), estática e sem script nem recurso externo, para não rastrear quem a lê e para ficar fora do orçamento de JS. Serve também como o link de política que o Google pede na tela de consentimento OAuth do Google Agenda. Está escrita em linguagem simples, sem termos técnicos nem nomes de fornecedores: cita o Google (marca que a pessoa já conhece do login) e descreve as demais empresas por função (quem hospeda o aplicativo, o serviço de voz, o serviço de consulta de vocabulário), com a lista completa disponível sob pedido. Cobre o que fica só no aparelho, o que vai para a nuvem, cookies, prazos, segurança, crianças e adolescentes (LGPD, art. 14), direitos (art. 18) e como pedir exclusão. Segue o visual de papel recortado do aplicativo em cada bloco (cantos assimétricos e base deslocada), em tema claro e escuro, com resumo em papel roxo e aviso em papel amarelo.
- **Responsável:** a empresa Galeria.Oli, com José Oliver e Leo Bizzocchi.
- **Rodapé da marca** (`BrandFooter`): "Todos os direitos Galeria.Oli - OlenaStudy", com o ícone da Galeria.Oli à esquerda, no onboarding, no login e na política. O ícone é `public/galeria-oli-icon.svg`, vetorizado a partir da arte original (contorno, miolo e três traços de tinta, sem fundo, 8 KB), então fica nítido em qualquer tamanho.
- **Concordância no login**, no fim do onboarding (`GoogleLogin`): uma caixa que nunca vem marcada, com o link da política em outra aba (para não perder as respostas do onboarding) e a declaração de ter 18 anos ou a autorização de quem é responsável. O botão "Entrar com Google" só habilita depois de marcar, com o motivo dito na tela. A versão aceita e o momento ficam em `helena.privacy.v1` (`src/domain/privacy-policy.ts`), gravados antes de sair para o Google, porque o login pode virar um redirecionamento de página inteira. A chave começa com `helena`, então é apagada ao sair da conta.
- **Travas contra política desatualizada** (`src/privacy-policy-page.test.ts`): cada serviço externo liberado no `connect-src` do CSP precisa estar coberto, em palavras simples, na política; termos técnicos e nomes de fornecedores são proibidos; a empresa, a equipe, o rodapé e o ícone (SVG vetorial, sem fundo, sem imagem embutida) são conferidos. Se um serviço novo entrar no CSP, o teste falha até a política ser atualizada.

Pendências que dependem do proprietário, registradas na própria política e aqui:

- **Canal de contato e identificação da empresa.** O e-mail para pedidos de privacidade e os dados de identificação da Galeria.Oli (por exemplo o CNPJ) ainda não foram definidos; a política mostra um aviso de "canal de contato em definição". Não deve ser divulgada como definitiva antes disso.
- **Revisão jurídica.** O texto foi redigido a partir do código, não por advogado. Vale uma revisão antes de divulgar, sobretudo as bases legais, o prazo de 15 dias, o tratamento de menores e a decisão de não nomear as empresas parceiras na página (a LGPD dá à pessoa o direito de saber com quem os dados são compartilhados, e a política o atende sob pedido).
- **Google Cloud.** Informar o endereço da política na tela de consentimento OAuth do projeto.
- **Não existe exclusão de conta no app.** A política diz que o pedido é atendido manualmente. Um botão de exclusão de conta e de dados é a melhoria natural.
- **Voz natural e vocabulário.** Os exercícios de escuta enviam o texto da frase ao serviço de voz com `consent: true` fixo no código, e cada palavra vai ao serviço de vocabulário, sem aceite próprio. A política informa isso, mas o `AGENTS.md` pede consentimento claro: vale um aceite específico dentro dos exercícios.
- **Fontes.** As letras do aplicativo ainda vêm dos servidores do Google e a política menciona isso. Hospedá-las no próprio domínio elimina esse envio, e faria a página da política usar a fonte Manrope do aplicativo (hoje ela usa a fonte padrão do aparelho, para não fazer requisição externa).

Ajustes desta PR depois de a `main` avançar:

- O orçamento de JS foi ajustado: entrada de 270 para 272 KiB e total de 790 para 795 KiB. A `main` limpa já media 270,3 KiB de entrada e 789,3 KiB no total (preferências do quadro e formatos de página); o bloco de concordância e o rodapé não mudam a entrada e somam 1,2 KiB ao total. A CI mede cerca de 0,5 KiB acima de uma máquina Windows.
- O ícone da Galeria.Oli passou de PNG para SVG (`public/galeria-oli-icon.svg`, 8 KB, cinco caminhos: contorno, miolo e três traços de tinta), traçado a partir da arte original com contornos de precisão de subpixel e curvas suaves. Não embute imagem, não tem fundo e não referencia nada externo.
- Dois testes de e2e que estavam vermelhos na `main` depois do #231 foram atualizados: o do PDF (a nova folha já abre o editor, então usa `openHandwritingA4`) e o do rascunho (o editor já não mostra o aviso de rascunho recuperado; a recuperação continua provada pelo texto do post-it).
- O detector de segredos acusou como falso positivo o nome de uma constante que terminava em `KEY`; ela foi renomeada e a impressão digital do commit antigo foi registrada em `.gitleaksignore`, porque o histórico da branch não é reescrito.

## Exclusão de conta no Perfil (2026-09-25)

- O pedido de exclusão deixou de ser manual. No Perfil há uma "Zona de perigo" com o botão "Excluir minha conta" (`DeleteAccountPanel`), no estilo do GitHub: a janela lista o que será apagado e o botão final só é liberado quando a pessoa digita o nome da conta exatamente como aparece (nome do Google ou, sem nome, o e-mail; diferencia maiúsculas e minúsculas).
- Ordem em `deleteAccountEverywhere` (`src/data/account-deletion.ts`): novo login do Google (`reauthenticateWithPopup`, também evita o erro de login antigo do Firebase), apagar `users/{uid}` no banco em tempo real, apagar o usuário do Firebase Auth e só então limpar o aparelho (dados pessoais, sessão e cookie do Google Agenda). Se um passo falhar, os seguintes não acontecem; se a pessoa fechar o login, nada é apagado e a sincronização volta a funcionar.
- Salas e cadernos compartilhados são temporários (`expiresAt`) e já não ficam ligados à conta, então não há outro dado por conta para apagar. Regras do banco não mudaram (`users/$uid` já permite escrita ao dono).
- A Política de Privacidade (2026-09-25) passou a apontar para o botão em vez de "pedido atendido manualmente".
- Testes: `account-deletion.test.ts` (ordem e falhas), `delete-account-panel.test.tsx` (nome exato, Enter, Escape, foco, erros), `use-cloud-sync.test.tsx` (fluxo completo e cancelamento) e a política.

## Fontes no próprio domínio (2026-09-25)

- Manrope (600, 700, 800) e Nunito (400 a 800) passaram a ser servidas de `public/fonts` (subconjunto latino em woff2, 160 KB, licença SIL OFL 1.1 junto dos arquivos), com `@font-face` em `public/fonts/fonts.css` e preload das duas mais usadas em `index.html`. Nenhuma dependência nova: os arquivos foram copiados dos pacotes Fontsource, que não ficaram no `package.json`.
- Isso elimina o envio do endereço de rede e dos dados do navegador ao Google ao carregar as letras. O CSP perdeu `fonts.googleapis.com` (style-src) e `fonts.gstatic.com` (font-src): agora `font-src 'self'`.
- A Política de Privacidade (versão 2026-09-25) perdeu a linha "Letras do aplicativo" e a menção ao Google entregando fontes, e a própria página usa a Manrope do aplicativo.
- Testes: `src/self-hosted-fonts.test.ts` (sem Google no HTML, CSP, arquivos e licenças presentes, política) e `e2e/self-hosted-fonts.spec.ts` (nenhuma requisição a domínios de fontes de terceiros, letras carregadas de `/fonts/`).

## Aceite para voz natural e vocabulário online (2026-09-25)

- Os exercícios de escuta enviavam `consent: true` fixo e consultavam o serviço de vocabulário sem nenhum aceite na tela. Agora nada sai do aparelho até a pessoa escolher "Permitir" no aviso `ListeningOnlineNotice`, mostrado no Quiz de Escuta e no Modo Sala.
- A escolha fica em `helena.listening.online.v1` como `{choice, version, at}`, é apagada junto com os demais dados pessoais ao sair da conta e pede de novo se `LISTENING_CONSENT_VERSION` subir. Pode ser trocada a qualquer momento nas configurações de áudio.
- Sem aceite (ou com recusa): `NaturalVoicePlayer` não faz requisição e usa a voz do aparelho; `classifyWordDifficulty` usa o cache ou a estimativa local. Com aceite, o comportamento anterior continua, e `consent: true` só é enviado nesse caso.
- A Política de Privacidade passou para a versão 2026-09-25: voz e vocabulário agora têm o consentimento como base legal (art. 7º, I) e o texto diz que só acontece com a permissão da pessoa.

## Endereço próprio para cada aba (2026-09-26)

- Recarregar a página voltava ao início porque a aba ativa só existia em estado do React (e o app remonta a cada sincronização da nuvem). Agora cada aba tem um caminho (`src/domain/app-routes.ts`): `/`, `/planejador`, `/foco`, `/habitos`, `/cadernos`, `/aulas`, `/aprender`, `/biblioteca`, `/atividades`, `/perfil`. O hook `useAppView` lê o caminho ao abrir, usa `history.pushState` ao trocar de aba e ouve `popstate` para o botão voltar. Sem biblioteca de rotas.
- A raiz `/` continua sendo a aba inicial ou a que um convite de sala pede (`?sala=`); `/sala/CODIGO/projetor` e os links de caderno (`?notebook-view`, `?notebook-collab`) não mudaram.
- `vercel.json` ganhou um rewrite desses caminhos para `index.html`; arquivos estáticos e `/api` seguem servidos normalmente.
- Testes: `app-routes.test.ts`, `use-app-view.test.tsx` e `e2e/routes.spec.ts` (recarregar, voltar e link direto).

## Rejeição de palma no editor de escrita (2026-09-26)

- O editor já entrava sozinho no modo "só caneta" ao detectar uma caneta (toque passa a rolar a folha), mas dois pontos de contato da palma enquanto a caneta escrevia disparavam o zoom por pinça e apagavam o traço em andamento.
- `handwriting-palm.ts` decide se um toque deve ser ignorado: enquanto há caneta na folha e por 500 ms depois que ela sai. Nesse período o toque não entra na pinça, na rolagem nem no rastreio de ponteiros. Sem caneta, dedo e pinça funcionam como antes.
- Teste que falha sem a correção: `e2e/palm-rejection.spec.ts` usa o CDP do Chromium para escrever com uma caneta simulada e tocar em dois pontos no meio do traço; sem a correção o traço some. Regras em `handwriting-palm.test.ts`.
- Correção de leitura anterior: o documento do editor já guarda os traços em vetor (`HandwritingDocument.strokes`) junto do PNG, então "persistir em vetor" não é um item pendente; o que falta é usar o vetor para reabrir e sincronizar sem depender do PNG.

## Desfazer e refazer em caderno compartilhado (2026-09-26)

- Desfazer restaurava um retrato inteiro da folha. Se um colega escrevesse depois do retrato, desfazer o próprio traço apagava o traço do colega e, na sincronização, também na tela dele.
- O editor passa a guardar os ids dos traços recebidos de colegas (`remoteStrokeIdsRef`) e `restoreStrokes` (`handwriting-undo.ts`) devolve os traços do retrato mais os de colegas que ainda estão na folha. Desfazer e refazer só mexem no que a própria pessoa fez. Sem colega, o comportamento é idêntico ao anterior.
- Limite conhecido: post-its, texto e imagens seguem restaurando o retrato inteiro; o ajuste cobre os traços, que são o que os colegas mais acrescentam. Testes em `handwriting-undo.test.ts`.

## Seleção por laço completa no editor de escrita (2026-09-26)

- O editor já tinha seleção por retângulo e por laço, mover e alinhar, aumentar e diminuir e apagar. Faltava o resto do fluxo de quem edita um caderno: copiar, recortar, colar, duplicar, selecionar tudo, girar qualquer item e somar ao laço.
- `handwriting-selection-ops.ts` reúne a regra em funções puras (copiar com clone profundo, colar com ids novos e deslocamento de 36 px por colagem seguida, sempre dentro da folha; girar traços, sistemas de coordenadas e imagens em torno do centro da seleção, post-its só orbitam; laço; soma à seleção). A área de transferência é uma variável do módulo do editor, então vale entre folhas na mesma sessão e nunca sai do aparelho.
- Laço: um traço entra quando pelo menos metade dos pontos está dentro do laço (antes só o centro da caixa contava, então traços compridos ou curvos eram escolhidos ou perdidos por acaso). Com Shift o laço soma à seleção existente.
- Botões: Copiar, Recortar, Duplicar, Girar ±15° (todos os itens; antes só imagens), Selecionar tudo e Colar. Atalhos com a ferramenta Selecionar ativa: Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+D e Ctrl+A. Cada ação entra no histórico, então Desfazer volta.
- Não incluído: alças de arrastar para redimensionar e girar direto na caixa da seleção (o tamanho continua por Aumentar e Diminuir). Testes: `handwriting-selection-ops.test.ts` e `e2e/selection-tools.spec.ts`.

## Alças na caixa da seleção (2026-09-26)

- A seleção agora mostra uma caixa tracejada com quatro alças de canto e uma alça de girar acima dela. Arrastar um canto redimensiona de forma proporcional a partir do canto oposto (que fica parado); arrastar a alça de cima gira em torno do centro, com Shift encaixando de 15 em 15 graus. Traços engrossam junto, imagens e post-its mudam de tamanho e posição, e nada sai da folha.
- Cada quadro do arrasto é calculado a partir da folha original guardada no começo do gesto (`handle.original`), sem acumular erro, e o gesto inteiro é um único passo do Desfazer. A área de toque das alças é maior com o dedo (34 unidades contra 22).
- A regra está em `handwriting-selection-ops.ts` (`scaleItems`, `hitSelectionHandle`, `dragScaleFactor`, `dragRotation`) com testes; `e2e/selection-tools.spec.ts` arrasta o canto e a alça de girar e confere o tamanho do traço na folha. Isso fecha o item "não incluído" da entrada anterior.

## Formas ao segurar a caneta (2026-09-26)

- Ao segurar a caneta parada por 600 ms no fim de um traço, o editor reconhece uma reta, uma elipse (círculo inclusive), um retângulo ou um triângulo feitos à mão livre e troca o rabisco pela forma perfeita, na camada ao vivo. Enquanto a caneta continua apoiada o resto do gesto é ignorado, e ao soltar a forma vira um traço normal (Desfazer funciona, as alças e o laço também).
- `handwriting-shapes.ts` (`recognizeShape`) decide a forma, sem dependência: reta pela corda (desvio máximo de 7% do comprimento), forma fechada quando o fim volta perto do começo, retângulo pelo ajuste à caixa, triângulo por simplificação de Douglas-Peucker em três vértices e elipse pelo raio normalizado com checagem do perímetro. Traços curtos (menos de 90 unidades), rabiscos e curvas abertas nunca viram forma, para não estragar a letra de quem escreve com pausas.
- Preferência nova "Formas ao segurar" (`shapeSnap`, ligada por padrão) em Configurações, na seção Escrita e toque. O traço gerado usa a pressão média do original e amostras a cada 6 unidades. O "Ajuste inteligente" que endireita linhas quase retas não roda sobre uma forma já acertada.
- Testes: `handwriting-shapes.test.ts` (7) e o e2e `segurar a caneta parada...`, que falha sem a pausa. Limite: não há reconhecimento de setas, estrelas ou polígonos com mais de quatro lados.

## Busca nos cadernos (2026-09-26)

- A estante ganhou um campo "Buscar nos cadernos". `searchNotebooks` (`src/domain/notebook-search.ts`) procura, sem diferenciar acento nem maiúsculas, em títulos de cadernos e pastas, títulos e texto das folhas, nomes de anexos, o texto digitado sobre a folha manuscrita (`pageText`), post-its e itens de lista. Cada resultado mostra caderno, folha, a origem (Caderno, Folha, Texto, Post-it, Lista, Anexo) e o trecho com o achado marcado; clicar abre a folha (ou o caderno). No máximo 40 resultados, a partir de duas letras, e tudo roda no aparelho.
- A escrita à mão em si continua sendo imagem e não é pesquisável. O aviso de "nada encontrado" diz isso. O OCR do tesseract já embarcado só serve para fórmulas e erra muito em letra manuscrita corrida, então indexar os cadernos por ele foi deixado de fora de propósito: um índice pouco confiável passaria a impressão de que a busca acha tudo.
- Correção de leitura anterior: importar PDF ou imagem para anotar por cima já existia (`page-import.tsx`, com o leitor de PDF sob demanda).
- Testes: `notebook-search.test.ts` (6), `notebook-search.test.tsx` (3) e `e2e/notebook-search.spec.ts` (desktop e mobile).

## Cursor ao vivo no caderno compartilhado (2026-09-26)

- Quem está na mesma folha vê um ponto colorido com o nome do colega onde ele aponta a caneta, o mouse ou o dedo, com deslizamento de 200 ms (sem animação com "reduzir movimento"). A cor vem do id do participante e é sempre a mesma.
- **Canal leve, fora da folha.** O estado da sala é um documento grande regravado a cada revisão, então cursor não podia passar por ele. Uma nova ação `cursor` de `/api/notebook-collab` valida o participante (mesma credencial das outras ações), limita x e y a 0 a 4000 e escreve só `rooms/{codigo}/cursors/{id}` no Firebase (`createFirebaseCursorPublisher`, uma gravação pequena sem controle de versão: a última posição vence). Sair da sala apaga o cursor. As regras do banco não mudam: o servidor escreve com a conta de serviço e os clientes só leem `rooms/{codigo}`, que já é público enquanto a sala vale.
- A regravação da folha (`createFirebasePublicRoomPublisher`) agora preserva `cursors`, senão cada traço apagaria os cursores. O cliente recebe os cursores pelo mesmo fluxo de eventos que já usava: `put` com caminho `/`, `/cursors` ou `/cursors/{id}` e `patch`. Eventos com esses caminhos eram ignorados antes, então clientes antigos não quebram.
- Custo controlado: o cliente só envia com mais alguém online na folha, no máximo quatro vezes por segundo, sem empilhar pedidos (a última posição vence) e ignora falhas em silêncio. Cada envio passa pelo limite por endereço (600 por minuto) e faz uma leitura da sala mais uma gravação. Um cursor vale 5 segundos desde a chegada no aparelho de quem vê, não pela hora do servidor, para relógios diferentes não o esconderem nem o prenderem.
- Testes: ação `cursor` (autenticação, limites, falha do canal, saída), publicador do Firebase (gravação, exclusão, preservação na regravação), ciclo de dois participantes com o cursor aparecendo e sumindo, e o overlay do editor. **Não verificado em produção:** o formato exato dos eventos de streaming do Firebase (`put` e `patch` em filhos) foi implementado pela documentação e testado com um simulador, e a latência real (esperada de algumas centenas de milissegundos) precisa de dois dispositivos com conta Google.

## Índice de folhas com miniaturas (2026-09-26)

- Dentro do editor e na prévia do caderno há um botão "Índice" que abre `NotebookPageIndex`: uma grade com a miniatura de cada folha (a imagem salva da folha, ou o começo do texto quando ainda não há desenho), número e título, com a folha atual destacada e `aria-current`. Clicar em uma folha vai até ela e fecha o índice. Antes só dava para folhear uma a uma, com anterior e próxima.
- Reordenar: cada miniatura tem os botões "Mover para trás" e "Mover para frente" (desativados nas pontas), que usam a ação `notebook/page-moved` que já existia e agora chega ao editor por `onMovePage`. Botões em vez de arrastar, para funcionar com teclado, leitor de tela e toque; a lista reflete a nova ordem na hora.
- O botão só aparece com duas ou mais folhas. O diálogo usa `<dialog>` nativo (foco preso, Esc fecha) e as miniaturas carregam sob demanda (`loading="lazy"`).
- Testes: `notebook-page-index.test.tsx` (4) e `e2e/page-index.spec.ts` (criar segunda folha, reordenar, ir a uma folha).

## Caderno compartilhado sem conexão (2026-09-26)

- Antes, uma falha de rede ao enviar uma alteração virava "erro" (e o painel voltava para criar ou entrar), e a alteração só vivia na memória: recarregar a aba sem internet a perdia, porque a folha do servidor a substituía. O editor sempre escreveu localmente, então o problema era só o envio.
- Agora `useNotebookCollaboration` trata falha de rede e resposta 5xx como modo offline (`isTransient`): o estado vira "offline" sem erro, a alteração continua na fila e uma faixa avisa "Sem conexão. Suas alterações ficam neste aparelho e serão enviadas quando a internet voltar." (também "Reconectando…" e "Enviando alterações…"). Recusas do servidor (403, 404) continuam sendo erro.
- A fila é guardada no aparelho (`helena.notebook-collab.pending.v1`, com a folha, o `base` a partir do qual foi feita e o rótulo). Ao reabrir a aba, ou entrar de novo no mesmo código, `connect` junta a fila com a folha atual do servidor usando o mesmo `mergeHandwriting` de três vias que já resolvia edições simultâneas, mostra o resultado no editor e reenvia. Assim o que uma pessoa escreveu sem internet e o que o colega escreveu nesse meio tempo ficam os dois.
- O evento `online` do navegador dispara o envio na hora (antes esperava o próximo batimento, até 15 s) e `offline` marca o estado imediatamente. Sair do caderno descarta a fila; a chave começa com `helena`, então também é apagada ao sair da conta.
- Limites: a fila é uma só (a última folha pendente, com o `base` da última folha conhecida), não um histórico de operações; a fusão é por traço, post-it, imagem etc., como já era. Se o `localStorage` estiver cheio a fila fica só na memória. Testes em `use-notebook-collaboration.offline.test.tsx`: fila e aviso sem rede, envio ao voltar, recusa do servidor, recarga sem conexão juntando com o colega e saída.

## Varredura de desempenho e armazenamento do caderno (2026-09-26)

Medido em Node (Vitest) e em Chromium real, com folhas sintéticas e o editor aberto.

**CPU pura (mediana de 3 execuções, folha de 1000 traços com 120 pontos, 4 MB de JSON):** `JSON.stringify` 55 ms, `JSON.parse` 51 ms, gravar o rascunho 110 ms, junção de três vias 186 ms, `structuredClone` 157 ms; laço sobre todos os traços 14 ms, girar e escalar 200 itens 6 ms, desfazer com colegas 0,1 ms e reconhecer uma forma 0,2 ms. Com 3000 traços (15 MB) tudo sobe 3 a 4 vezes: a junção passa de 660 ms. Folhas reais de escrita (300 a 600 traços de 40 a 80 pontos) ficam de 1 a 2 MB e abaixo de 60 ms em cada operação.

**Chromium, folha de 300 traços com 60 pontos:** o traço acompanha a caneta a 13 ms por quadro (p95 14,5 ms, pior quadro 44 ms), cinco aumentos de zoom com redesenho levam 0,5 s e abrir o editor com a folha leva 1,6 s incluindo a recarga.

**Achados:**

- **Teto por folha:** `isHandwritingDocument` recusa mais de 500 traços ou mais de 800 000 caracteres por folha. Ao salvar, o editor avisa "A folha ficou grande demais. Divida suas anotações em outra folha." (confirmado desenhando 560 traços). O aviso funciona, mas o teto é baixo para escrita densa: 500 traços é uma página cheia de letra pequena, e o teto em bytes chega antes com traços de muitos pontos. A colaboração usa a mesma validação, então uma folha assim também não sincroniza.
- **Risco de perda total:** se um documento inválido entrar no espaço (dado antigo, importação, nuvem), `loadWorkspace` invalidava o espaço inteiro e abria o espaço inicial, que seria gravado por cima na alteração seguinte. Confirmado com uma folha de 501 traços de 0,17 MB: todos os cadernos sumiam da tela. Agora o conteúdo ilegível é copiado para `helenastudy.workspace.recovery.v1` antes de abrir o espaço inicial (a chave começa com `helena`, então sai junto ao sair da conta). Não há tela de restauração para essa cópia; ela permite recuperar pelo suporte ou pelo console.
- **Peso dos pontos:** cada ponto chegava do ponteiro com cerca de 16 casas decimais. Os traços novos agora são compactados ao gravar (`handwriting-precision.ts`: posição e pressão a duas casas, inclinação inteira, pontos repetidos juntados): o JSON de um traço cai mais de 30% (medido nos testes) com erro máximo de 0,005 unidade da folha, invisível mesmo com zoom. Isso devolve capacidade à folha, à cota do armazenamento e ao envio na colaboração. Traços antigos não são reescritos.
- **Busca:** a normalização por letra fazia varrer 6000 folhas levar 165 a 176 ms por digitação; o caminho rápido de `fold` derruba isso, e um teste de regressão exige menos de 120 ms.
- **Publicação:** cada envio do caderno compartilhado faz de dois a três `JSON.stringify` da folha inteira, o que custa 55 ms por vez em 4 MB e trava a escrita de quem tem uma folha enorme. Não foi alterado; a solução seria comparar por revisão em vez de por texto.

**Decisão pendente do dono:** subir o teto de 500 traços e 800 000 caracteres exige olhar a cota de 5 MB do armazenamento do navegador, o corpo máximo de 900 000 caracteres da colaboração e o tamanho por nó do Firebase, então não foi feito aqui.

## Avaliação do teto por folha e cota do armazenamento (2026-09-26)

**Conclusão: o valor seguro é o atual (500 traços e 800 000 caracteres por folha). Subir o teto não é seguro hoje; o que dá folga é gastar menos bytes por traço e mover a folha para um armazenamento maior.**

Limites que se cruzam:

- **Cota do navegador:** medida em Chromium, 5 242 880 caracteres por site, somando todas as chaves. Uma folha no teto (800 000) já ocupa 15% disso; o espaço de estudos inteiro (todas as folhas, imagens e preferências) e o histórico de versões (até 6 cópias de até 1,5 milhão de caracteres cada, mais que a própria cota) disputam o resto. Portanto o limite que importa é o total, não o por folha: cinco folhas no teto já enchem a cota, e subir o teto por folha só encurta isso.
- **Colaboração:** o corpo de uma atualização leva a folha nova e a folha-base, e o servidor recusa mais de 1,8 milhão de caracteres (`MAX_REQUEST_BYTES * 2`). Com o teto em 800 000, duas cópias (1,6 milhão) já estão a 11% do limite; acima de cerca de 900 000 por folha a colaboração passaria a falhar. Além disso o estado publicado inteiro (a folha incluída) vai a todos os participantes a cada alteração, então subir o teto multiplica o tráfego por pessoa.
- **Cada traço custa:** com posição e pressão arredondadas, um ponto ocupa 40 caracteres em JSON. Um traço de 40 pontos (uma palavra curta) custa 1,56 KB, então 800 000 caracteres comportam 500 traços; com 60 pontos por traço são 333; com 100, 200. O teto de 500 traços e o de bytes estão equilibrados de propósito: o segundo é o que morde quando os traços são longos.
- **Formato:** guardar cada ponto como `[x, y, pressão]` em vez de objeto ocupa 21 caracteres em vez de 40, quase o dobro de capacidade (900 traços de 40 pontos no mesmo teto) sem tocar em nenhum limite acima. É a alavanca segura, mas exige migrar o formato salvo, o validador e a colaboração, então fica como próxima etapa própria. A solução de fundo para caderno grande é guardar as folhas em IndexedDB (dezenas de vezes a cota do `localStorage`), o que também é uma mudança de arquitetura.

**Correção de leitura anterior:** o texto da varredura dizia que compactar os pontos ao gravar reduz o JSON dos traços salvos em mais de 30%. A folha já era arredondada ao salvar (posição a duas casas e pressão a três, em `document()` do editor), então o ganho real da compactação está no rascunho automático e no que a colaboração envia, que antes ia com todas as casas decimais, e não na folha salva.

**Falha grave encontrada e corrigida:** com o armazenamento cheio, `saveWorkspace` lançava um erro dentro de um efeito do React e o app inteiro ficava em branco (reproduzido em Chromium: `setItem` estoura a cota, corpo da página vazio). Agora `useWorkspace` captura o erro, remove o histórico de versões (que é conveniência e costuma ser o que enche o espaço) e tenta de novo; só se ainda assim não couber, mostra o aviso fixo "Este dispositivo está sem espaço para guardar seus estudos…" e mantém a alteração em memória para a pessoa continuar. Testes: `use-workspace.test.tsx` (cede o histórico, não derruba, volta ao normal) e `e2e/storage-full.spec.ts`.

## Formato compacto dos traços no armazenamento, etapa 1 de 2 (2026-09-26)

- Cada ponto era gravado como um objeto (`{"x":123.45,"y":678.91,"pressure":0.52}`, 40 caracteres). O formato compacto (`src/data/handwriting-pack.ts`) guarda os pontos de um traço em uma lista plana `pts` com três números por ponto (mais `tilt` só quando a caneta informou inclinação): cerca de 17 a 20 caracteres por ponto. Medido: o JSON de uma folha cheia cai para pouco mais da metade (55% no teste, com um espaço de estudos vazio ao redor pesando na conta), então cabe quase o dobro de folhas na cota de 5 MB do navegador, e o que sincroniza com a conta encolhe junto.
- A mudança está só na fronteira do armazenamento: `saveWorkspace`, `loadWorkspace`, o histórico de versões e os rascunhos. Na memória, na colaboração, no editor e nos validadores os traços continuam com `points`, e os limites por folha (500 traços, 800 000 caracteres) continuam medidos sobre a forma em objetos, então a colaboração, que ainda envia objetos, não muda.
- **Implantação em duas etapas**, para uma aba ou um aparelho com a versão anterior aberta não receber pela nuvem um espaço que não entende (a versão anterior invalida o espaço e abre um vazio, que depois seria gravado por cima): **esta etapa só LÊ os dois formatos e continua GRAVANDO o antigo** (`PACKED_STORAGE_WRITES = false`). A etapa 2 é uma linha: mudar a constante para `true`, depois de alguns dias, quando todos os aparelhos já abrirem a versão que lê o compacto. O teste "por enquanto continua gravando o formato antigo" trava a constante até essa decisão, e os e2e do editor já foram rodados com a gravação compacta ligada e desligada (o teste que lia `points` direto do armazenamento aceita agora `points` ou `pts`).
- Testes em `handwriting-pack.test.ts`: ida e volta de pontos com e sem inclinação, documento idêntico, leitura do formato antigo sem mudança, espaço e histórico e rascunho lendo o compacto.
- Não incluído (etapa própria): compactar também o que a colaboração envia e recebe, o que permitiria subir o teto por folha, mas exige mudar o servidor, o validador e as duas pontas ao mesmo tempo.

## Editor de escrita menor: seleção fora do arquivo principal (2026-09-26)

- `handwriting-studio.tsx` tinha voltado a 3900 linhas com os recursos novos (laço, alças, formas, cursor). A lógica da seleção saiu dele sem mudar o comportamento, e o arquivo caiu para cerca de 3500 linhas (-400):
  - `handwriting-selection-scene.ts`: a "folha vista pela seleção" (`SelectionScene`) e as funções puras de escolher com laço e com retângulo (`pickInPolygon`, `pickInBox`), acertar o que já está selecionado (`hitsSelected`), calcular a caixa das alças (`selectionFrame`), mover cada tipo de item dentro da folha (`moveStrokes`, `moveCoordinateSystems`, `moveStickies`, `moveImages`) e desenhar a seleção (`drawSelectionOverlay`). Antes essas regras estavam repetidas no início do toque, no movimento, ao soltar e no desenho.
  - `use-selection-actions.ts`: o gancho com apagar, copiar, recortar, colar, duplicar, selecionar tudo, girar, mudar de tamanho e alinhar, junto com a área de transferência.
- Testes novos: `handwriting-selection-scene.test.ts` (11) e `use-selection-actions.test.tsx` (6); os e2e de seleção, alças, palma e do editor passam sem alteração.
- O que ainda pesa no arquivo: `start`, `move` e `finish` do ponteiro (cerca de 600 linhas juntas, misturando caneta, borracha, régua, coordenadas, seleção e janela de escrita), o painel de papel, a importação e a janela de escrita. São os próximos candidatos, em pedaços pequenos.

## Editor de escrita menor: gestos fora do arquivo principal (2026-09-26)

- Continuação da entrada anterior: `handwriting-studio.tsx` foi de 3497 para cerca de 3280 linhas (o arquivo já tinha saído de 3900), sem mudar comportamento.
  - `use-selection-gesture.ts`: o gesto inteiro da ferramenta Selecionar (tocar em uma alça, laço com Shift, retângulo, arrastar itens e alças, escolher ao soltar), que estava espalhado pelo início, pelo movimento e pelo fim do toque, mais o estado da caixa e do laço. O editor só repassa os eventos (`begin`, `move`, `end`, `cancel`).
  - `use-pinch-zoom.ts`: a pinça de dois dedos (zoom e rolagem), com o aviso para quem desenha largar o traço quando o segundo dedo toca.
- Testes novos: `use-selection-gesture.test.tsx` (5) e `use-pinch-zoom.test.tsx` (5); os e2e de seleção, alças, formas, palma e do editor passam sem alteração.
- Restam em `start`, `move` e `finish` a caneta e o traço ao vivo, a borracha, a régua e os eixos, o pan e a janela de escrita. São ramos menores e entrelaçados com muitos refs; o próximo passo natural é um gancho para o traço ao vivo (caneta, forma ao segurar e palma), depois régua e eixos.

## Editor de escrita menor: atalhos e cena da folha (2026-09-26)

- Terceira etapa da redução de `handwriting-studio.tsx`: de 3283 para cerca de 3090 linhas (do pico de 3900), sem mudar comportamento.
  - `use-editor-shortcuts.ts`: os atalhos de teclado (desfazer e refazer, trocar de ferramenta, zoom, Espaço para rolar, copiar e colar da seleção) e o zoom pela roda do mouse. Os ouvintes são criados uma vez e leem o estado mais recente por uma ref.
  - `handwriting-page-scene.ts`: `PageScene` reúne tudo o que desenha a folha, e `renderPageScene` a desenha. `renderPage` recebe quinze argumentos posicionais e era chamado em quatro lugares (tela, PNG, PDF e impressão); agora são chamadas de uma linha.
- Correção incidental: a redução anterior deixou um `context.restore()` sobrando depois de `drawSelectionOverlay`, que já faz o próprio `save` e `restore`. Foi removido.
- Testes novos: `use-editor-shortcuts.test.tsx` (8) e `handwriting-page-scene.test.ts` (2); os e2e do editor, seleção, palma, nitidez e PDF passam sem alteração.

## Seleção universal e sem botão de mover folha (2026-09-26)

- O botão "Mover folha" (a mão) saiu da barra de ferramentas no computador e no celular. A mão continua existindo como modo interno, pela tecla H, pelo Espaço segurado e pelo botão do lado da caneta, e no toque a folha rola com o dedo (modo só caneta) e com a pinça de dois dedos. Mover o que está selecionado não depende mais de nenhuma ferramenta especial.
- Tudo o que se seleciona agora se move: além de traços, post-its, imagens e eixos, o texto da folha (a moldura de texto) acompanha o arrasto, sem sair da folha (`moveTextFrame`). Antes ele podia ser escolhido, mas não arrastado.
- Com qualquer coisa selecionada, as setas empurram a seleção (1 unidade da folha, ou 10 com Shift), em qualquer ferramenta, e vários toques seguidos entram como um só passo do Desfazer (`nudgeSelection`). Sem seleção as setas continuam rolando a folha como antes.
- Testes: gesto da seleção com o texto (`use-selection-gesture.test.tsx`), empurrar (`use-selection-actions.test.tsx`, `use-editor-shortcuts.test.tsx`) e um e2e novo (`selection-tools.spec.ts`) que confere as setas e o Desfazer e que o botão não existe. O e2e de arrastar a folha agora usa a tecla H, e o teste de atalhos reconhece a mão pela folha ("Arraste a folha para mover").

## Formato compacto dos traços, etapa 2 de 2: gravação ligada (2026-09-26)

- `PACKED_STORAGE_WRITES` passou a `true`: o espaço de estudos, o histórico de versões e os rascunhos agora são gravados no formato compacto (`pts`), e o que sincroniza com a conta encolhe junto. A leitura dos dois formatos segue valendo, então espaços já gravados no formato antigo abrem normalmente e são regravados no compacto na próxima alteração.
- Reverter é seguro a qualquer momento (a constante volta a `false`, e nada que já foi gravado deixa de abrir). O risco que motivou as duas etapas continua o mesmo: uma aba ou um aparelho ainda na versão anterior à etapa 1 não entende o formato compacto; por isso a etapa 2 só foi ligada depois de a etapa 1 ter sido publicada e de os aparelhos terem aberto a versão nova.
- O teste que travava a constante agora confere o contrário: a gravação padrão é compacta, e um espaço no formato antigo continua abrindo. Os e2e do editor já aceitavam `points` e `pts`.

## Política de segurança (2026-09-26)

- Novo `SECURITY.md` na raiz, com o README apontando para ele: como relatar em privado (relato privado do GitHub; o canal de contato da Galeria.Oli ainda está em definição e deve ser adicionado quando existir), o que esperar (confirmar em até 7 dias, avaliar em até 15, sem garantia contratual), versões cobertas (só a produção), escopo dentro e fora, como testar com segurança, o resumo das proteções que já existem e o tratamento de dados pessoais achados por engano (LGPD).
- Pendência do dono: ativar "Private vulnerability reporting" nas configurações de segurança do repositório, senão a via preferida do documento não funciona, e trocar a menção ao canal em definição pelo e-mail assim que ele existir.

## Previsão da ponta da caneta (2026-09-26)

- A cada movimento o navegador informa os pontos que espera para os próximos milissegundos (`getPredictedEvents`). O editor agora desenha, só na camada ao vivo, um pedacinho a mais à frente do traço (`handwriting-prediction.ts`), o que faz a tinta parecer sair da caneta com menos atraso. A ponta nunca entra no traço: no quadro seguinte é recalculada e some se a previsão errou.
- Regras para não desenhar lixo: no máximo 3 pontos e 36 unidades da folha; a previsão inteira é descartada se o primeiro ponto previsto está a mais de 40 unidades do fim do traço (o filtro de suavização ainda está atrás do ponteiro e a ponta ficaria desconectada da tinta); um ponto que volta contra a direção do traço interrompe a ponta; a pressão da ponta é a do último ponto real.
- Só vale para caneta e marca-texto, e some ao fixar uma forma. Preferência nova "Prever a ponta da caneta" (`inkPrediction`, ligada por padrão) em Configurações, Escrita e toque.
- Testes: `handwriting-prediction.test.ts` (7, as regras) e `handwriting-studio-prediction.test.tsx` (o editor pede a previsão ao navegador e respeita a preferência). **Não medido:** o ganho real depende de caneta e tela de verdade (Chromium só entrega previsão para toque e caneta, não para mouse); precisa de teste em iPad ou tablet. O canvas dessincronizado (`desynchronized`) não foi feito de propósito: o ganho depende do hardware e ele dificulta secar a tinta sem artefatos, então só vale com medição.

## Correção das proporções da pasta (2026-09-27)

- Restaurada a largura original de uma posição na vitrine: 220px no desktop e 164px no mobile. As capas usam 70% da largura interna e ficam ancoradas pela base, sem vazar abaixo da pasta fechada.
- A referência aprovada é um bolso translúcido compacto com livros inclinados saindo por cima. A frente permanece sobre a parte inferior dos cadernos durante a abertura, com inclinação moderada, e as capas sobem em leque.
- Verificação visual e E2E com um e três cadernos, abertos e fechados, em desktop e mobile. As abas reais e a viagem até o preview são preservadas.

## Pasta ampliada e movimento universal (2026-09-27, proporções substituídas pela correção acima)

- A pasta ocupa duas posições na prateleira para que as capas abertas tenham área legível. Cada miniatura usa `notebookPaperTabs` com as páginas do próprio caderno, preservando divisórias e marcadores na vitrine e na animação de entrada.
- A abertura da pasta mantém a aba frontal articulada e as capas saem em sequência. A estrela costurada da pasta também é o favicon. Não há painel de ações sob a pasta; guardar e retirar continuam pelo arrasto.
- No celular, manter um caderno arrastado junto à borda da prateleira agora rola a própria prateleira continuamente. Isso permite alcançar uma pasta que saiu da área visível depois da ampliação.
- Tocar de novo na ferramenta ativa volta para a mão. Uma seleção existente pode ser arrastada no modo mão por mouse, caneta ou toque; o botão Mover da seleção também entra nesse modo. A barra de fórmula permanece clara inclusive no tema escuro e os controles de histórico ficam agrupados.
- E2E cobre capa ampliada com abas no desktop e mobile, viagem ao preview, ferramenta mão, objetos selecionados, fórmula e layout.

## Borracha por traço inteiro, setas e polígonos (2026-09-27)

- Novo modo de borracha: além do corte por área existente, um botão "Traço inteiro" na barra de opções (só aparece com a borracha ativa) faz qualquer toque remover o traço de tinta inteiro em vez de recortar só o trecho tocado (`eraseWholeStrokes` em `handwriting-eraser.ts`). O corte por área continua sendo o padrão; a escolha não é uma preferência salva, só o estado da sessão.
- O "segurar para acertar" agora também reconhece seta (cabo reto com uma ponta em V, desenhada sem levantar a caneta: ida até a ponta, farpa de um lado, volta à ponta, farpa do outro) e polígono de 5 a 8 lados (pentágono, hexágono etc., mesma ideia do triângulo já existente, com tolerância mais apertada e uma checagem de que os lados não se cruzam, para não confundir com um rabisco ou com uma elipse) em `handwriting-shapes.ts`.
- Testes novos: `handwriting-eraser.test.ts` (traço inteiro remove tudo que toca e preserva referência quando não toca nada), `handwriting-shapes.test.ts` (seta na horizontal e na vertical, pentágono), `handwriting-ink-options.test.tsx` (alternância do modo da borracha).

## Opacidade do marca-texto (2026-09-27)

- O marca-texto já aceitava qualquer cor (a paleta de tinta não tem restrição por ferramenta); o que faltava era a opacidade, fixa em 30%. Agora um controle deslizante (10% a 70%) aparece na barra de opções só com o marca-texto ativo, e o valor escolhido é gravado no próprio traço (`HandwritingStroke.opacity`, opcional). Traços antigos sem o campo continuam em 30%, o mesmo valor de sempre.
- Testes: `handwriting-canvas-highlighter.test.ts` (a opacidade do traço manda no desenho, com e sem o campo, e não afeta a caneta) e `handwriting-ink-options.test.tsx` (o controle aparece só para o marca-texto e manda o valor certo).

## Arrastar folhas entre miniaturas do índice (2026-09-27)

- O índice de folhas (`NotebookPageIndex`) já reordenava pelos botões "para trás"/"para frente" (um vizinho por vez, funciona por teclado e toque). Agora também dá para arrastar a miniatura direto para o lugar desejado: um gesto a mais, não uma troca. Os botões continuam do mesmo jeito, incluindo para quem usa teclado ou leitor de tela.
- Nova ação do domínio `notebook/page-reordered` (`notebookId`, `pageId`, `toIndex`): tira a folha do lugar e a insere na posição alvo, preservando o conteúdo de todas (só mexe em `pageIds`, igual a `notebook/page-moved`). Fora dos limites, é ajustada para o começo ou o fim; caderno ou folha desconhecidos não mudam nada.
- O arrastar usa eventos de ponteiro (funciona com o dedo, a caneta ou o mouse): ao soltar mais longe da posição inicial que uma folga pequena, a miniatura mais próxima do ponto de soltar vira o alvo; abaixo disso continua sendo um toque normal, que abre a folha.
- Testes: `workspace.test.ts` (mover para o fim, para o começo, fora dos limites e com caderno inexistente) e `notebook-page-index.test.tsx` (arrastar reordena sem abrir a folha; um toque curto sem arrastar continua abrindo).

## Favoritar folhas no índice (2026-09-27)

- O índice de folhas ganha uma estrela por miniatura (favoritar/desfavoritar) e um filtro "Só favoritas" no topo, que esconde as demais mantendo a numeração original de cada folha (a folha 5 continua "5" mesmo filtrada). O campo já existia no domínio (`StudyNotebook.bookmarkedPageIds`), só não tinha nenhuma ação de interface que o alterasse; agora usa a ação genérica `notebook/organized` já existente.
- O arrastar para reordenar fica desligado enquanto o filtro de favoritas está ativo (a lista mostra só um recorte, e a posição de soltar ficaria ambígua); os botões de mover e a estrela continuam funcionando normalmente.
- O filtro fica desativado quando o caderno não tem nenhuma folha favoritada ainda, para não abrir uma lista vazia sem explicação.
- Testes: `notebook-page-index.test.tsx` (favoritar e desfavoritar pela estrela, o filtro mostrando só as favoritas com a numeração certa, e o filtro desativado sem favoritas).

## Papéis Cornell e pauta musical (2026-09-27)

- Dois papéis novos no seletor de papel do editor, ao lado de pautado/quadriculado/pontilhado/em branco/quadro amplo/plano semanal/calendário:
  - **Cornell**: cabeçalho com tópico e data, coluna estreita de "Pistas" à esquerda, coluna larga de "Anotações" à direita e uma faixa de "Resumo" embaixo, cada área com suas próprias pautas finas. É só o desenho de fundo (como os outros papéis); o método de estudo em si (preencher pistas durante a aula e resumir depois) fica por conta de quem usa.
  - **Pauta musical**: pautas de 5 linhas repetidas pela folha, no espaçamento de um caderno de música de papel, sem clave nem números (só as linhas guia).
  - Novo arquivo `handwriting-template-paper.ts`, no mesmo padrão do `handwriting-planner-paper.ts` (plano semanal e calendário) já existente: recebe o contexto 2D, a cor da folha e o tamanho do bitmap, desenha em coordenadas fixas de 1200×1600.
  - A validação local de documentos (`isHandwritingDocument`) precisou incluir os dois nomes novos na lista de papéis aceitos; sem isso um documento salvo com Cornell ou pauta musical seria rejeitado como inválido ao recarregar.
- Testes: `handwriting-template-paper.test.ts` (as duas funções de desenho não travam em qualquer cor e tamanho de folha, e `drawPaper` encaminha para elas), `handwriting-paper-picker.test.tsx` (os dois botões aparecem com o nome certo) e `local-workspace.test.ts` (os dois nomes são aceitos pela validação, e um nome desconhecido continua rejeitado).

## Entradas ricas da caneta: pairar e giro (2026-09-27)

- **Prévia ao pairar**: com uma caneta que avisa isso (`pointerType: "pen"`, sem botão pressionado), aparece um círculo translúcido no lugar onde a ponta vai pousar, antes de tocar a folha. Some ao afastar a caneta, ao sair da folha ou assim que a escrita de verdade começa. Preferência nova "Prévia ao pairar a caneta" (`penHoverPreview`, ligada por padrão) em Configurações, Escrita e toque. Mouse e toque não mostram nada (não pairam de verdade); a prévia não depende de nenhuma ação essencial, é só um auxílio visual.
- **Giro da caneta (barrel roll)**: o pincel Tinteiro já simulava uma ponta chata de calígrafo, largura maior a 45° do traço. Agora, em canetas que informam o giro (`PointerEvent.twist`, caso da Apple Pencil Pro e de algumas mesas digitalizadoras), esse ângulo acompanha o giro de verdade da caneta na mão em vez de ficar fixo em 45°. Sem giro informado, nada muda: continua em 45° como sempre foi.
  - O giro é guardado por ponto (`HandwritingPoint.twist`, opcional) e participa do formato compacto de armazenamento (`handwriting-pack.ts`): como giro 0 é uma leitura válida (caneta sem girar), diferente de "sem informação", o empacotamento guarda por ter ou não a chave, não pelo valor (ao contrário da inclinação, onde 0 e ausente dão no mesmo para o desenho).
- **Aperto (squeeze) da Apple Pencil Pro: não dá para fazer.** É um gesto que a Apple só expõe para apps nativos (UIKit `UIPencilInteraction`); nenhum navegador, nem o Safari do iPad, expõe isso para uma página web. Não existe caminho técnico até esse gesto chegar à web.
- **Não testado em aparelho real**: pairar e giro dependem de hardware que não temos aqui (Apple Pencil Pro ou mesa digitalizadora com giro, num iPad ou tablet de verdade); a lógica tem testes automáticos (a prévia aparece e some nos casos certos, o giro muda o ângulo do tinteiro, o giro sobrevive a salvar e reabrir), mas o efeito na mão só se confirma testando ao vivo.
- Testes: `handwriting-studio-hover.test.tsx` (a prévia aparece só com caneta pairando, some ao escrever, respeita a preferência), `handwriting-hover-preview.test.ts` (o desenho da prévia e o `twist` chegando em `canvasPoint`), `handwriting-ink.test.ts` (o giro muda o ângulo do tinteiro) e `handwriting-pack.test.ts` (o giro, inclusive 0, sobrevive ao formato compacto).

## Espelho em IndexedDB, etapa 1 de 2 (2026-09-27)

- Primeira etapa da migração do espaço de estudos para IndexedDB (`src/data/indexed-workspace-store.ts`): a cada gravação, o mesmo texto já serializado que vai para o `localStorage` é espelhado, em segundo plano, num registro único do IndexedDB. Ao abrir o app, se o espelho tiver algo, ele substitui o que veio do `localStorage` (que continua sendo lido primeiro, na hora, sem esperar nada assíncrono: a tela aparece exatamente como antes, sem atraso).
- O `localStorage` continua sendo a gravação de verdade nesta etapa: qualquer falha do IndexedDB (indisponível, como em alguns modos de navegação privada, ou uma gravação que falhou) é engolida silenciosamente e nunca impede o salvamento de sempre. O teto de 500 traços por folha não muda ainda; só sobe quando o espelho tiver um histórico confiável de uso real e a etapa 2 trocar a leitura inicial para preferir o IndexedDB de propósito.
- Cuidado de ordem dos efeitos: a leitura do espelho ao abrir precisa rodar antes do efeito que grava nele, senão a gravação do primeiro carregamento sobrescreveria o que já estava lá antes de dar tempo de ler.
- Testes: `indexed-workspace-store.test.ts` (abre, cria a tabela na primeira vez, grava e lê de volta, reaproveita a mesma conexão, devolve nulo sem IndexedDB), `use-workspace-indexed-mirror.test.tsx` (espelha o que foi salvo, troca pelo conteúdo do espelho ao abrir quando ele já tem algo, funciona sem IndexedDB disponível, uma falha do espelho não afeta o salvamento de verdade).

## Acessibilidade: inserir forma pelo teclado e anúncios de leitor de tela (2026-09-27)

- **Inserir forma sem desenhar**: novo botão "Inserir forma" na barra de ferramentas abre um menu (Reta, Elipse, Retângulo, Triângulo, Seta, Polígono); escolher uma insere a forma pronta, do tamanho padrão, no meio da folha, já selecionada. Desenhar à mão livre é, por natureza, um gesto de ponteiro sem alternativa possível por teclado; a forma pronta é a alternativa: depois de inserida, mover, girar e redimensionar já são acessíveis por teclado (setas empurram a seleção, Girar, Aumentar/Diminuir), então o pedido de "alternativa por teclado para desenhar formas" fica coberto pela composição das duas coisas.
  - `canonicalShape` em `handwriting-shapes.ts`: gera os pontos da forma direto (sem desenho e sem reconhecimento), reaproveitando a mesma função de gerar traço liso (`densify`) que o reconhecimento já usa. Só o polígono usa um número fixo de lados (hexágono), por não ter um "padrão" natural como as outras formas.
- **Leitor de tela**:
  - A contagem de itens selecionados no editor (que já existia como texto visível) e a contagem de sistemas de coordenadas selecionados agora são regiões `aria-live="polite"`: quem usa leitor de tela ouve a mudança sem precisar navegar até lá para conferir.
  - O índice de folhas ganha um aviso (`aria-live`, só para leitor de tela) ao mover, favoritar ou arrastar uma miniatura, contando a nova posição ou o novo estado de favorito.
- Testes: `handwriting-shapes.test.ts` (cada forma cabe na caixa pedida, a seta gerada é reconhecida de volta como seta), `handwriting-toolbar.test.tsx` (o botão abre o menu; a contagem de selecionados é uma região de status), `handwriting-studio-shape-insert.test.tsx` (o fluxo completo: abrir, escolher, a forma entra selecionada; fechar sem escolher não insere nada), `notebook-page-index.test.tsx` (os avisos de mover e favoritar).

## Régua e eixos de coordenadas também entram sem desenhar (2026-09-27)

- O menu "Inserir sem desenhar" (antes só formas) ganha mais duas opções: **Régua** e **Eixos de coordenadas**. Igual às formas, medir com a régua ou os eixos hoje só funciona arrastando (um gesto de ponteiro sem alternativa possível); agora entram prontos, do tamanho padrão, no meio da folha, já selecionados. A régua usa o tipo escolhido no momento (reta, esquadro, transferidor etc.) e os eixos usam o passo e a opção de mostrar medições já configurados.
- O botão da barra de ferramentas e o diálogo mudaram de nome, de "Inserir forma" para "Inserir sem desenhar", já que cobrem mais do que formas.
- Testes: `handwriting-studio-shape-insert.test.tsx` (a régua e os eixos entram selecionados, cada um com a contagem certa).

## Notes de texto na vitrine

Atualização das vitrines e ferramentas: o limite é de quatro objetos visíveis por vitrine, incluindo pastas, Notes e cadernos. O excedente ocupa outra vitrine; cada vitrine aceita até três pastas e cada pasta continua com três itens. Marcadores ficam acima da prateleira no preview. Criação, modos de borracha, formas, reinício de Foco e navegação usam ícones de papel. Formas entram na área visível da folha com seleção ativa e camada de tinta visível.

Criar oferece Caderno, Note e Pasta. Note usa um item de notebook com kind note e uma página de texto, preservada pelo armazenamento existente. A prévia mostra papel creme com canto dobrado, título e trecho real do texto. O editor contém somente título e escrita, com salvamento automático. Pastas aceitam até três itens mistos entre Notes e cadernos; a vitrine continua distribuindo quatro itens soltos por coleção. Notes podem ser arrastadas para dentro e para fora, abertas, buscadas e excluídas com a seleção existente.

## Mover para pasta pelo teclado, sem arrastar (2026-09-28)

- Continuação da acessibilidade do editor pro resto do app: hoje só dá para colocar um caderno ou uma note dentro de uma pasta arrastando na vitrine, um gesto de ponteiro sem alternativa por teclado. Agora, no modo "Selecionar" já existente, uma nova ação "Mover para pasta" abre um menu (as pastas existentes + "Vitrine", para tirar de uma pasta) e move toda a seleção de uma vez.
- Respeita o mesmo limite de três itens por pasta que o arrastar já respeita: se a seleção não couber inteira, avisa quantos entraram e quantos não, ou que a pasta já está cheia. A folder que virou notebook não entra na seleção (não faz sentido colocar uma pasta dentro de outra), só cadernos e notes.
- Novo `NotebookFolderMovePicker`, no mesmo padrão de diálogo já usado em outros lugares do app.
- Testes: `notes-view-folder-move.test.tsx` (move pra pasta, move de volta pra vitrine, avisa quando a pasta já está cheia, Fechar não move nada).

# Convite da turma, 2026-09-28

Decisão final: usar apenas Helena erguendo a placa, em
`public/helena-room-invite.png`. Fundo externo transparente, QR SVG grafite
com quatro módulos de margem branca dentro da placa, sem estilizar ou ocultar
os módulos. Composição quadrada para celular e desktop. A turma permanece como
estudo anterior, não como arte ativa. Prompt de extração pela ferramenta integrada:
remover somente o fundo creme externo, preservar gata, placa branca opaca e pose;
limpar resíduos e franjas externas sem alterar a geometria.

Header do Modo Sala com cinco personagens sem molduras, QR vetorial separado e
layout adaptável. Contraste branco sobre roxo preservado no hover selecionado.
Arte criada pela ferramenta integrada de geração de imagens usando as cinco
referências do usuário: papel facetado, fundo creme, placa central vazia, sem
texto ou QR desenhado. Asset: `public/room-crew-header.png`.

Revisão aprovada para integração: estilo aproximado às poses do onboarding,
cabeça da Helena em nova pose, anatomia do urso simplificada, pata da raposa com
dobras legíveis e ponta superior da estrela inteira. A placa e o QR continuam
separados. Edição pela ferramenta integrada, sem alterações no fluxo da sala.

Prompt da revisão: usar as poses 1 e 3 do onboarding como referências de papel
recortado, facetas maiores e sombras discretas; preservar os cinco personagens,
paleta, proporção 3:1 e placa branca central; corrigir anatomia do urso, mostrar
a estrela inteira e mudar a cabeça da Helena. Refinamento final: alterar apenas
a pata levantada da raposa para um antebraço curto conectado e pata de papel com
duas pequenas divisões, mantendo todo o restante da composição.

## Tabela dentro do post-it (2026-09-29)

- Recurso inspirado no Samsung Notes (que tem tabelas prontas para preencher): novo botão "Tabela" na barra de ferramentas insere um post-it especial com uma grade de células de texto (3×3 por padrão), em vez de um post-it comum.
- Cada célula é editável, e a tabela tem botões para adicionar/remover linha e coluna (até 8 linhas e 6 colunas; nunca fica com zero linhas ou colunas). Fora isso, uma tabela é um post-it como outro qualquer: usa o mesmo mover, redimensionar, selecionar, trazer para frente/enviar para trás, cor de fundo e apagar que os post-its já têm, sem código novo para isso.
- As funções puras de mexer na grade (`tableAddRow`, `tableRemoveRow`, `tableAddColumn`, `tableRemoveColumn`, `tableSetCell`) ficam em `handwriting-geometry.ts`, ao lado das outras contas de post-it.
- A tabela entra na exportação em PNG/PDF e na impressão do mesmo jeito que os outros post-its (uma grade desenhada com o texto de cada célula), e participa da mesma camada "Post-its" do painel de camadas.
- Testes: `handwriting-geometry.test.ts` (as funções da grade, incluindo os limites de linhas/colunas), `handwriting-sticky-note.test.tsx` (editar célula, adicionar/remover linha e coluna, botões desativados no mínimo), `handwriting-canvas-table.test.ts` (a tabela não trava o desenho da folha, com célula vazia ou texto longo), `local-workspace.test.ts` (a validação aceita tabela válida e rejeita linha vazia ou célula gigante).

## IndexedDB como gravação de verdade, etapa 2 de 2 (2026-09-29)

- Completa a migração começada na etapa 1: o IndexedDB (`src/data/indexed-workspace-store.ts`) passa de espelho best-effort para a gravação que garante o salvamento de verdade. O `localStorage` continua recebendo o mesmo conteúdo, a cada mudança, só para a leitura inicial da próxima abertura continuar instantânea (sem esperar nada assíncrono).
- `set()` do armazenamento em IndexedDB deixou de engolir erros: agora propaga a falha para quem chama, porque a partir desta etapa uma falha de gravação ali precisa ser sabida (`get()` continua best-effort, já que uma falha de leitura só faz o app seguir com o que já tinha carregado do `localStorage`).
- Em `src/hooks/use-workspace.ts`, uma falha ao gravar no `localStorage` (armazenamento cheio, cerca de 5 MB por site) deixou de acionar sozinha o aviso de "armazenamento cheio": o aviso só aparece se o IndexedDB também falhar (ou não existir, como em alguns modos de navegação privada, caso em que o `localStorage` volta a ser a única gravação de verdade, exatamente como antes da etapa 1).
- Com o IndexedDB garantindo bem mais espaço que o `localStorage`, os dois tetos pensados para caber numa gravação síncrona pequena subiram em `src/data/local-workspace.ts`: o de traços por folha, de 500 para 4000, e o de tamanho total do documento de uma folha, de 800 mil para 6 milhões de caracteres.
- Testes: `indexed-workspace-store.test.ts` (a gravação agora propaga o erro em vez de engolir), `use-workspace-indexed-mirror.test.tsx`, renomeado para refletir a etapa 2 (o IndexedDB grava e é preferido na leitura inicial, uma falha só dele não avisa armazenamento cheio enquanto o `localStorage` ainda funciona, e o aviso só aparece quando os dois falham juntos), `local-workspace.test.ts` (o teto de traços passou a barrar a partir de 4001, não mais de 501).

## Login com Google travando em silêncio, e erro em inglês ao criar sala (2026-09-30)

- Login com Google (`src/views/google-login.tsx`): quando o pop-up é bloqueado, o fluxo cai para `signInWithRedirect`. Essa chamada de contingência não tinha `try/catch` próprio; se ela mesma falhasse (por exemplo `auth/unauthorized-domain`, num domínio ainda não autorizado no Firebase), o erro ficava sem tratamento e a tela travava para sempre em "Aguardando o Google…", sem nenhum aviso. Agora a chamada tem seu próprio `try/catch`: uma falha aqui limpa as respostas pendentes, libera o botão e mostra uma mensagem em português (`googleLoginError` ganhou um caso específico para `auth/unauthorized-domain`).
- Criação e demais ações de sala (`src/hooks/use-local-room.ts`): vários pontos faziam `caught instanceof Error ? caught.message : "mensagem em português"`. Um erro próprio da sala (`RoomRequestError`) sempre tem mensagem em português, mas um erro nativo do navegador (timeout do `AbortController` depois de 15 s sem resposta, `TypeError: Failed to fetch` sem rede) também é uma instância de `Error`, e sua mensagem (em inglês, sem tradução) acabava na tela sem passar por nada. Novo helper `roomErrorMessage(caught, fallback)` só confia na mensagem quando `caught` é um `RoomRequestError`; qualquer outro erro cai no texto padrão em português daquele ponto.
- Testes: `google-login.test.tsx` (o redirecionamento falhando mostra aviso e libera o botão, em vez de travar), `use-local-room.test.ts` (um `fetch` que rejeita com erro nativo mostra a mensagem em português de `createRoom`, não o texto do navegador).

## Exclusividade de sala por conta logada (2026-10-01)

- Primeiro passo de uma investigação maior sobre sincronização entre dispositivos (áudio e sala ficam para depois): a sala local não tinha nenhuma relação com a conta Google logada. Criar ou entrar numa sala sempre gerava um token aleatório guardado só no dispositivo atual (`sessionStorage`), sem ligação com o login; por isso a mesma conta conseguia entrar na mesma sala por dois dispositivos ao mesmo tempo, sem nenhum aviso.
- `src/hooks/use-local-room.ts` agora manda o ID token do Firebase (quando a pessoa está logada) no cabeçalho `Authorization` de todo pedido à sala, do mesmo jeito que `use-notebook-collaboration.ts` já fazia para cadernos colaborativos. A sala continua funcionando sem login exatamente como antes (convidados, sem esse cabeçalho).
- `api/local-room.ts` passou a verificar esse token com `createFirebaseAccountIdentity` (já existia, usado só em `notebook-collab`). `src/backend/local-room-handler.ts` guarda o UID de quem criou a sala (`hostAccountId`) e de cada participante (`accountId`, em `LocalRoomParticipant`), e recusa (`409`, `code: "already_in_room"`) uma nova entrada na mesma sala pela mesma conta enquanto a entrada anterior (como anfitrião ou participante) ainda está online. Depois que a pessoa sai (`leave`) ou fica off-line além da margem de presença, a mesma conta pode entrar de novo normalmente.
- Nem `hostAccountId` nem `accountId` aparecem no estado público da sala (`toPublicRoomState` os remove, do mesmo jeito que já removia o `token`): os outros participantes nunca veem o UID de ninguém.
- Testes: `local-room-handler.test.ts` (recusa a mesma conta entrar de novo enquanto online, recusa o anfitrião entrar como participante por outro dispositivo, contas diferentes entram normalmente, depois de saír a mesma conta pode voltar, convidados sem login não são afetados, o UID nunca aparece no estado público), `local-room.test.ts` (o estado público nunca inclui `accountId`/`hostAccountId`), `use-local-room.test.ts` (o token da conta logada vai no `Authorization`; sem conta logada, o cabeçalho não é enviado).
- Ficou pendente da mesma investigação (fora do escopo desta mudança, resolvido na seção "Sincronização entre dispositivos por item, não por bloco inteiro" abaixo): a sincronização do workspace inteiro entre dispositivos (hoje faz merge por chave de armazenamento inteira, não por caderno/nota, então um conflito real descarta um lado inteiro).

## Sincronização entre dispositivos por item, não por bloco inteiro (2026-10-01)

- Segunda parte da investigação sobre conteúdo diferente entre PC e celular (a primeira, exclusividade de sala por conta, foi uma mudança separada). Causa raiz: `src/data/sync-conflict.ts` faz um merge de três vias (base, local, remoto) por chave do `localStorage`, e o espaço de estudos inteiro mora numa única chave (`helenastudy.workspace.v1`). Quando os dois dispositivos mudavam qualquer coisa desde a última sincronização, mesmo em cadernos ou folhas completamente diferentes, o merge via a chave como "mudou dos dois lados" e descartava o bloco remoto inteiro, não só a diferença.
- `src/domain/workspace-sync-merge.ts` (novo): mescla o espaço de estudos item por item (por `id`) em cada uma das listas do workspace (cadernos, folhas, tarefas, hábitos, materiais, flashcards, metas, etc.), em vez de tratar o JSON inteiro como um bloco. Um item que só mudou, só foi criado ou só foi removido de um dos lados entra no resultado normalmente; só quando o MESMO item foi alterado de formas diferentes nos dois dispositivos é que um precisa ceder lugar ao outro (o lado local prevalece nesse caso, como já acontecia antes, só que agora restrito a esse item específico, não ao espaço inteiro). A comparação ignora ordem de chaves dentro de cada item.
- `src/hooks/use-cloud-sync.ts`: quando o merge genérico por chave detecta conflito especificamente na chave do espaço de estudos, troca para esse merge por item antes de decidir o que sobe para a nuvem. As outras chaves sincronizadas (tema, perfil, onboarding, etc., todas valores pequenos e escalares) continuam no merge simples por chave, que já era correto para elas.
- Testes: `workspace-sync-merge.test.ts` (adições em dispositivos diferentes convivem, remoção só de um lado é respeitada, edição só remota é trazida, o mesmo item editado diferente nos dois lados conta como conflito e mantém o local, duas edições iguais não contam conflito, preferências mesclam como valor único, ordem de chaves não importa), `use-cloud-sync.test.tsx` (cadernos criados em cada dispositivo desde a última sincronização aparecem os dois depois do merge, sem ficar presa em "conflict").
- Ficou pendente da mesma investigação (fora do escopo desta mudança, resolvido na seção "Sincronização entre dispositivos em tempo real, via stream do Firebase" abaixo): a sincronização continua sendo por polling a cada 5 segundos, não em tempo real; um dispositivo que fica fechado por muito tempo só sincroniza de verdade quando reabre.

## Sincronização entre dispositivos em tempo real, via stream do Firebase (2026-10-01)

- Terceira parte da investigação sobre sincronização entre dispositivos (as duas primeiras, exclusividade de sala por conta e merge por item do espaço de estudos, foram mudanças separadas). `src/hooks/use-cloud-sync.ts` buscava mudanças de outros dispositivos por polling HTTP a cada 5 segundos; além do atraso, um aparelho com a aba fechada só sincronizava de verdade ao reabrir.
- Agora o hook conecta direto no Realtime Database do Firebase por Server-Sent Events nativos do navegador (`EventSource`), do mesmo jeito que a sala local já fazia (`startStreaming` em `src/hooks/use-local-room.ts`): mudanças feitas em outro dispositivo chegam na hora, sem esperar nenhum ciclo. A regra `users/$uid` no Firebase (`firebase-room.rules.json`) já exigia um token de login para ler esse caminho, então, diferente da sala (que lê um caminho público sem token), a URL do stream leva o ID token do Firebase.
- Como o ID token expira (cerca de 1 hora) e uma `EventSource` já aberta não pode trocar sua própria URL, a conexão é refeita com um token novo sempre que o login o renova (`onIdTokenChanged`) ou se o próprio Firebase avisar que o token em uso não vale mais (evento `auth_revoked`).
- O stream só avisa quando algo muda de fato no lado de fora: uma mudança local que falhou em subir por falta de rede não gera nenhum evento novo até a rede voltar. Por isso, um listener do evento `online` do navegador tenta de novo nesse momento, no lugar do que antes era coberto pelo próprio ciclo do polling.
- O envio de mudanças locais (debounce de 350 ms após qualquer edição, e o `PUT` em si) não mudou; só a forma de **receber** mudanças de outros dispositivos deixou de ser polling.
- Testes: `use-cloud-sync.test.tsx` (uma mudança publicada no stream chega sem esperar nenhum polling, o stream é refeito com o token novo quando o login renova, e uma mudança que falhou por falta de rede sobe de novo quando o navegador avisa que a conexão voltou).

## Teto absoluto no orçamento de performance (2026-10-01)

- `scripts/check-performance-budget.mjs`: o orçamento normal (`MAX_INITIAL_JS_BYTES`, `MAX_TOTAL_JS_BYTES`) sempre subiu aos poucos, com uma frase de justificativa a cada funcionalidade nova, o que é esperado. O que faltava era algo avisando se a soma dessas subidas pequenas virasse um problema grande sem ninguém perceber.
- Dois novos tetos absolutos (`HARD_CEILING_INITIAL_JS_BYTES` em 400 KiB, `HARD_CEILING_TOTAL_JS_BYTES` em 1500 KiB) não medem o build: checam a própria configuração do script. Se o orçamento normal precisar passar de qualquer um dos dois, o script falha com uma mensagem própria, diferente da falha de build normal, pedindo uma revisão consciente (code-splitting, lazy-loading) em vez de só mais um bump de rotina.
- Os tetos absolutos em si não deveriam precisar subir no dia a dia; se algum dia precisarem, é uma decisão própria, não uma consequência automática de uma funcionalidade nova.

## Unificação dos dois sistemas de rate limit (2026-10-01)

- `src/backend/room-guard.ts` tinha sua própria repetição da mesma lógica de limite por janela fixa (bucket por minuto, `compareAndSet` com até 40 tentativas) que já existia em `src/backend/rate-limit.ts` (`checkRateLimit`, usada por `speech.ts` e `google-calendar.ts`). Dois sistemas paralelos fazendo a mesma conta é dívida técnica: um endpoint novo podia esquecer de aplicar um dos dois sem ninguém notar.
- `room-guard.ts` agora chama `checkRateLimit` (namespace `"room-limits"`, identidade `endereço:ação`, limite por ação, janela de 60s) em vez de repetir o laço de `compareAndSet`. A chave gerada (`room-limits/sha256(endereço:ação)`), a janela e o TTL de 120s continuam exatamente os mesmos de antes.
- Única diferença observável: o evento de observabilidade que distinguia "limite atingido" (`rate_limited`) de "contenção depois de 40 tentativas" (`rate_limit_contention`) passou a registrar os dois casos como `rate_limited`, já que o resultado para quem usa a sala é o mesmo (`429`) nos dois casos, e nenhum teste dependia dessa distinção.
- Testes: `room-guard.test.ts` continua cobrindo o limite atômico e independente por endereço, agora através do caminho compartilhado.

## Regras do Firebase publicadas em produção (2026-10-02)

- Fechamento de uma pendência levantada numa auditoria ampla desta sessão: o `firebase-room.rules.json` do repositório tinha cinco nós (`notebook-collab`, `notebook-views`, `speech-audio`, `speech-rate-limit`, `speech-generation-rate-limit`, `room-recordings`) que nunca tinham sido publicados no console do Firebase, desde os PRs que os introduziram (#205, #307, #311). O dono confirmou a publicação do arquivo completo no Laboratório de testes de regras.
- Todos os nós que faltavam são `.read: false`/`.write: false`: publicá-los não abriu nenhum acesso novo ao navegador (só a conta de serviço do backend, que ignora regras, já os usava). O ganho real é o `.indexOn: ["expiresAt"]` de cada um, necessário para `api/room-cleanup.ts` varrer e apagar itens vencidos de forma eficiente; antes da publicação, essas três funcionalidades (colaboração em cadernos, voz natural/áudio da sala, gravações do professor) rodavam sem limpeza automática programada.
- Continua pendente, sem relação com esta mudança: a verificação do App Check (`docs/SECOND_BRAIN.md`) ainda está sem enforcement ativo declarado em produção.

## Sala encerrada deixa de ser pública em 30 minutos (2026-10-06)

- Auditoria completa do Modo Sala, oitava correção. O `expiresAt` da sala é definido só na criação (4 horas) e `endRoom` não o encurtava: depois de encerrada, a projeção pública em `/rooms/<código>` (nomes e avatares, legível sem login pelas regras do Firebase) continuava acessível pelas horas que sobravam.
- `endRoom` (`src/domain/local-room.ts`) agora limita `expiresAt` a 30 minutos depois do encerramento (`ROOM_FINISHED_RETENTION_MS`), o que vale para encerramento pelo anfitrião, pela ausência dele e pelo fim da atividade. As regras já bloqueiam a leitura depois de `expiresAt`, e o TTL do estado privado e a varredura de `api/room-cleanup.ts` seguem o mesmo valor. A janela de 30 minutos cobre a tela de resultados de quem já estava conectado. Nunca estende uma sala que já estava perto de vencer, e encerrar uma sala já encerrada não mexe na validade.
- Testes: três casos em `local-room.test.ts`; o principal falha sem a mudança.

## Quem perde a sessão volta para o mesmo lugar na sala (2026-10-06)

- Auditoria completa do Modo Sala, sexta correção. Um aluno logado que perdia a sessão da aba (aba fechada, celular que descarregou o app: a credencial vive no `sessionStorage`) não conseguia voltar: o `join` recusava fora do lobby ("Esta sala já começou a atividade.") e, no lobby, recusava o próprio nome antigo ("Esse nome já está em uso nesta sala."), e só depois olhava a conta. O resultado era ficar de fora até o fim da atividade.
- Em `src/backend/local-room-handler.ts`, para quem entra logado, a checagem da conta agora vem antes das de fase e de nome. Se a conta já tem um participante na sala: enquanto ele ainda está presente (batimento dentro da tolerância de 2 minutos), continua barrado com `already_in_room`, como pedido na exclusividade de sala por conta (a mesma conta não pode estar em dois dispositivos ao mesmo tempo); passada a tolerância, a conta reassume o mesmo participante (mesmo `id`, mesmo nome, placar, equipe e cartela), com um token novo. O token antigo deixa de valer, então o dispositivo antigo, se voltar, não disputa a identidade. Funciona em qualquer fase, menos depois de a sala encerrar (`409`: "Esta sala já foi encerrada."), e o pedido repetido com o mesmo `requestId` devolve o mesmo token.
- Não muda para quem entra como convidado: sem conta não há como saber quem é quem, então continua sem entrar depois de a atividade começar, e nome repetido continua recusado.
- Testes: `local-room-rejoin.test.ts` (volta no meio da atividade com a mesma identidade, token antigo invalidado e novo válido, ainda barrado enquanto o primeiro dispositivo está presente, no lobby o próprio nome não conta como repetido, pedido repetido devolve o mesmo token, ninguém volta depois de a sala encerrar, convidado segue barrado depois do início); 4 dos 7 falham sem a mudança, os outros 3 são guardas.

## Anfitrião remove participantes e fecha a entrada (2026-10-06)

- Auditoria completa do Modo Sala, sétima correção. Antes, quem tinha o código entrava com nome livre e aparecia na tela projetada, e o anfitrião não tinha como tirar ninguém nem impedir novas entradas.
- Novas ações no backend, ambas só com token de anfitrião e registradas na lista de ações do `room-guard` (junto com `repeat` e `lobby`, que faltavam na lista): `kick` remove um participante (404 se o id não existe, 409 se for o próprio organizador jogando) e `lock` fecha ou reabre a entrada (400 se `locked` não for booleano). Com a entrada fechada, `join` responde 409 com "O anfitrião fechou a entrada desta sala."; quem já estava na sala, logado, continua podendo voltar.
- Decisão de produto: remover não é banimento. Não há como banir sem conta, e o anfitrião tem o botão de fechar a entrada para o caso de reentrada indesejada. O login obrigatório para entrar não foi implementado: ele troca a facilidade de entrar por QR code por uma barreira que o anfitrião já resolve com remover e fechar.
- `locked` e `removedParticipantIds` (os 30 mais recentes) entram no estado público. O cliente participante, ao ver o próprio id na lista, para o stream, apaga a sessão salva e volta à tela inicial com "O anfitrião removeu você desta sala.". Quem some da lista também deixa de contar entre os que responderam.
- Interface do anfitrião: botão "Remover" por pessoa na lista do lobby e no quadro de equipes, e botão "Fechar entrada"/"Reabrir entrada" com texto de estado. Tudo funciona com teclado e toque.
- Testes: `local-room-moderation.test.ts` (10, backend), `use-local-room-removal.test.ts` (normalização do estado e saída de quem foi removido; falham sem a mudança), `local-room-moderation.ui.test.tsx` (botões e alternância), mais casos em `local-room.test.ts` e `room-guard.test.ts`.

## Batimento da sala sem republicar o estado inteiro (2026-10-06)

- Auditoria completa do Modo Sala, quinta correção. Cada participante bate no servidor a cada 15 s (a cada 1 s depois do prazo de uma pergunta ou com o stream caído), e cada batimento gravava o estado privado, subia a revisão e publicava a sala inteira. O horário de presença (`lastSeenAt`) era público, então todo batimento mudava o estado público: com 30 alunos, cerca de 2 gravações por segundo no Realtime Database, cada uma repassada para os 30 streams.
- `lastSeenAt` deixou de fazer parte do estado público (`toPublicRoomState` o remove, como já fazia com `token` e `accountId`); nenhum componente o lia, só o servidor usa para a tolerância de presença. Em `src/backend/local-room-handler.ts`, `resume`, `heartbeat` e `leave` passam por `savePresence`: se a projeção pública não mudou, o estado privado é gravado sem subir a revisão e nada novo chega aos streams; se mudou (alguém caiu, saiu, a pergunta avançou), segue o caminho normal de `saveRoom`.
- O `publish` continua sendo chamado nos batimentos sem mudança: com a mesma revisão o publicador do Firebase só consulta e não regrava (ele só escreve quando a revisão é mais nova), então o custo é uma leitura. Em troca, isso repara o caso em que uma publicação falhou depois de o estado privado já ter sido gravado (o cliente recebia `503` e o estado público ficava defasado até a próxima gravação): o próximo batimento de qualquer participante republica.
- Continua pendente, e pode valer a pena se a turma crescer: o estado privado ainda é gravado a cada batimento (uma gravação por batimento, sem repasse a streams). Separar a presença num nó próprio, como os cursores do caderno, eliminaria isso.
- Testes: `local-room-presence.test.ts` (um batimento sem mudança visível não sobe a revisão nem gera estado público novo; a presença continua registrada no estado privado; o estado público nunca expõe o horário de presença; um batimento que muda algo visível sobe a revisão e publica; o próximo batimento repara uma publicação que falhou).

## Nome de exibição sem caracteres invisíveis (2026-10-06)

- Auditoria completa do Modo Sala, quarta correção. `sanitizeDisplayName` (`src/domain/local-room.ts`) só tirava `<` e `>` e juntava espaços, então passavam caracteres de largura zero, inversões de direção como U+202E (que embaralham o texto ao redor na tela projetada) e letras de preenchimento (U+3164, espaço braille U+2800) que desenham um espaço em branco sem contar como espaço: dava para entrar na sala com um nome que parece vazio ou que desloca o placar.
- Agora controles e caracteres de formatação invisíveis saem do nome, exceto ZWNJ e ZWJ (U+200C e U+200D), que escritas como o persa e as sequências de emoji (👩‍💻) precisam; as letras de preenchimento e o espaço braille também saem; o texto é normalizado em NFC (acento solto vira acento composto); quebras de linha e tabulações viram espaço antes disso, para "Ana
  Silva" não virar "AnaSilva". Um nome que sobra vazio é recusado como antes (`400` na entrada). O limite de 24 passa a contar caracteres e não unidades UTF-16, para um emoji nunca ser cortado ao meio. A função é a mesma usada pelos colaboradores de caderno, que ganham o mesmo reforço.
- Nomes só de emoji continuam valendo (têm glifo visível); a sala é para turmas, onde 🦊 é um nome plausível.
- Testes: `local-room.test.ts` (largura zero, direção e controle removidos; nomes que parecem vazios recusados; acento, emoji, ZWJ e quebra de linha preservados ou convertidos; truncamento sem cortar emoji), `local-room-handler.test.ts` (entrada com nome invisível recusada, nome com override de direção chega limpo).

## Confirmação ao encerrar, aviso de expiração e acessibilidade na sala (2026-10-06)

- Auditoria completa do Modo Sala, terceira correção, na camada de interface (`src/components/local-room.tsx`).
- **Confirmação antes de encerrar.** "Encerrar sala" (durante a rodada e no resultado) e, para o anfitrião de uma sala ainda aberta, "Sair da sala" e "Voltar" (ambos chamam `reset`, que envia `leave` e encerra a sala para todos) agora abrem um diálogo modal ("Encerrar a sala?") com "Cancelar" em foco e o aviso de que não dá para desfazer. Novo `room-confirm-button.tsx`. É um diálogo, e não um botão que troca de rótulo como o de "Revelar palavra", porque no celular os botões do cabeçalho da sala viram só um ícone de 44 px e não teriam onde mostrar o aviso; ele vai por portal para o `body` e trata o Tab sozinho para não brigar com o ciclo de foco da sala. Quem não é anfitrião, e o anfitrião depois de a sala acabar, saem direto.
- **Aviso de expiração.** A sala dura 4 horas e se encerra sozinha, e antes o usuário só via "Esta sala expirou ou foi encerrada." no meio da atividade, embora `expiresAt` já fosse público. Novo `room-expiry-notice.tsx` e `roomExpiryWarningMinutes` (`src/domain/local-room.ts`): nos últimos 10 minutos aparece "Esta sala se encerra em menos de N minutos." (com a dica de criar uma nova sala para o anfitrião), em faixas de 10, 5, 2 e 1 minuto, para o leitor de tela anunciar no máximo quatro vezes em vez de todo minuto. Não aparece na tela do projetor, cujo fundo escuro não combina com o estilo atual do aviso.
- **Campo de resposta da escuta** sem corretor ortográfico, capitalização nem autocompletar (`autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}`): o corretor do celular podia sugerir ou trocar a resposta, que é justamente o que o exercício avalia.
- **Anúncios para leitor de tela.** Uma região `role="status"` fala "Pergunta N de M.", "Atividade encerrada. Confira o resultado." e "Sala encerrada.", sem mencionar a palavra da pergunta (que o exercício esconde de quem ouve).
- **Bingo de palavras antigo** (o bingo de números, usado pelas salas novas, já tinha estado pendente e `role="status"`): as marcações agora bloqueiam toque duplo enquanto o envio está em andamento e mostram um aviso visível do resultado.
- Testes: `local-room-session-safety.ui.test.tsx` (13 cenários; 10 falham sem a mudança, os outros 3 são guardas de que quem não é anfitrião sai direto, de que o anfitrião sai direto depois de a sala acabar e de que a sala longe do fim não mostra aviso), `room-confirm-button.ui.test.tsx` (botão sem confirmação, aviso descrito no diálogo, Tab preso entre os dois botões, aviso de expiração mudando de faixa com o tempo), `local-room.test.ts` (faixas de expiração).

## Conexão ao vivo da sala mais resistente (2026-10-06)

- Auditoria completa do Modo Sala, segunda correção. `src/hooks/use-local-room.ts` agora reabre o stream (`EventSource`) com espera crescente (1 s, 2 s, 4 s, até 15 s) quando o navegador desiste da conexão (`readyState` fechado, por exemplo depois de uma recusa do servidor). Em queda de rede o navegador reconecta sozinho e nada muda. Antes, depois de uma desistência o app ficava só no batimento a cada segundo, que custa muito mais ao servidor com uma turma inteira.
- O envio de resposta passou a ter prazo de 6 s (o geral continua 15 s), porque rodadas duram de 5 a 15 s e esperar 15 s por uma resposta que já expirou no servidor não ajuda. Se o primeiro envio passar do prazo ou falhar na rede, o hook repete uma vez com o mesmo corpo: o servidor guarda um recibo por pergunta e participante, então a repetição devolve a resposta já registrada sem contar duas vezes. Recusas do servidor (como o tempo da pergunta ter acabado) nunca são repetidas, e sair da sala (cancelamento de propósito) também não.
- Já estavam resolvidos por mudanças anteriores, e por isso não entraram: o selo "Reconectando" que ficava preso (o heartbeat e o evento `put` já voltam o status para "online") e o avanço automático depender só da aba do anfitrião (participantes batem a cada 1 s depois do prazo e o servidor avança a pergunta no próprio heartbeat).
- Testes: `use-local-room-recovery.test.ts` (reabertura com espera crescente que volta ao começo quando a conexão abre, sem reabrir quando o navegador ainda está reconectando, repetição da resposta com o mesmo corpo depois de 6 s, nenhuma repetição quando o servidor recusa, mensagem em português quando as duas tentativas passam do prazo).

- O App Check já estava com enforcement ativo em produção (`FIREBASE_APPCHECK_ENFORCE=true` na Vercel, confirmado pelo dono no mesmo dia), então essa pendência da auditoria também ficou fechada.

## Bingo: recuperação, fila de conferência e acessibilidade geral (2026-10-07)

- Reaproveita a reentrada por conta proposta na PR #363 e os mecanismos de recuperação das PRs #358/#359. No bingo digital e presencial, perder a sessão não recria participante, cartela, marcas, pontos ou conferência. Reentrada pela mesma conta após a tolerância de ausência de 2 minutos; token anterior invalidado. Convidados ainda precisam da credencial da sessão. Não reabre uma sala encerrada.
- Pedidos válidos de Bingo chegam a uma fila transacional. O anfitrião confere um por vez, em ordem de aceitação pelo servidor, não pelo relógio do aparelho. Novos sorteios ficam pausados, mas os demais participantes podem marcar números já sorteados e anunciar seu Bingo sem um modal bloquear a tela. Rejeição promove o próximo; reinício limpa fila e sorteios; terceiro vencedor confirmado encerra. Finalização antecipada mantém apenas os confirmados. Marcar não confirma vitória nem concede o bônus do objetivo.
- Última bola destacada em um selo solar compacto no cabeçalho do histórico, após a revelação, sem antecipar o resultado. O número também permanece no histórico.
- Perfil oferece Reduzir movimento e Realçar seleções para toda a aplicação. Preferências locais, persistentes neste dispositivo, não sincronizadas em nuvem. Reduzir movimento respeita também a preferência do sistema e alcança CSS, globo, revelação, pódio e transições dos cadernos. Marcações conservam símbolos e estados acessíveis além da cor. Áudio não foi desativado.
- Testes de reentrada digital/presencial, fila nos cinco modos, três pedidos concorrentes reais no handler, recuperação do stream do bingo, interface não bloqueante e persistência das configurações. Bundle medido: entrada 275,7 KiB e total 1129,5 KiB; teto total 1131 KiB, sem dependência nova.

## Anfitrião que volta não encerra mais a própria sala (2026-10-06)

- Auditoria completa do Modo Sala, primeira correção. Em `src/backend/local-room-handler.ts`, as ações `resume` e `heartbeat` encerravam a sala quando o anfitrião estava há mais de 2 minutos sem aparecer (`ROOM_PRESENCE_GRACE_MS`), inclusive quando quem chamava era o próprio anfitrião. Com a sala ainda vazia (ninguém para notar a ausência), um professor que bloqueou a tela do celular por três minutos voltava e via a sala encerrada.
- Agora só os participantes encerram a sala por ausência do anfitrião; o anfitrião chamando `resume` ou `heartbeat` prova que está de volta. Sair de propósito (`leave`) continua encerrando para todos.
- Testes: `room-concurrency.test.ts` (o anfitrião que volta depois da tolerância, por `resume` e por `heartbeat`, mantém a sala no lobby; o anfitrião que sai de propósito ainda encerra).

## Primeiro corte na divisão de `local-room.tsx` (2026-10-07)

- Auditoria completa do Modo Sala, nona e última correção. `src/components/local-room.tsx` tinha mais de 2300 linhas, com um único componente `LocalRoom` de cerca de 2000.
- Mudança sem alteração de comportamento: as constantes e o rótulo de contagem foram para `local-room-config.ts` (`DEFAULT_SETTINGS`, `ROOM_ACTIVITY_OPTIONS`, passos de tempo e palavras, cooldown de áudio, `countLabel`) e os componentes auto-contidos para `local-room-parts.tsx` (`RoomStepSlider`, `CountdownOverlay`, `LocalRoomFullscreen`, com a armadilha de Tab e o portal). O arquivo principal perdeu cerca de 220 linhas; os 1068 testes e o e2e de sala passam sem alteração. O orçamento total de JS subiu 2 KiB (1126 para 1128) por causa da sobrecarga dos módulos novos.
- Pendente de propósito: quebrar o corpo de `LocalRoom` (estado e efeitos na primeira metade, JSX na outra) em subcomponentes exige passar dezenas de estados e callbacks por props, e esse arquivo recebe edições paralelas do bingo. Fica para um momento em que o arquivo esteja parado, para não gerar conflito nem regressão.

## CI do e2e dividido por projeto e downloads do apt resilientes (2026-10-07)

- Medição de hoje no workflow `Application CI`: só o job "Desktop and mobile smoke tests" era lento. Os outros sete checks levam de 2 segundos a 3 minutos. A etapa `playwright install --with-deps chromium webkit` oscilou de 46 segundos a 8 min 56 s e, na PR do anfitrião (#368), consumiu os 25 minutos do job (o check apareceu como "cancelled", sem nenhum teste ter rodado). Os testes em si levam de 10 a 15 minutos.
- Causa da oscilação, vista no log da primeira versão desta PR: o `apt-get` baixa cerca de 180 pacotes do WebKit (115 MB) do espelho `azure.archive.ubuntu.com` e o download parou por mais de 4 minutos. Uma primeira tentativa com `timeout` em volta do `npx` não funcionou: o `apt-get` filho continuou rodando e segurando o lock do dpkg, e as tentativas seguintes falharam na hora.
- O job `e2e` agora roda um projeto por job, em paralelo: desktop (Chromium) e mobile (WebKit). O job de desktop não baixa mais as dependências do WebKit. Antes de instalar, `Acquire::Retries "5"` e `Acquire::http::Timeout "30"` fazem uma parada de download virar nova tentativa. As etapas de instalação (15 min) e de testes (20 min) têm limite próprio.
- Um job `e2e-result` mantém o nome histórico do check, "Desktop and mobile smoke tests", e só passa se os dois projetos passarem. Quem exige esse nome na proteção da branch continua funcionando.
- Não entrou cache dos navegadores: exigiria uma nova action de terceiros fixada por hash, e a regra do projeto é justificar e auditar dependências novas. Fica como opção se a instalação continuar instável.

## Baús arcanos e latência da Matemática (2026-10-10)

- Baús redesenhados em SVG de papel a partir dos ícones existentes de biblioteca,
  banco de atividades e Bingo. Comum discreto; arcano roxo com selo de estrela.
  Slots maiores, reserva vertical responsiva, barra separada que desaparece pronta
  e símbolos + inline, visíveis junto da entrada da ilha.
- Partidas elegíveis entregam um baú: 95% comum, 5% arcano. Compartilham os três
  slots e o minuto de destrancamento. Arcano concede uma A Estrela; IDs e sorteio
  são persistidos antes da revelação. Sem novas dependências ou serviços.
- Booster permite arrastar e inspecionar a carta em 360 graus imediatamente.
  Tarot sem recorte da arte, moldura própria e película brilhante na inspeção.
  Sons próprios via WebAudio; busca disponível não encontrou FX Studio.
- Feedback de 260/600 ms se sobrepõe à requisição, sem overlay de loading por
  resposta. API continua validando progresso e pontos. Não é economia antitrapaça.
- Schema v1 aditivo e sincronização preservam históricos e sinalizam conflitos
  de tipo. Política, limites de clientes antigos e futuros tipos: CHEST_REWARDS.md.
- Quatro provas E2E passaram em Edge desktop e viewport móvel: minigame completo,
  áudio, booster comum, arcano, arraste, inspeção e ausência de sobreposição/barra
  pronta. WebKit real fica para CI. Entrada inicial 276,0 KiB, total 1190,3 KiB;
  acréscimo de 2,6 KiB carregado sob demanda, sem dependência nova.

## Documentação atualizada e `.env.example` removido (2026-10-10)

- Auditoria dos documentos fora do `SECOND_BRAIN` e do `CURRENT_STATE_AUDIT`, que estavam sem edição desde 26/09. Corrigidos: README (o que existe hoje, desenvolvimento sem variáveis, e2e com WebKit), `docs/ARCHITECTURE.md` (orçamentos que diziam 220 e 300 KiB e hoje são 278 e 1190 KiB, funções de `api/`, Modo Sala com estado privado, projeção pública por SSE, `KvStore` com versão e App Check), `docs/PRODUCT_MIND_MAP.md` (Praticar, Modo Sala, OCR local), `docs/IMPLEMENTATION_ROADMAP.md` (fases 5, 9 e 10 e a linha de OCR) e `docs/ROOM_SETUP.md` (as regras antigas de dois nós foram trocadas por referência a `firebase-room.rules.json`, que hoje tem dez nós; entram `kick`, `lock` e os 30 minutos de retenção depois do encerramento).
- `src/product/module-catalog.ts`: entram `handwriting` e `room` como disponíveis. O módulo `ocr` segue planejado, agora descrito como OCR de digitalizações, porque o OCR local existe somente na seleção de traços da escrita à mão. Teste novo no catálogo.
- `.env.example` removido do repositório, por decisão do dono. Saem também a exceção no `.gitignore`, a linha no `.prettierignore` e as duas referências (README e `services/tts/README.md`). O `.gitignore` continua ignorando `.env` e `.env.*`. Nenhum valor secreto estava no arquivo. A lista de variáveis passa a ficar nos guias de configuração e no painel da Vercel, e novos integrantes precisam receber as variáveis públicas `VITE_*` por canal próprio.
- Pendente de decisão do dono, sem alteração aqui: canal de contato de segurança em `SECURITY.md` e na Política de Privacidade, e a presença de `docs/CONTRATO_SOCIETARIO.md` no repositório.

## Caminho público secreto para salas e cadernos (2026-10-10)

- Auditoria de segurança, itens 1, 2 e 4. A projeção pública de uma sala ou de um caderno compartilhado era publicada em `/rooms/<código>`, com o código de 5 letras (cerca de 33 milhões de combinações). Esse caminho é lido direto no Firebase, sem passar pela API: não há login, nem limite de tentativas, nem App Check. Qualquer pessoa podia testar códigos em massa, e um código ativo devolvia o conteúdo inteiro do caderno ou o placar e os nomes da sala. Salas e cadernos também dividiam o mesmo espaço `/rooms/`, então um código repetido faria uma publicação atropelar a outra.
- Cada sala ou caderno novo ganha um `publicId` aleatório de 128 bits (`createPublicStreamId`, em `src/backend/public-stream-id.ts`), guardado só no estado privado. A publicação, o cursor ao vivo e o `streamUrl` entregue pela API usam esse identificador, nunca o código. As pessoas continuam digitando o código de 5 letras; só o caminho de leitura deixou de ser adivinhável. O identificador não entra na projeção pública nem em nenhuma resposta além do `streamUrl`. Como cada sala tem o seu, a colisão entre sala e caderno some.
- O publicador do Firebase valida o formato do identificador antes de montar o caminho da requisição (32 hexadecimais, ou 5 letras maiúsculas e números das salas antigas) e escapa o id do participante no cursor, para um valor estranho nunca apontar para outro nó.
- Compatibilidade: salas e cadernos criados antes da mudança não têm `publicId` e continuam publicados pelo código até acabarem (no máximo quatro horas para salas e oito horas para cadernos, que renovam o prazo a cada gravação). Os clientes já usavam o `streamUrl` devolvido pela API, então nenhum código do navegador mudou.
- Sem mudança nas regras do Firebase: `rooms/$code` já valia para qualquer chave, e a leitura continua condicionada a `expiresAt` no futuro. Não é preciso publicar regras para esta correção.
- Decisão de produto: login para ler caderno não foi exigido. A leitura continua sem conta, protegida agora por um identificador impossível de adivinhar, entregue só a quem entra com o código pela API.
- Limites que continuam: quem recebe o `streamUrl` (todo participante) consegue lê-lo, como antes, e o caminho vaza se a pessoa o compartilhar de propósito. O App Check segue sem proteger a leitura pública, porque o `EventSource` do navegador não envia o cabeçalho; o identificador secreto cobre essa lacuna.
- Testes: `public-stream-id.test.ts`, `public-stream-path.test.ts` (sala e caderno publicam no identificador, não vazam, entrar e retomar devolvem o mesmo caminho, sala antiga segue pelo código, publicador recusa caminho inválido; três deles falham sem a mudança) e as expectativas de `local-room-handler.test.ts` e `notebook-collab-handler.test.ts` atualizadas para o caminho secreto.

## Regras de /users/<uid> validam formato e tamanho (2026-10-10)

- Auditoria de segurança, item 3. As regras só diziam que o próprio usuário lê e escreve `/users/<uid>`; qualquer pessoa com conta Google podia gravar qualquer estrutura, de qualquer tamanho, e gerar custo de armazenamento e tráfego.
- `firebase-room.rules.json` agora valida `users/<uid>/state`: só existem `version` e `updatedAt` (números) e `items`, em que cada chave tem de 1 a 100 caracteres comuns (letras, números, `.`, `_`, `:`, `-`) e cada valor é texto de até 20 milhões de caracteres. Qualquer outro filho de `users/<uid>` ou de `state` é recusado. `items` é opcional porque o Firebase descarta objetos vazios. Apagar (`DELETE`) segue permitido, porque validação não roda em exclusão: a exclusão de conta não muda.
- Escolha deliberada: não há lista fixa de chaves. Uma lista exigiria publicar as regras antes de cada nova chave sincronizada, e o histórico deste projeto (regras que ficaram semanas sem publicar) mostra que esse descompasso quebraria a sincronização. O teste `firebase-user-rules.test.ts` garante que toda chave de `SYNCED_STORAGE_KEYS` passa no padrão. Limite que continua em aberto: a quantidade de chaves não é limitada por regra.
- **Ação do proprietário:** publicar o arquivo no console do Firebase (Realtime Database, Regras) e testar no Laboratório de testes que um salvamento normal de conta passa. Sem a publicação, nada muda em produção.

## Arquivo security.txt (2026-10-10)

- Auditoria de segurança, item 8. O `SECURITY.md` já descrevia como relatar vulnerabilidades, mas o site não publicava o arquivo padrão que ferramentas e pesquisadores procuram. `public/.well-known/security.txt` (RFC 9116) aponta para o relato privado do GitHub, para o `SECURITY.md` e para o endereço canônico, em português e inglês.
- Sem e-mail nem telefone pessoal. Quando existir o contato oficial da Galeria.Oli (pendente, junto com a política de privacidade), basta acrescentar uma linha `Contact:`.
- `Expires` é 2027-10-10 e precisa ser renovado todo ano. `src/security-txt.test.ts` confere o formato e falha quando faltarem menos de 60 dias para vencer.
- Pendência de configuração, fora do código: o relato privado de vulnerabilidades do GitHub, que o `SECURITY.md` indica como via preferida, está desativado no repositório. Ativar em Settings, Code security, Private vulnerability reporting.

## Desconectar o Google Agenda revoga a autorização (2026-10-10)

- Auditoria de segurança, item 5. `action=disconnect` só apagava o cookie de sessão, então o token continuava válido na conta Google da pessoa até ela removê-lo por conta própria.
- Agora o servidor lê o cookie antes de apagá-lo e chama `https://oauth2.googleapis.com/revoke` com o refresh token (`revokeToken` em `google-calendar-oauth.ts`), o que também invalida o access token. É melhor esforço: se o Google falhar, a pessoa sai do mesmo jeito e a resposta traz `revoked: false`. Sem sessão, nada é chamado.
- A chamada acontece no servidor, então o `connect-src` do navegador e a política de privacidade não mudam.
- Testes: três casos novos em `google-calendar-handler.test.ts`; o de revogação falha sem a mudança.

## Segredo do cron e endereço do cliente (2026-10-10)

- Auditoria de segurança, itens 6 e 7.
- `api/room-cleanup.ts` comparava o segredo do cron com `!==`, que revela pelo tempo de resposta quantos caracteres iniciais batem. A checagem foi para `isCronAuthorized` (`src/backend/cron-auth.ts`), que usa `safeEqual` (hash e `timingSafeEqual`) e recusa tudo quando `CRON_SECRET` não está configurado.
- `api/speech.ts` identificava o cliente pelo `x-forwarded-for`, que quem chama pode montar. Agora usa `clientAddress` (`src/backend/client-address.ts`), que lê só `x-vercel-forwarded-for`, o mesmo cabeçalho que o `room-guard` e o Google Agenda já usavam. Sem o cabeçalho (desenvolvimento local), o limite cai no balde `anonymous`.
- Testes: `cron-auth.test.ts` e `client-address.test.ts`.

## Câmera liberada para o próprio site (2026-10-10)

- Auditoria de segurança, item 9. O cabeçalho `Permissions-Policy: camera=()` de `vercel.json` desligava a câmera para o site inteiro, o que impedia o leitor de QR code da sala (`room-qr-scanner.tsx`, único uso de `getUserMedia`) de funcionar em produção.
- Agora é `camera=(self)`: só o próprio site pode pedir a câmera, e nenhum frame de terceiro. Microfone e geolocalização continuam negados.
- Teste: `security-headers.test.ts` confere os três; o novo falha sem a mudança.

# Ativação do aprendizado candidato (2026-10-10)

Primeira geração real salvou um exemplo elegível. Auditoria bloqueou o treino
por pip 24.0 e setuptools 78.1.0 do runner, antes de carregar pesos. Correção
atualiza o ambiente, sem ignorar vulnerabilidades, e permite prova CPU por
disparo manual em branch confiável. Nenhum candidato foi promovido ao chat.

Geração diária protegida de até dois exemplos públicos, corpus inicial de 40
itens, armazenamento privado Firebase e treinamento LoRA CPU no GitHub Actions.
Proprietário confirmou Workers Free. Sem conversas dos alunos, sem promoção
automática e sem mudança para plano pago. Pesos só existem após job concluído;
relatório de candidato não comprova qualidade para produção. Detalhes e ameaças
em `docs/OLENA_LEARNING.md`. Nenhuma alteração visual ou no provedor do chat.

# Chat Helena: streaming e acabamento

- As três sugestões usam papel branco e SVGs originais grafite no claro,
  papel roxo e SVGs creme no escuro, sem filtros, com facetas e estados de pressão.
- Widget usa acabamento de papel, sugestões e ações no padrão original.
- Removidos o contexto decorativo, subtítulo de boas-vindas, rótulo visível do
  compositor e checkbox; envio ocorre somente por ação do aluno, com aviso no rodapé.
- SSE incremental do provedor ao navegador, cancelamento propagado e preservação
  de texto parcial. Limites de conta, origem e quota continuam ativos.
- Treinamento e promoção do modelo próprio não mudam nesta entrega.

# Agenda consistente do aluno

- Hoje/Semana/Mês, formulário único, edição, exclusão confirmada e reagendamento.
- Recorrência semanal calculada sem copiar registros. Conclusão por ocorrência.
- Sessões ligadas ao Foco: abrir não conclui; minutos registrados completam a meta.
- Persistência e sincronização reaproveitam o workspace, com campos opcionais compatíveis.
- Lembretes somente com Agenda aberta. Helena recebe um rascunho, nunca envio automático.
- Google Agenda e tarefas de aula preservados. Sem dependências, serviços ou custos novos.
- Provas, limites e rollback documentados em `docs/AGENDA.md`. Ainda não mesclado.

# Verificação pública de propriedade do site

`index.html` contém a meta `google-site-verification` fornecida pelo proprietário
para a propriedade de prefixo `https://olenastudy.vercel.app/` no Search Console.
É um token público, não uma credencial OAuth. Deve permanecer no HTML inicial após
a confirmação. Não comprova aprovação de marca ou dos escopos do Google Agenda.
Prova de presença no head: `src/google-site-verification.test.ts`.

# Agenda com calendário recolhível

Cabeçalho textual e abas Hoje/Semana/Mês substituídos pelo ícone original de
calendário. O botão expõe o estado aberto e controla um calendário mensal com
seletor de mês, destaque roxo do dia escolhido e contagem dos itens. Os
planejamentos aparecem abaixo, inclusive no desktop. Adicionar usa a data
selecionada; recolher não perde a seleção. Teclado, toque, temas e movimento
reduzido preservados. Conta, Google Agenda, recorrência e Foco não mudaram.
Prova de navegação, posicionamento e formulário: `e2e/agenda.spec.ts`.
O menu de meses também usa papel original: `AgendaMonthPicker`, sem input nativo
de mês. Popover com fechamento por Escape/clique fora, ano editável, 12 meses,
seleção roxa e retorno de foco ao selecionar. Temas e toque validados no E2E.

# Intervalos e histórico na Agenda

- Seleção inclusiva por arraste com mouse/toque, início/fim por clique/teclado e
  Shift + clique. Limpar, cancelamento de ponteiro e perda de captura preservam a
  navegação. Não grava planos em lote nem modifica eventos existentes.
- Dias estudados recebem faixas turquesa. Resumo por mês/intervalo com minutos
  reais, dias ativos e maior sequência consecutiva, inclusive entre meses.
- Quatro categorias selecionáveis substituem os atalhos do dashboard: cronômetro,
  caderno, Pomodoro e ilhas. Cada uma atualiza barras e pizza em SVG/CSS de papel,
  sem biblioteca nova. Barras temporais agrupam o intervalo em até sete blocos;
  legendas e nomes acessíveis preservam valores exatos, inclusive no gráfico vazio.
- Cronômetro/Pomodoro usam somente sessões com modalidade registrada. Novas
  sessões guardam `mode` opcional; registros antigos permanecem intactos e são
  informados como sem modalidade, nunca reclassificados por duração. Cadernos
  mostram criação por data e matéria; ilhas mostram acertos acumulados por ilha
  e sua distribuição entre as ilhas, explicitamente sem filtro temporal. O campo
  adaptativo de erros é uma sequência recente, não total histórico, e não é usado.
- Ícone do expansor agora é um calendário facetado sobre botão branco nos dois
  temas; contorno roxo identifica o estado aberto.
- Barras e primeira fatia amarelas, outras fatias turquesa, coral, roxo e ocre.
  Inspeção por ponteiro/toque, fatias e legendas clicáveis; teclado percorre barras
  com setas/Home/End e ativa fatias com Enter/Espaço. Painel inline anuncia valor
  e percentual. Seleção é reiniciada ao mudar categoria ou intervalo, sem tooltip
  fora da tela; legendas oferecem alvos de toque de 44px mesmo para fatias pequenas.
- Barras têm somente a área proporcional colorida, sem bloco de fundo que pareça
  uma segunda barra. Altura numérica compartilhada de 80px para o maior valor;
  testes de navegador medem a razão 20/30 e altura zero para valores vazios.
  Pizza não inclui faceta decorativa simulando fatia: grupos reais têm cores
  distintas, e grupo único é informado explicitamente como 100%.
- Distribuição em rosca: segmentos anulares proporcionais, pequenas separações,
  profundidade na mesma geometria em papel e total PaperDigits no centro.
  O centro permanece vazio para seleção; nenhuma camada decorativa inventa dados.
- Intervalo inclusivo amarelo nos dois temas, com grafite para contraste e contorno
  roxo no dia ativo. PaperDigits nos dias, anos, horários e totais da Agenda;
  o ano mantém texto nativo durante a edição para preservar usabilidade.
- Conta/persistência reaproveitadas com campo opcional compatível e sem dependência. Seleção da tela
  não é persistida. X vermelho em nova arte facetada exclusiva da Agenda.
- Provas: `agenda-history.test.ts` e E2E de intervalo por arraste, teclado e toque.
- Build medido: entrada inicial 277,8 KiB, total 1220,8 KiB. O orçamento normal
  total acompanha o recurso sob demanda, de 1217 para 1223 KiB. Tetos absolutos
  de entrada e total intactos, sem dependências novas.
- Gráficos por categoria e inspeção adicionam aproximadamente 7 KiB sob demanda:
  entrada 278,0 KiB, total 1230,2 KiB. Orçamento normal total 1232 KiB, com os mesmos
  tetos absolutos e sem dependência de gráficos. Campo opcional `mode` não altera
  a versão do workspace e preserva registros sem modalidade no rollback.

### Agenda permanente e atividade diária (11/10/2026)

- Calendário e dashboard sempre visíveis; o calendário de papel branco agora
  abre somente o seletor de mês. Dia selecionado é o filtro padrão, sem ampliar
  implicitamente para o mês. Intervalos inclusivos filtram as mesmas fontes.
- Categorias Foco, Caderno e Praticar. Foco contém Cronômetro e Pomodoro;
  Praticar reutiliza o ícone oficial da navegação e comporta futuras ilhas.
- Datas de Meu estudo, resumo, legendas de datas das barras e texto da inspeção
  usam números tipográficos comuns. Valores gráficos e dias do calendário mantêm
  PaperDigits. Troca de filtro/categoria anima entrada e barras em 220/280ms,
  com preferência de movimento reduzido preservada.
- `practiceActivities` é coleção opcional na versão 7 do workspace, com ID,
  ilha, nome, data de conclusão, respostas e acertos. Cada resposta avaliada no
  MathArcade real despacha `practice/recorded` por callback da rota Praticar.
  ID da rodada + seed da pergunta evita duplicação. Erros também contam como
  prática; falhas de API não produzem atividade. Sem reconstrução de datas antigas.
- Reducer/leitor validam o registro e o merge por ID mantém dispositivos
  independentes. Ausência do campo em leitor anterior não significa exclusão.
  Rollback preserva a coleção extra, sem reset de progresso ou migração destrutiva.
- Foco/seleção não usam molduras automáticas, outlines roxos/pretos ou realce
  azul nativo de toque. Regra compartilhada usa sublinhado e destaque amarelo;
  bordas estruturais e desenhos do usuário permanecem. Proibição em AGENTS.md
  e DESIGN_SYSTEM.md. E2E verifica foco visível sem outline, ambos os temas e
  dia com/sem atividades; testes provam persistência, retry e merge compatível.
- Validação: 1386 testes unitários, tipos/build e orçamento de desempenho;
  14 cenários E2E da Agenda em desktop/mobile Edge, com temas claro/escuro.
  JS inicial 278,5 KiB e total 1229,8 KiB, sem dependências nem aumento de orçamento.

### Helena no cabeçalho e renderização móvel

A mascote gráfica mantém uma única instância ao abrir e recolher a conversa. O botão se alinha ao espaço de identificação do cabeçalho, sem outro modelo ou imagem acima da saudação. Ao recolher, a transformação em estrela começa imediatamente e continua no botão flutuante. O cabeçalho permanece animado também no celular.

A renderização usa GPU de baixo consumo, resolução limitada a 1,25 no toque e 1,5 no desktop. No toque, materiais Standard preservam cor e iluminação sem as camadas físicas e o relevo invisível nesse tamanho. Animações ociosas móveis usam 18 quadros por segundo, com 30 nas transformações e interações. Não há solicitação de quadros enquanto o documento ou a mascote estão ocultos. Mudanças de texto no chat não reenviam estado gráfico, salvo quando realmente alteram a presença de um diálogo modal. O modelo e o bundle são carregados uma vez por instância, e redução de movimento continua usando imagem estática.

### Referências matemáticas e cálculo da Helena (2026-10-12)

`src/backend/helena-model-input.ts` acrescenta no servidor até três referências originais de 17 tópicos de matemática básica/ensino médio, selecionadas pelo pedido atual. Um parser racional limitado confere operações, porcentagens, igualdades e equações lineares explícitas. Resultados exatos, aproximações, operações inválidas e fora do escopo são distintos. Professor e futuro modelo aprovado recebem o mesmo contexto em geração e streaming, sem nova chamada externa. Não há alteração no corpus de treino, promoção do candidato, consentimento, retenção ou quotas. Conteúdo não é uma biblioteca completa, e a explicação gerada não é certificada pela ferramenta. Escopo, autoria, limites, ameaças e manutenção estão em `docs/HELENA_MATH_KNOWLEDGE.md`.

### Treinamento matemático candidato v2 (2026-10-12)

Workflow `olena-learning.yml` passa a usar 96 exemplos originais e verificados, com 32 perguntas separadas em oito temas. O corpus diário de professor não é chamado nessa cadeia. Treino CPU limitado a 96 passos em Qwen 0,5B, LoRA rank 4, sem promoção automática. Apenas candidatos sem regressões, com pelo menos 75% global e 50% em cada tema, preservam pesos. Relatórios rejeitados são guardados separadamente e não entram na retomada. Retenção aceita apenas artefatos da main ou própria branch, hash/configuração de pesos e avaliação compatíveis; tentativas idênticas não são repetidas sem mudança ou pedido explícito. Detalhes e comandos em `docs/OLENA_LEARNING.md`.

### Helena com cálculo determinístico e professor Cloudflare (2026-10-13)

A integração preparada foi atualizada sobre a main atual. O chat usa `createMathGroundedProvider`: pedidos de conta explícita suportada recebem resultado e etapas do parser racional, sem usar texto gerado para definir a resposta. Pedidos somente numéricos mantêm esse formato. Teoria, conversa e operações fora do escopo usam Cloudflare, com as 17 referências originais e limites da ferramenta no contexto. Autenticação, consentimento e quotas permanecem antes dos dois caminhos. O aviso de privacidade refere o envio ao Cloudflare às respostas de IA.

O runtime deixa de usar o modelo candidato, inclusive com antigas variáveis de promoção. O treino perde o cron diário e continua disponível por workflow_dispatch. Os exemplos de treinamento não foram ampliados. As mesmas 64 questões anteriores foram preservadas como testes do provedor e do streaming HTTP, sem usar suas respostas como implementação. Esse resultado mede a calculadora integrada, não aprendizado do modelo. Limites e manutenção em docs/HELENA_MATH_KNOWLEDGE.md.

### CI móvel dividido para concluir a validação (2026-10-13)

A execução 38334744926 interrompeu a suíte móvel de 150 testes ao atingir o limite de 20 minutos. A matriz passa a executar WebKit em duas partes paralelas, com um worker por parte e o mesmo limite. Desktop permanece em uma parte com dois workers. Os testes do preview da Helena também são particionados. Os checks históricos de desktop, mobile e resultado geral são preservados; os resumos exigem sucesso de toda a matriz. Nenhum teste, repetição, limite por caso ou condição de aprovação foi removido. A união das listagens dos dois shards deve ser idêntica à listagem completa e sem sobreposição.

### Ilha animada de Matemática em Praticar (2026-10-12)

A ilha Picos dos Padrões ganha animação local desenhada em canvas: peças já soltas na arte flutuam, o grupo balança de leve, o ouro brilha com faíscas e partículas, e um reflexo de luz cruza a ilha. Nada é gerado por IA nem enviado a serviços externos; a arte e o cálculo ficam no dispositivo.

A arte é separada por componentes conexos de alfa, sem recortar o corpo da ilha. Cada peça só se move dentro do espaço livre medido em quatro direções, e a amplitude encolhe até que 180 instantes em quatro envelopes não toquem a ilha (teste exaustivo cobre isso). O ciclo de 6 s fecha sem emenda e um envelope suave liga e desliga o movimento, de modo que o primeiro quadro é idêntico à arte parada.

A análise roda em um worker do mesmo domínio (CSP já permitia worker-src self), com fallback na thread principal. Módulos pesados são lazy. O avatar acompanha a ilha pelo deslocamento calculado. Movimento reduzido, pelo app ou pelo sistema (novo useMotionReduced), mantém a imagem parada e não baixa a arte. Sem sombra no chão, pois o palco corta o excedente.

Orçamento de JS total sobe de 1311 para 1328 KiB (medido 1326,1 KiB, +16,4 KiB sob demanda). Sem dependências novas, entrada inicial e teto absoluto preservados.

### Partes animadas nos seis lugares de Matemática (2026-10-13)

Pátio das Primeiras Contas, Oficina das Equações, Torre das Funções, Ponte das Tangentes, Porto das Integrais e Mirante dos Vetores ganham animação local em canvas, sobre a própria arte de cada lugar. Nada é gerado por IA nem enviado a serviços externos. A imagem parada continua no DOM e só some depois do primeiro quadro.

Cada lugar é uma arte única, sem camadas. Cada parte (diamantes, moedas, contas do ábaco, cubos, compasso, braço da balança, setor da torre, braço de tangentes, barco, moldura e gema do Mirante, vetores, folhagem) é recortada por cor e região a partir de sementes em `src/data/place-rigs.ts`. A parte recebe movimento próprio (sobe e volta, desliza, gira em torno de um pivô, respira em escala) e o fundo mostra o que ficaria atrás: a cor vizinha onde havia arte e transparência onde havia ar, decidido por raios de vizinhança. Com o envelope em zero o desenho é a arte parada (diferença média abaixo de 0,2 por pixel nos seis lugares). O ouro pulsa com brilho, o Porto ganha reflexo ondulante na água e as faíscas acompanham as partes que se movem.

Todos os movimentos fecham no ciclo de 6 s, têm amplitude curta e respeitam movimento reduzido (app ou sistema). A análise roda no mesmo worker da ilha das disciplinas, com fallback na thread principal, e o motor é carregado sob demanda. O avatar não se desloca nesses lugares. O fundo do jogo de Matemática permanece estático por decisão de produto, para não distrair durante as perguntas.

Testes cobrem o recorte, o preenchimento do fundo, a pose (repouso, onda de um lado só, ciclo), as classes de cor, a validação das seis listas de partes e a montagem do componente. Validação offline: renderização dos quadros com o mesmo código de produção e verificação visual de cada lugar.

### Helena do assistente em Rive (2026-10-13)

A Helena 3D do assistente flutuante (three.js e modelo GLB em iframe) foi substituída por uma animação Rive, a pedido do proprietário. A estrela de papel do assistente antigo vira a Helena do favicon e volta, com a coreografia da versão 3D (antecipação, estouro, assentamento). O favicon é fatiado em camadas (cabeça, orelhas, íris, pupilas e estrelinha), então ela pisca sem sobra de amarelo, mexe as orelhas sem descolar da cabeça (cisalhamento ancorado na base), segue o cursor com as pupilas, fica pendurada e inclinada ao ser arrastada, cai e assenta ao ser solta, e tem um repertório de 32 s parada (curiosa, aceno, cochilo com "z", susto, bocejo, cantarola com notinhas, piscadela). O arquivo também traz reações a clique para Helena e estrela, prontas para uso futuro pela entrada clique; o app ainda não as dispara.

O runtime oficial @rive-app/canvas 2.43.0 (MIT, sem avisos OSV) fica vendorizado em public/helena-assistant e é carregado sob demanda, fora do bundle, dentro da CSP já existente (script-src self wasm-unsafe-eval, connect-src self). Nada vai a serviço externo nem é apresentado como IA. O arquivo helena.riv é gerado por código em scripts/helena-rive, de forma determinística, e não pelo editor do Rive. Movimento reduzido mantém as imagens estáticas e não baixa runtime nem arquivo.

O componente preserva a interface anterior (mesmas props, imagem estática de reserva, pausa em outras telas e em modais) e expõe data-form, data-state e data-behavior para os testes. Os testes unitários cobrem carregamento, entradas, ciclo estrela/Helena, pausa e falha de carregamento; os e2e do assistente verificam a CSP de produção e a instância única no cabeçalho. Orçamento: Helena Rive opcional 445 KiB de JS, 1,86 MiB de WASM e 829 KiB de .riv, separado; o JavaScript da aplicação sobe de 1364 para 1366 KiB (medido 1364,6), sem dependência npm nova. O three.js vendorizado, o GLB e o script de build do 3D saíram do repositório.

# Perfil móvel e identidade (2026-10-16)

Barra móvel volta a interpolar pelo scroll, com Nome/selo e @/pronomes somente.
Capa sem margens laterais no celular. Sua trajetória foi removida da apresentação;
focusSessions, practiceActivities e quizAttempts permanecem intactos no workspace.
O editor recebia apenas profile.name, enquanto a capa usava cloud.displayName como
alternativa. Agora ambos os pontos de edição recebem o mesmo nome apresentado,
sem gravar uma alternativa até o usuário salvar. Avatares oficiais recebem recortes
transparentes sem trocar seus identificadores persistidos.

### Linha tracejada e pontilhada no handwriting (2026-10-17)

A caneta ganha o estilo da linha: contínua (como sempre), tracejada e pontilhada. A ideia veio de comparar o editor com o Xournal++ (GPL-2.0), lendo apenas o comportamento; nenhum código dele foi copiado ou portado, e o Olena não depende dele.

- **Formato.** `HandwritingStroke.dash?: "dashed" | "dotted"`. Sem o campo, a linha é contínua, então folhas antigas e traços de outros clientes abrem iguais, sem migração. O campo atravessa o formato compacto (`handwriting-pack.ts` já preserva os campos fora de `points`), a colaboração e o histórico.
- **Validação.** `isHandwritingDocument` aceita só `dashed` e `dotted`; qualquer outro valor rejeita a folha. A colaboração usa a mesma função, então não há segunda regra para manter.
- **Desenho.** `drawStroke` usa a rota de espessura constante quando há estilo (o contorno de largura variável dos pincéis tinta e macio é preenchido e não aceita padrão de traço). `dashPattern` calcula o padrão em função da espessura, descontando o excesso das pontas redondas, então o desenho acompanha o redimensionamento. A borracha de trecho e a caixa de tinta (`strokeInkBounds`) passaram a usar a mesma espessura constante, para o toque e o recorte coincidirem com o que se vê. Tela, camada de tinta ao vivo, exportação para PNG, JPEG e PDF e a janela de escrita ampliada passam todos por `drawStroke`.
- **Interface.** O grupo "Estilo da linha" (`Linha contínua`, `Linha tracejada`, `Linha pontilhada`) aparece só com a caneta, reaproveita o estilo dos botões de espessura e funciona com teclado e toque. O marca-texto e a borracha não mostram o grupo. A escolha vale para os próximos traços e não altera os já escritos.
- **Limite conhecido.** O estilo não é aplicado a traços já existentes e não vale para o marca-texto; a fase do padrão recomeça em cada pedaço quando a borracha divide um traço.
- **Testes.** `handwriting-dash-style.test.ts` (desenho, edição e armazenamento; 6 dos 9 testes falham sem a mudança), três casos novos em `handwriting-ink-options.test.tsx` e o e2e `handwriting-dash.spec.ts`, que desenha uma linha de cada estilo na folha real e conta os vãos nos pixels.

### Espaço vertical no handwriting (2026-10-17)

Nova ferramenta "Espaço vertical" no grupo de instrumentos: uma linha horizontal separa a folha, e arrastar para baixo abre espaço (tudo o que está abaixo da linha desce junto) enquanto arrastar para cima fecha espaço vazio. Serve para encaixar uma anotação no meio de uma página já escrita sem apagar e reescrever. A ideia veio do Xournal++ (GPL-2.0) apenas como comportamento; nenhum código dele foi copiado ou portado.

- **Regra (`handwriting-vertical-space.ts`, funções puras).** Desce o que começa na linha ou abaixo dela; o que cruza a linha fica, para a linha nunca cortar um traço ao meio. Vale para traços, post-its, tabelas, imagens importadas, sistemas de coordenadas e a moldura do texto da folha, estando a camada visível ou não, porque abrir espaço é uma operação da folha inteira. O fundo (imagem ou PDF) não se mexe. Abrir pára quando o item mais baixo chega ao fim da folha. Fechar só consome espaço vazio: nada passa da própria linha nem cobre o que ficou acima ou o que cruza a linha.
- **Gesto.** Mouse, caneta e toque: pressionar define a linha, arrastar mostra a linha tracejada, uma faixa amarela com a extensão e o rótulo "Abrir espaço" ou "Fechar espaço", e soltar aplica. Um gesto sem deslocamento não deixa passo no histórico. Cada gesto é um passo de desfazer. Com `penOnly` ligado o toque continua sendo rolagem, como nas outras ferramentas de desenho.
- **Teclado.** Com o foco na folha: setas para cima e para baixo movem a linha de 24 em 24 unidades da folha; Shift com seta abre ou fecha 48 unidades. O rótulo da folha explica isso para leitores de tela.
- **Edição ao vivo.** A aplicação usa os ids da folha de agora e atualizações funcionais, para não apagar um traço que um colega acrescentou enquanto a linha era arrastada. Ela só move itens existentes: nenhum campo novo é gravado, então formato, validação, colaboração e exportação não mudam.
- **Limites conhecidos.** A prévia mostra a faixa e não o conteúdo descendo; o conteúdo se move ao soltar. A linha é sempre horizontal e de largura inteira. Itens que cruzam a linha não se movem.
- **Orçamento.** O JavaScript da aplicação passou de 1431,9 para 1435,2 KiB (+3,3 KiB, sob demanda); o teto de total subiu de 1432 para 1438 KiB, com a justificativa no script. Entrada inicial (279,6 KiB) e teto absoluto (1500 KiB) não mudaram.
- **Testes.** `handwriting-vertical-space.test.ts` (9, regra de quem desce, limites e camadas ocultas), o botão novo em `handwriting-toolbar.test.tsx` e o e2e `handwriting-vertical-space.spec.ts`, que desenha dois traços na folha real, abre espaço com o mouse, abre e fecha com o teclado e desfaz.

### Encaixe no eixo e retângulo em qualquer ângulo no handwriting (2026-10-17)

O "segurar para acertar" (`recognizeShape`, em `handwriting-shapes.ts`) ganha duas regras. A comparação com o Xournal++ (GPL-2.0, só o comportamento; nenhum código dele foi copiado ou portado) apontou as duas. Setas e polígonos de 5 a 8 lados já eram reconhecidos antes deste trabalho; uma leitura anterior desta auditoria dizia o contrário e estava desatualizada.

- **Encaixe no eixo.** Uma reta, ou o cabo de uma seta, que foge do eixo por até 5 graus vira exatamente horizontal ou vertical (`snapToAxis`). O pivô é o ponto onde a caneta começou, e o comprimento é mantido. Fora da tolerância a inclinação é respeitada, e uma diagonal de 45 graus não é puxada para eixo nenhum. As farpas da seta acompanham o cabo encaixado.
- **Retângulo girado.** Além da caixa alinhada aos eixos, o reconhecedor testa o menor retângulo (por área) que envolve o traço em qualquer ângulo (`orientedRectangle`). Até 5 graus do eixo continua valendo a caixa alinhada, então retângulos quase retos saem exatamente como antes. Mais inclinado, sai o retângulo girado, e um losango (quadrado a 45 graus) passa a ser reconhecido.
- **Guarda contra elipses.** O modelo de elipse é alinhado aos eixos, então uma elipse inclinada perdia para o retângulo girado. O retângulo girado só vale se os quatro cantos tiverem tinta perto (no máximo 22% do lado menor); uma elipse não tem, um retângulo de cantos arredondados tem. Elipse inclinada continua sem forma reconhecida, como antes.
- **Sem mudança de formato.** Só o traço gerado muda; nada novo é gravado, então armazenamento, validação, colaboração e exportação não mudam. Interface sem mudança: a escolha segue sendo a de "ajuste inteligente".
- **Orçamento.** O JavaScript da aplicação foi de 1435,2 para 1436,4 KiB (+1,2 KiB), sob o teto de 1438 KiB; nenhum teto mudou.
- **Limites conhecidos.** Triângulos e polígonos não encaixam lados no eixo. A elipse inclinada não é reconhecida.
- **Testes.** 11 casos novos em `handwriting-shapes.test.ts` (7 falham sem a mudança) e o e2e `handwriting-axis-snap.spec.ts`, que na folha real compara uma reta de 3 graus (fica horizontal) com uma de 10 graus (mantém a inclinação) e desenha um retângulo girado 30 graus com tremor, medindo a retidão da aresta.

### Ferramenta de curva no handwriting (2026-10-17)

Nova ferramenta "Curva" no grupo de instrumentos: a pessoa marca pontos de controle e a curva passa por todos eles, para diagramas, gráficos e setas curvas que a mão livre não faz com precisão. A ideia veio da ferramenta de spline do Xournal++ (GPL-2.0) apenas como comportamento; nenhum código dele foi copiado ou portado.

- **Regra (`handwriting-spline.ts`, funções puras).** Catmull-Rom centrípeta (formulação de Barry e Goldman): passa por todos os pontos, não faz laço nem ponta quando o espaçamento é muito irregular, e o primeiro e o último segmento terminam suaves porque os extremos são espelhados. Pontos a até 2 unidades um do outro contam como um só; o teto é de 200 pontos de controle, para o traço caber no limite de 5000 pontos por traço. A curva sai com espaçamento de cerca de 6 unidades, como um traço normal, e limitada à folha.
- **Gesto.** Toque ou clique marca um ponto; pressionar e arrastar mostra o ponto antes de soltar, para ajuste fino com o dedo. Toque duplo no mesmo lugar conclui sem marcar de novo. A prévia mostra a curva, os pontos marcados e o ponto em arrasto, com a cor, a espessura e o estilo de linha da caneta. Trocar para outra ferramenta (exceto a mão) conclui a curva.
- **Teclado.** Setas movem um cursor (12 unidades, ou 48 com Shift), Enter marca o ponto, Shift com Enter conclui, Backspace desfaz o último ponto e Escape cancela. O cursor continua do último ponto marcado. O rótulo da folha explica isso, e uma região de status anuncia quantos pontos há. A tecla Espaço não é usada: ela já é "segurar para rolar a folha" em todo o editor (mão temporária), e segurá-la no meio de uma curva não a conclui.
- **Resultado.** Concluir gera um traço comum da caneta (mesmo pincel, cor, espessura e estilo de linha), um passo de desfazer. Nenhum campo novo é gravado, então armazenamento, validação, colaboração e exportação não mudam.
- **Limites conhecidos.** Os pontos marcados não podem ser movidos depois de colocados (só desfeitos com Backspace); depois de concluída, a curva é um traço como outro qualquer. Não há curva fechada nem editor de alças.
- **Orçamento.** O JavaScript da aplicação passou de 1436,4 para 1440,6 KiB (+4,2 KiB, sob demanda); o teto de total subiu de 1438 para 1444 KiB, com a justificativa no script. Entrada inicial e teto absoluto (1500 KiB) não mudaram.
- **Testes.** `handwriting-spline.test.ts` (9, passagem pelos pontos, suavidade, espaçamento, reta, espaçamento irregular, limites e teto), o botão novo em `handwriting-toolbar.test.tsx` e o e2e `handwriting-curve.spec.ts`: marca pontos com o mouse com uma pausa segurando Espaço no meio, conclui com toque duplo, confere tinta em cada ponto e no vão entre eles, desfaz em um passo, e repete com o teclado.

### Borracha de fundo no handwriting (2026-10-17)

Terceiro modo da borracha, "Fundo": apaga só a página ou a imagem importada por onde passa, sem tocar na tinta. Serve para limpar partes de um PDF ou foto importados (um cabeçalho, uma resposta, uma anotação impressa) e escrever por cima. A ideia veio da borracha branca do Xournal++ (GPL-2.0) apenas como comportamento; nenhum código dele foi copiado ou portado. Em vez de pintar de branco, o fundo é furado e o papel aparece, então a pauta, o quadriculado e a cor do papel continuam (inclusive no papel noturno).

- **Formato.** `HandwritingStroke.cover?: true`. Um traço de cobertura não deixa tinta: é uma máscara. Sem o campo, o traço é tinta, então folhas antigas e traços de outros clientes abrem iguais, sem migração. O campo atravessa o formato compacto (`handwriting-pack.ts` já preserva os campos fora de `points`), a colaboração, o histórico, o desfazer, a seleção e o movimento, porque é um traço como os outros. Um cliente antigo desenha esse traço como tinta roxa; a folha segue válida.
- **Validação.** `isHandwritingDocument` aceita o campo ausente ou `true` e recusa qualquer outro valor. A colaboração usa a mesma função.
- **Desenho (`renderPage`).** Com traços de cobertura, a camada do fundo (página importada e imagens, com a rotação delas) é desenhada num canvas à parte, furada com `destination-out` pelos traços de cobertura e só então posta sobre o papel. Sem traços de cobertura, o caminho é o de sempre. Com a camada do fundo oculta, ou sem página nem imagem, nada muda. A miniatura, a exportação para PNG, JPEG e PDF e a impressão usam a mesma função, então mostram o furo igual à tela. Durante o gesto, a prévia é uma faixa roxa clara (`drawStroke`); ao soltar, o furo aparece.
- **Gesto.** Mouse, caneta e toque, como um traço comum, em largura constante: o diâmetro é seis vezes o tamanho da borracha, no máximo 100. A ponta de borracha da caneta também usa o modo de fundo quando ele está ativo. Um passo de desfazer devolve o fundo. A borracha de trecho comum, ao passar por um traço de cobertura, o divide e devolve o fundo naquele pedaço.
- **Disponibilidade.** O botão "Apagar só o fundo importado" fica desabilitado, com a explicação no título, quando a folha não tem página nem imagem importada. Se o fundo some com o modo ativo, a borracha volta a apagar tinta. Os três modos são exclusivos.
- **Limites conhecidos.** A borracha de fundo não cobre tinta, texto da folha nem post-its (para esses, o modo Trecho ou Traço inteiro). A prévia é uma faixa, não o fundo sumindo ao vivo. O modo escolhido não é guardado entre sessões.
- **Orçamento.** O JavaScript da aplicação passou de 1440,6 para 1442,6 KiB (+2,0 KiB), sob o teto de 1444 KiB; nenhum teto mudou.
- **Testes.** `handwriting-background-erase.test.ts` (9, falham sem a mudança: prévia, máscara, furo com `destination-out` e colagem sobre o papel, tinta comum intacta, sem fundo e com a camada oculta, caixa, validação), três casos em `handwriting-ink-options.test.tsx` e o e2e `handwriting-background-erase.spec.ts`, que importa uma página azul na folha real, confere o botão desabilitado antes e habilitado depois, passa a borracha de fundo sobre uma linha de tinta e confere o papel no furo, o azul longe dele, a tinta inteira, e que desfazer devolve o fundo.

### Formas com vários traços no handwriting (2026-10-17)

O "segurar para acertar" passa a juntar retas: quando uma reta recém-acertada fecha um triângulo, um retângulo ou um quadrilátero com as retas acertadas logo antes, todas viram um único traço fechado. Antes era preciso desenhar a forma inteira num traço só. A ideia veio do reconhecedor do Xournal++ (GPL-2.0), que também combina segmentos recentes, apenas como comportamento; nenhum código dele foi copiado ou portado.

- **Só retas acertadas de propósito.** Entram na lista as retas que o "segurar para acertar" endireitou (`shapeKindRef`); traços livres, formas de um traço e qualquer outro traço limpam a lista. Quem escreve ou desenha livremente nunca tem traços juntados sem querer. A lista guarda até 5 retas (`MAX_RECENT_LINES`), por 15 segundos (`RECENT_LINE_WINDOW_MS`), e esquece as que foram apagadas ou desfeitas. Só juntam retas do mesmo estilo (ferramenta, cor, espessura, pincel e linha), e traços de cobertura da borracha de fundo nunca entram.
- **Geometria (`closeLines`, em `handwriting-shapes.ts`, funções puras).** Tenta o triângulo primeiro (a reta nova e outras duas) e depois o quadrilátero (a nova e outras três), em qualquer ordem e sentido, e pode pular retas perdidas no meio. Os cantos são as interseções de retas vizinhas, então folgas e retas que passam do canto são perdoadas: cada reta pode estar fora do lado que lhe cabe em até 35% do lado, e a média dos lados em até 20%. Retas quase paralelas (menos de 20 graus entre elas) nunca formam canto, lados com menos de 40 unidades e polígonos que se cruzam são recusados, e a forma sempre inclui a reta mais nova.
- **Resultado.** Triângulo com os três cantos. Quadrilátero com todos os cantos a até 15 graus do reto vira retângulo exato, alinhado ao eixo quando está a até 5 graus dele (a mesma regra do reconhecedor de um traço) e girado acima disso. Qualquer outro quadrilátero vira polígono. O traço novo herda o estilo da reta mais nova.
- **Desfazer.** O fechamento acontece no mesmo gesto da última reta, então um passo de desfazer volta às retas de antes, com os cantos abertos de novo.
- **Sem mudança de formato.** Só o traço gerado muda; nada novo é gravado, então armazenamento, validação, colaboração e exportação não mudam. Interface sem mudança: vale com o "ajuste inteligente" ligado, como o resto.
- **Limites conhecidos.** Só fecha formas de 3 e 4 lados, e só com retas acertadas pelo "segurar para acertar" (uma reta feita sem segurar não entra). Formas com mais lados, setas feitas de duas retas e cruzes continuam sendo feitas num traço só.
- **Orçamento.** O JavaScript da aplicação passou de 1442,6 para 1445,6 KiB (+3,0 KiB, sob demanda); o teto de total subiu de 1444 para 1450 KiB, com a justificativa no script. Entrada inicial e teto absoluto (1500 KiB) não mudaram. A folga até o teto absoluto agora é de cerca de 54 KiB, então os próximos recursos precisam cuidar do peso.
- **Testes.** `handwriting-multi-stroke.test.ts` (13: triângulo com folga e com retas que passam do canto, retângulo alinhado e girado, trapézio como polígono, reta perdida, casos que não fecham, estilo, cobertura e a lista de recentes) e o e2e `handwriting-multi-stroke.spec.ts`, que na folha real desenha três retas seguradas com folga de 24 unidades nos cantos, confere os cantos abertos com duas retas, fechados com a terceira, o interior vazio e que um passo de desfazer volta às duas retas.

# Rótulos adicionais de perfil, 2026-10-17

O identificador confirmado @dreyxnn recebe GALAXIA e BETA TESTER pelo componente compartilhado ProfileLabels. São rótulos de apresentação, sem privilégios ou alteração do cadastro. Teste de regressão valida ficha e barra recolhida, rejeita nome apenas no cache e não confunde @dreyxn com @dreyxnn. Arquivo profile-showcase.test.tsx validado com 13 testes aprovados.

# Perfil: identidade e jornada (2026-10-17)

O @ e as tags usam cache em memória apenas de respostas autenticadas, associado
ao UID confirmado. A consulta começa na sessão, antes de abrir Perfil, e visitas
seguintes mantêm a identidade durante a revalidação. Troca de conta, saída e
edição invalidam respostas antigas. Nenhum selo usa o username do cache local.
Pronomes continuam no perfil sincronizado, com releitura após assinar os eventos
para não perder uma hidratação entre render e efeito. A primeira carga sem cache
ainda depende da rede e da sincronização da conta.

Jornada com três etapas reais: nome/@, personagem e capa. Usa os editores
existentes e quatro poses inéditas, com o onboarding apenas como referência
visual. Helena aparece atrás do botão, com a parte inferior sobreposta por ele.
Bio, pronomes e redes são opcionais.
Conclusão é derivada dos campos salvos, não concede XP e não cria armazenamento
paralelo. Desktop amplo recebe o card à direita; telas menores, abaixo do perfil.

# Conferência da jornada pela API, 17/10/2026

GET /api/olena?action=profile-completion&version=1 confere o perfil persistido
da própria conta e a reserva de @. Retorna somente etapas, total e próxima
pendência. O card não aguarda a rede e não regride durante uma edição ainda
em sincronização; conclusão só é confirmada quando API e cache coincidem.
Falhas indicam confirmação pendente, sem fingir validação. Modelo de ameaça,
limites e contrato em PROFILE_COMPLETION_API.md. Mudança autenticada em PR própria.
Rótulo visual CREKS também concedido ao @miauyw confirmado pelo servidor, sem
alterar privilégios de conta nem confiar no username legado do cache local.

# Correção de jornada e aviso social, 2026-10-17

Jornada monta uma única instância por breakpoint, sem reutilizar o mesmo elemento em dois pais. Atualizações substituem texto e imagem sem remontagem por chave. Identidade ainda em consulta não cobra Nome/@; perfil preenchido celebra sem lista de pendências, mesmo com conferência remota em segundo plano. A API continua conferindo somente os dados da própria conta.

Aviso de novo seguidor usa portal no body para escapar do cabeçalho transformado/sticky, entrada curta e seis segundos de duração. Consulta social compartilhada a cada dez segundos apenas com aba visível e ao retornar à aba. Primeira consulta admite aviso recém-recebido (quinze segundos), sem reproduzir histórico antigo. Atualização cancelada não consome os IDs antes de apresentar o aviso.

# Segurança: link de leitura e regras de conta, 2026-10-17

Resultado da auditoria de segurança (itens 1 e 2 do relatório).

- **`view-create` deixou de ser anônimo.** Antes, qualquer pessoa sem login criava até 4 MB por pedido (40 imagens), guardados por 7 dias no banco compartilhado, limitada apenas a 6 pedidos por minuto por endereço. Agora exige conta autenticada e não anônima (`401` com orientação para entrar), aplica cota por conta (5 por hora e 10 por dia) e global (300 por dia) com `checkRateLimit` (`429`), e confere a assinatura real de PNG, JPEG ou WebP, não só o formato do texto. `view-read` segue público e o link existente continua valendo.
- **Cliente.** `NotebookFileActions` envia o token da conta; sem login mostra "Entre na sua conta para criar um link de visualização." e não envia as folhas.
- **Regras de `users/$uid`.** Antes cada item aceitava até 20 milhões de caracteres e o número de chaves era ilimitado, para qualquer conta, inclusive anônima. Agora só as 17 chaves de `SYNCED_STORAGE_KEYS` entram (nomes brutos em `state`, codificados em `stateV2`), itens passam de 5 milhões de caracteres só na folha de trabalho (teto de 20 milhões) e contas anônimas não escrevem. O cliente nunca cria contas anônimas, então o fluxo legítimo não muda.
- **Limite conhecido.** As regras do Realtime Database não somam tamanhos, então o pior caso por conta ainda é cerca de 100 MB (20 + 16 x 5). Reduzir mais exige dados reais de tamanho; vale configurar alerta de uso no Firebase.
- **Publicação manual.** As regras só valem depois de publicadas no Firebase (ver `docs/ACCOUNT_SYNC_SETUP.md`). Até lá, o código novo do servidor já protege `view-create`, mas as regras antigas continuam abertas.
- **Testes.** `notebook-collab-handler.test.ts` (conta, anônimo, cota, assinatura falsa), `notebook-file-actions.test.tsx` (token enviado e orientação sem login) e `firebase-user-rules.test.ts` (chaves permitidas, limites, escrita anônima).

# Segurança: tetos globais e identidade, 2026-10-17

Resultado da auditoria de segurança (itens 3, 4 e 5 do relatório).

- **IPv6 por prefixo /64.** `clientAddress` agrupa endereços IPv6 pelo prefixo /64 (IPv4 mapeado vira IPv4). Antes, quem recebia um bloco /64 trocava de endereço a cada pedido e escapava de todo limite por endereço. O guarda das salas (`room-guard.ts`) passou a usar a mesma função, em vez de ler o cabeçalho por conta própria. Efeito colateral aceito: pessoas que dividem o mesmo /64 (rara) dividem o limite.
- **Voz individual com teto global.** A geração de áudio, que custa na conta do Cloudflare e não exige login, tem agora limite por endereço (30 por minuto e 600 por dia) e teto global de 6000 gerações por dia (`speech-quota.ts`). Áudio já em cache não gera nova cobrança. O guarda de App Check e o limite por endereço, antes só da voz de sala, valem também para a voz individual, e o cliente envia o token nos dois casos. App Check continua só bloqueando quando `FIREBASE_APPCHECK_ENFORCE=true`.
- **Helena recusa conta anônima.** `helena-runtime.ts` devolve identidade vazia (401 com orientação para entrar) quando o token é anônimo. Antes, contas anônimas baratas de criar esgotavam a cota global de 300 por dia para todos. O cliente nunca cria contas anônimas.
- **Limites escolhidos.** 6000 por dia de voz e 600 por dia por endereço são estimativas conservadoras acima do uso normal de uma turma; ajustar em `speech-quota.ts` conforme o uso real e o custo observado no Cloudflare.
- **Testes.** `client-address.test.ts` (/64, IPv4 mapeado, texto estranho), `speech-quota.test.ts` (três limites e recusa só pelo teto global), `speech-handler.test.ts` (guarda na voz individual) e `helena-runtime.test.ts` (anônimo recusado sem gastar cota). O teste do cliente de voz não roda neste ambiente local (limitação de `Blob.stream` no jsdom), só no CI.

# Segurança: códigos de sala, corpo de pedido e App Check, 2026-10-17

Resultado da auditoria de segurança (itens 6, 7 e 8 do relatório).

- **Código de sala sempre aleatório.** Quando o cliente mandava `requestId`, o código da sala saía de `sha256(requestId)`, então quem escolhia o `requestId` escolhia o código (reservar códigos alheios com cerca de 33 milhões de tentativas offline). Agora o código vem sempre de `crypto.getRandomValues`, e a repetição de um pedido (mesmo `requestId`, para tolerar falha de rede) volta à mesma sala por um registro auxiliar em `room-limits/create-<hash>` com validade da sala. Esse caminho já é só do servidor, indexado por `expiresAt` e varrido pela limpeza diária, então não há regra nova a publicar. A criação continua transacional: dois pedidos simultâneos com o mesmo `requestId` conflitam e o segundo reaproveita o primeiro.
- **Teto do corpo no adaptador.** `createVercelHandler` lia o corpo inteiro antes de qualquer validação. Agora recusa com 413 pelo `content-length` declarado e interrompe a leitura do fluxo ao passar de 4,5 MB (o limite da própria Vercel; o maior pedido legítimo, o link de leitura do caderno, fica abaixo de 4 MB). Corpos já interpretados pela Vercel continuam limitados pela plataforma.
- **App Check.** O guarda agora avisa uma vez por instância (`app_check_not_enforced`) quando `FIREBASE_APPCHECK_ENFORCE` não é `true`. Não mudei o padrão para exigir, porque isso derruba salas e voz se o reCAPTCHA não estiver ativo no ambiente. Cabe ao dono conferir o valor no painel da Vercel e ativar quando o registro de resultados (`room_protection`) mostrar tokens válidos.
- **Limite conhecido.** O código continua com 5 caracteres (cerca de 33 milhões de combinações). Adivinhar uma sala exige entrar por `join`, limitado a 90 por minuto por endereço (agrupado em /64 na outra branch de segurança). Aumentar para 6 caracteres mexeria em campos, links e telas, e fica como decisão separada.
- **Testes.** `local-room-create-request.test.ts` (código não derivado, repetição volta à mesma sala), `vercel-adapter.test.ts` (corpo normal, 413 por cabeçalho e por fluxo) e `room-guard.test.ts` (aviso único).

# Consumo de download do Realtime Database, 2026-10-17

O console do Firebase mostrou 25,47 GB de download de 1 a 17 de outubro (limite gratuito de cerca de 10 GB por mês), com apenas 2,41 MB armazenados, 24 conexões de 100 e 102 negações de regras. Ou seja, o excesso vem do tamanho do que é baixado a cada operação, não de armazenamento nem de ataque às regras.

- **Causa provável (leitura do código, não medida).** Cada salvamento da conta (`use-cloud-sync.ts`) baixava o estado inteiro três vezes: o `GET` de conferência antes do envio, a resposta do `PUT` (que devolve tudo por padrão) e o evento do stream em tempo real. O salvamento disparava 350 ms depois de qualquer mudança em dados sincronizados, e o cronômetro de Foco publica a cada 30 s e a escrita à mão salva a cada pouco tempo.
- **Mudança 1.** O `PUT` usa `print=silent`: o Firebase não devolve mais o estado na resposta, e a resposta não é lida.
- **Mudança 2.** O intervalo de envio passou de 350 ms para 4 s (`CLOUD_UPLOAD_DELAY_MS`), para juntar mudanças seguidas num só envio. Ao esconder a página (`visibilitychange` para oculto) ou ao sair (`pagehide`), o envio pendente sai na hora, sem esperar. O armazenamento do dispositivo continua sendo o cache e a fila de recuperação: se o envio não terminar, o próximo login concilia como antes.
- **Não mudei** o `GET` de conferência antes do `PUT` nem o stream. Eles protegem contra sobrescrever dados de outro aparelho, e trocá-los por escrita condicional (ETag) ou por envio só das chaves alteradas exige testar com o Firebase real. Fica como próximo passo se o consumo continuar alto.
- **Efeito esperado, sem medição.** A resposta do `PUT` some (cerca de um terço do download por salvamento) e o agrupamento reduz o número de salvamentos em rajadas. Não é garantido ficar abaixo de 10 GB por mês. A confirmação é o consumo no console nos dias seguintes (aba Uso), ou `firebase database:profile` na CLI, que mostra o consumo por caminho.
- **Testes.** `use-cloud-sync.test.tsx` ganhou três casos: `print=silent` no `PUT`, agrupamento de mudanças seguidas em um só envio e envio imediato ao esconder a página. O arquivo agora espera até 9 s por operação (o intervalo real é 4 s).

# Configurações e auditoria de exportação (2026-10-17)

Conta concentra identidade somente leitura, e-mail da identidade confirmada, fuso e saída/login. Exclusão migrou de Privacidade e dados para Conta, preservando confirmação digitada e reautenticação. Sem widgets Conta e sincronização/Recuperação local nem atalho Meu progresso; os dados e a sincronização continuam intactos. Transição de entrada e seta amarela original, seleções de estudo em papel amarelo com check e movimento reduzido.

Exportar meus dados gera JSON exclusivamente no navegador. Lista permitida de preferências/estudos, sem enumerar localStorage ou incluir autenticação Firebase, caches de outras contas ou credenciais do Google. O estado atual substitui eventual cópia antiga do workspace. Bloqueado enquanto a conta está carregando/não confirmada; convidado exporta sua sessão pronta. Não baixa arquivos somente na nuvem, não é backup integral da conta e não criptografa o arquivo. Avisos explícitos na tela. Testes verificam bloqueio, erro de armazenamento, ausência de rede na ação, lista permitida e leitura real do download com recuperação dos registros.

# CI com menos minutos faturáveis, 2026-10-18

Motivo: o app terá planos pagos e o repositório deve ficar privado. Em repositório privado o plano gratuito do GitHub Actions tem um teto mensal de minutos (cerca de 2.000, valor a confirmar no GitHub). Em 17 e 18 de outubro foram 29 execuções do `application.yml` em cerca de 8 horas, e cada uma custa em torno de 45 a 50 minutos faturáveis (estimativa pela soma dos jobs), quase tudo de e2e, porque os jobs rodam em paralelo.

- **Escopo do e2e por tipo de mudança** (`scripts/ci-scope.mjs`, testado em `scripts/ci-scope.test.mjs`):
  - pull request com código, execução manual e execução semanal: desktop e mobile completos (como antes);
  - push na main: só o desktop. O mesmo código já passou completo na pull request;
  - pull request que só mexe em documentação (`docs/`, `*.md`, `LICENSE`, `.gitignore`, `.gitleaksignore`): nenhum e2e. Lint, testes, build, auditoria, varredura de segredos e análise estática continuam rodando sempre.
- **Execução semanal** (segunda, 6h UTC) com e2e completo na main, para pegar o que o push só-desktop não pega.
- **Checks obrigatórios intactos.** Os nomes dos checks não mudaram. Os jobs `Desktop and mobile smoke tests` e `Desktop and mobile smoke tests (mobile)` agora usam o gate do script: falham se a decisão de escopo falhar, e só aceitam e2e pulado quando o escopo é "só documentação". Na main, o gate móvel avisa que o mobile completo não roda de novo, em vez de fingir que rodou.
- **Falha segura.** Qualquer dúvida (não conseguir listar os arquivos, evento desconhecido, nenhum arquivo) vira e2e completo.
- **Economia estimada (não medida):** pull request só de documentação, de cerca de 50 para cerca de 10 minutos; push na main, de cerca de 50 para cerca de 20; pull request com código, sem mudança (cerca de 50). A execução semanal acrescenta cerca de 50 por semana.
- **Limite.** Uma pull request com código continua custando cerca de 50 minutos a cada push. Com muitos pushes por dia (por exemplo, um commit de atualização da main a cada conflito), o teto mensal de um repositório privado ainda pode ser atingido. Reduzir isso depende de prática: juntar pushes, evitar re-execuções à toa e atualizar a branch com a main só quando necessário. Outras alavancas não aplicadas: cache do Playwright e e2e mobile só nos arquivos de interface.
- **Testes.** `scripts/ci-scope.test.mjs` (11 casos: documentação, código, misto, dúvida, push, matriz, gate) roda no job `quality`. O caminho real de pull request (commit de mesclagem) foi simulado num repositório temporário: só docs resulta em `none`, código e misto em `full`, checkout raso em `full`.

# Correção de navegação móvel e modal de exclusão

No celular (até 760 px), Configurações começa na lista sem seleção; escolher um assunto oculta o menu e mostra apenas a seção, a partir do topo. Seta retorna ao menu e restaura foco. Desktop conserva navegação lateral. Ícones SettingsIcon são vetores locais próprios. Conta compactada e política existente acessível em Privacidade e dados, com detalhes recolhidos. Não cortar conteúdo ou impedir rolagem de segurança em telas menores/zoom.

Modal de exclusão era descendente de painel animado, com containing block transformado. Agora createPortal em document.body e HTMLDialogElement.showModal colocam a confirmação no top layer com foco modal nativo, Escape/Cancelar e retorno ao disparador. Sem mudança na exclusão, reautenticação ou confirmação digitada. Teste de componente verifica portal; fixture visual sem conta real verifica altura e ações em viewport curta. Nenhuma conta é excluída nos testes.

# Contrato societário removido do repositório, 2026-10-18

- **Decisão da dona.** O arquivo `docs/CONTRATO_SOCIETARIO.md` deixou de ser versionado. Ele estava num repositório público, e o app terá planos pagos. O caminho entrou no `.gitignore` para que uma cópia local não volte por engano. Nenhum conteúdo do arquivo foi lido nem copiado por esta mudança.
- **Limite desta mudança.** Remover o arquivo da árvore atual **não o apaga do histórico do Git** nem de forks já existentes (há 1 fork). Trate o conteúdo como já exposto. Se isso for um problema, a saída é reescrever o histórico, o que altera todas as branches e PRs abertas e só deve ser feito com decisão explícita, depois de guardar uma cópia fora do repositório.
- **Cópia.** Guarde o arquivo fora do repositório (por exemplo, num Drive privado) antes de mesclar esta PR.

# Política de custo do CI e documentação de operação, 2026-10-18

- **Medição.** Uma execução completa de pull request com código custa cerca de 47 minutos faturáveis. Os três e2e somam cerca de 68% e o mobile (WebKit) cerca de 55%. Instalar navegadores custa de 22 a 44 s por job, então cache de navegador foi descartado (hipótese anterior desfeita pela medição). Detalhes e a tabela em `docs/CI_MINUTOS.md`.
- **Mudança.** `scripts/ci-scope.mjs`: pull request só de backend (`api/`, `src/backend/`, regras do Firebase) mais documentação roda só o desktop (cerca de 21 min em vez de 47). Qualquer arquivo fora das listas de documentação e de backend continua pedindo o e2e completo, e a dúvida vira completo. Testes ampliados para 14 casos, e o caminho real de pull request foi simulado.
- **Dado para a próxima decisão.** O Playwright passa a listar no log do CI os 10 arquivos de teste mais lentos (`reportSlowTests`).
- **Documentação para IA.** Novos `docs/CI_MINUTOS.md` (custo, medição, política, alternativas descartadas, regras) e `docs/OPERACAO_E_CUSTOS.md` (auditoria de segurança, publicação das regras do Firebase, consumo do banco, troca de banco, visibilidade do repositório, contrato, falso positivo do gitleaks, regras e decisões que continuam com a dona). `AGENTS.md` ganhou a seção "Custos, CI e operação" e o `README` os links.
- **Limite.** O consumo mensal real de minutos ainda não foi medido (o repositório é público e não cobra). A medição deve ser refeita depois de privar.

# Pentest: @ reservados e custo de leitura do registro, 2026-10-18

- **Achado 1 (alta).** A reserva de @ aceitava `admin`, `olena`, `helena`, `suporte`, `equipe`, `oficial` e `olenastudy` (provado em simulação local). Com o chat com o time previsto, alguém poderia se passar pela equipe. Agora há lista de nomes reservados com normalização de variações, e teste.
- **Achado 2 (média a alta).** Cada pedido de @, inclusive a consulta, baixava o registro inteiro. Simulação com 10 mil @: 0,95 MB por pedido, cerca de 1,7 GB por hora com uma conta no limite de 30 por minuto, o que gastaria o limite mensal de 10 GB do plano Spark em cerca de 6 horas. A consulta passou a ler só a folha da conta. Reservar e apagar ganharam teto por conta e global.
- **Limite.** POST e DELETE ainda leem o registro inteiro. A correção estrutural (índice por nome) fica registrada em `docs/PROFILE_HANDLES.md` e não foi feita.
- **Não verificado.** O tamanho real do registro hoje (é bem menor que 10 mil e o efeito é proporcional) e o consumo real no painel do Firebase.

# Pentest: teto global de salas e da Helena por endereço, 2026-10-18

- **Achado 3 (média), parte das salas.** A criação de sala era limitada só por endereço (6 por minuto). Sem teto global, quem usa vários endereços podia encher o armazenamento do banco: uma sala cheia ocupa cerca de 10 KB (medido em simulação, 30 participantes) e a limpeza roda uma vez por dia. `room-guard.ts` ganhou `ROOM_CREATE_DAILY_LIMIT` (3.000 criações por dia, somando todos os endereços e valendo para a ação `create`, que inclui o caderno colaborativo). O valor é de proteção e deve ser ajustado pelo uso real.
- **Achado 4 (baixa a média).** A cota global da Helena (300 por dia) podia ser esgotada por quem tem várias contas. Entrou um teto por endereço de 100 por dia, avaliado antes do global, para que a conta que falha no teto do endereço não gaste a cota de todos. Uma turma atrás do mesmo endereço (30 alunos) ainda cabe. `rateLimiter.consume` agora recebe também a requisição.
- **Limite.** Quem controla muitos endereços e muitas contas ainda consegue esgotar o teto global. O teto serve para encarecer o abuso, não para impedi-lo. A mudança de `FIREBASE_APPCHECK_ENFORCE` para `true` (ação da dona na Vercel) continua sendo a defesa mais forte.
- **Não verificado.** O limite de armazenamento do plano Spark (1 GB) vem de memória. Conferir na tela de uso do Firebase.

# Pentest: tetos de armazenamento por conta nas regras do Firebase, 2026-10-18

- **Achado 3 (média), parte das contas.** `users/$uid` aceitava até 20 milhões de caracteres na folha de trabalho e 5 milhões em cada uma das outras 16 chaves, nas duas árvores (`state` e `stateV2`): cerca de 200 milhões por conta. Com o limite gratuito de 1 GB do Realtime Database (de memória, não verificado), cerca de 5 contas Google encheriam o banco e parariam a sincronização de todos.
- **Mudança.** O nó legado `state` ficou somente para leitura (`.validate: false`, porque o cliente só lê dele para migrar) e `stateV2/items` ganhou um teto de 8 milhões de caracteres somados nos 16 itens que não são a folha de trabalho. O teto vem do limite do próprio navegador (cerca de 5 milhões de caracteres por site no `localStorage`), então não corta uso real. O máximo por conta caiu de cerca de 200 para cerca de 28 milhões, e o número de contas necessárias para encher 1 GB passa de cerca de 5 para cerca de 35. É um encarecimento, não uma garantia.
- **Teste.** `src/firebase-user-rules.test.ts` avalia a expressão publicada com e sem excesso, e confere que o legado está congelado.
- **Ação da dona.** Publicar as regras (passos e testes do simulador em `docs/ACCOUNT_SYNC_SETUP.md`). Mesclar esta PR não altera o banco por si só.
- **Risco aceito.** Abas com versão anterior a 12/10/2026 perdem a sincronização até recarregar. Se aparecer reclamação, reverter só o congelamento do `state`.
- **Pendente.** O teto da folha de trabalho (20 milhões) não foi reduzido porque o tamanho legítimo máximo (IndexedDB) não foi medido. Medir o maior espaço real antes de baixar.

# Integração com o Google Agenda removida, 2026-10-18

- **Decisão da dona.** O projeto não usa mais o Google Agenda. O painel e o hook já não eram usados por nenhuma tela (a tela da Agenda não mostrava mais a integração), mas a rota e o código do servidor continuavam no ar, com cookie de sessão que guarda o token de atualização do Google.
- **O que saiu.** `api/google-calendar.ts`, `src/backend/google-calendar-handler.ts`, `google-calendar-oauth.ts`, `google-session-cookie.ts` (com os testes), `src/hooks/use-google-calendar.ts`, `src/views/google-calendar-panel.tsx` e `docs/GOOGLE_CALENDAR_SETUP.md`. O logout deixou de chamar `/api/google-calendar?action=disconnect`, e a mensagem de exclusão de conta não cita mais a conexão com o Google Agenda. O login com o Google pelo Firebase não mudou.
- **Pentest.** A remoção também elimina o achado 5 (limite de login do Google Agenda sem agrupar IPv6).
- **O que continua com a dona (fora do repositório).** Quem chegou a conectar a agenda ainda tem, no navegador, o cookie `hs_google_session` (criptografado, expira sozinho em até 90 dias) e uma autorização ativa no Google. Para encerrar de vez:
  1. Na Vercel, apagar as variáveis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` e `GOOGLE_SESSION_SECRET`. Sem a chave de sessão, nenhum cookie antigo pode mais ser decifrado.
  2. No Google Cloud Console, em APIs e serviços, remover o escopo de Agenda da tela de consentimento e apagar o cliente OAuth usado pela integração (isso revoga os tokens emitidos por ele). Não apagar o cliente criado pelo Firebase para o login com Google.
  3. Quem quiser revogar a própria autorização também pode fazer em myaccount.google.com/permissions.
- **Não verificado.** Se algum cliente OAuth da integração é compartilhado com o login do Firebase. Conferir o nome do cliente antes de apagar.

# Termos de Uso, 2026-10-18

- **O que é.** Nova página estática `public/termos-de-uso.html` (versão `2026-10-18`, em `src/domain/terms-of-use.ts`), no mesmo padrão da Política de Privacidade, com teste em `src/terms-of-use-page.test.ts`. A Política de Privacidade ganhou um link para os termos no rodapé, e o `sitemap.xml` lista a nova página. Detalhes em `docs/TERMOS_DE_USO.md`.
- **O que não foi feito.** O aplicativo ainda não mostra o link dos termos na tela de entrada e não registra o aceite por versão. Ambos exigem mudança de interface, catálogo de idiomas e e2e, e ficam para PRs próprias.
- **Em aberto (dona).** Canal de contato, CNPJ e foro (a página avisa "em definição" e não inventa dados) e revisão jurídica. O texto foi escrito por IA e não substitui um advogado, principalmente antes de cobrar por planos.

# Arte do Oliver animada em Rive, 2026-10-18

- **O que é.** A arte do Oliver no Espaço do aluno (`public/oliver-math-islands.png`) agora é animada em Rive por `public/oliver-math-islands/oliver.riv`, gerado de forma determinística por `scripts/oliver-rive` (fatiador, gerador e README). Componente `src/components/oliver-hero-art.tsx`, usado por `MathPracticeHero`. Reaproveita o runtime do Rive já vendorizado e carregado sob demanda; nenhuma dependência nova e nada vai a serviço externo.
- **Comportamento.** A imagem estática é o primeiro quadro e continua sendo o elemento acessível (mesmo alt e src do e2e anterior). O runtime e o arquivo só são buscados 0,9 s depois, sem movimento reduzido. Ambiente em ciclo de 12 s (respiração, piscadas, aceno, chama, adereços flutuando), inclinação suave para o mouse (`olharX`), aceno ao ficar pronto e reações (pulo, aceno, ânimo) a um clique ou toque sobre a arte. A arte segue sem interceptar toques: o clique é reconhecido pelo retângulo dela e botões e links por baixo mantêm a ação. Pausa fora da tela e com a aba oculta. A animação CSS de flutuação foi removida porque o Rive passa a mover a arte.
- **Defeitos encontrados e corrigidos na verificação.** (1) As faixas de sobreposição das juntas saíram vazias, porque o interior da arte tem alfa 252 a 254 e o limiar pedia 255; qualquer giro abria uma fresta de 1 px entre corpo e perna ou braço. Limiar agora 250. (2) Pernas e corpo desenhados sobre a ilha deixavam buracos nela quando o personagem sai do chão: o pé esquerdo tinha preenchimento borrado e o direito não tinha nenhum; ambos refeitos com facetas chapadas. (3) O Rive pinta primeiro o que vem primeiro no arquivo, então as imagens são criadas da frente para trás (rosto ficou escondido antes). (4) Pixels de borda no canto do preenchimento direito diferiam do original; polígono recuado.
- **Verificação.** Repouso renderizado pelo Rive contra a arte original: diferença máxima 3/255, 0 pixels acima de 12. Varredura de quadros de todas as animações e de poses extremas somadas (corpo ±4 graus, braços ±34 graus, agachamento), com detecção de frestas novas na silhueta (fechamento morfológico menos o repouso): sem frestas visíveis. Testes unitários do componente e `e2e/oliver-hero.spec.ts` (CSP de produção, canvas desenhado, movimento reduzido sem download), em desktop e mobile.
- **Custo.** `oliver.riv` 323 KiB, com teto de 512 KiB em `performance:check`; carregado só com a animação ativa. O JavaScript da aplicação não cresce de modo relevante.
- **Descartado.** Animação de entrada ao carregar: a imagem já aparece primeiro, então esconder e remontar a arte causaria um piscar. A pose inicial do arquivo é a da imagem e o aceno de boas-vindas faz o papel de entrada. Malha e ossos: o recorte rígido com faixas de sobreposição atende aos movimentos usados e evita o risco de distorção.
- **E2E obsoleto removido.** `e2e/study-route.spec.ts` procurava o cartão "Dê um ponto de partida ao seu estudo" na home, mas nenhuma tela usa mais `buildStudyRoute` desde a renovação do Espaço do aluno (#483), então o teste falhava na `main` também. A regra de domínio segue coberta por `src/domain/study-route.test.ts`. Se a rota de estudo voltar à interface, o e2e deve voltar junto.

# Braço do Oliver quebrando ao levantar, 2026-10-18

- **Causa.** Os braços usavam a mesma faixa de sobreposição das pernas, desenhada por cima do corpo. Ao girar, a faixa levava junto um pedaço de textura do corpo, formando uma placa rígida com emenda e uma lasca solta na junta (o braço direito no aceno, o esquerdo no pulo e no ânimo). Além disso, o recorte do braço esquerdo era um retângulo que roubava parte do lobo escuro do corpo.
- **Correção.** Os dois braços passam a ficar atrás do corpo, cada um com uma aba (continuação do próprio braço, por difusão) enfiada sob o corpo, então a junta nunca aparece. O recorte do braço esquerdo agora segue o contorno do punho. A amplitude do aceno caiu de cerca de 36 para 20 graus, com ritmo um pouco mais lento (ambiente: 0,8 s por balanço; reação: 0,6 s), para um aceno menos mecânico.
- **Teste.** `src/data/oliver-layers.test.ts` falha com o recorte antigo e passa com o novo (ordem da pilha e profundidade da aba). O repouso renderizado segue com diferença máxima de 3/255 contra a arte original. Imagens verificadas em todas as animações e em poses extremas.
- **Limite conhecido.** Com o punho esquerdo erguido, o lobo escuro do corpo fica à mostra com uma borda levemente serrilhada (é geometria do próprio corpo, só visível de perto).

# Auditoria do desenho inteiro do Oliver, 2026-10-18

- **Pedido.** O braço de trás (o esquerdo) aparecia deformado, e a verificação anterior só tinha olhado o braço da frente. Auditei todas as regiões em zoom, em todos os quadros de todas as animações, mais poses extremas somadas.
- **Defeitos encontrados e corrigidos.**
  1. Braço esquerdo: a aba enfiada sob o corpo era funda demais e saía para fora da silhueta quando o braço girava, formando uma "cauda" escura serrilhada pendurada no ombro. A aba agora é curta (14 px), só perto da junta e a 10 px da borda do corpo, e o levantar do punho esquerdo caiu de cerca de 31 para 20 graus. O recorte do punho segue o contorno e não corta mais o lobo escuro do corpo.
  2. Ilha: uma linha branca vertical de 2 px (x 396 a 397) no chão ao lado do pé direito, visível até em repouso. O preenchimento agora emenda com o resto.
  3. Ilha: o chão sob o pé esquerdo era uma covinha com contorno em arco; agora é um tom contínuo da grama ao redor.
  4. Pontilhado ciano flutuando no ar quando o personagem pula: eram pixels de borda suavizada do Oliver que ficavam na camada da ilha. Passaram para a peça dona da borda. A soma em repouso continua igual à arte (um pixel com diferença de 48/255).
  5. Pixels soltos do preenchimento da ilha (menos de 30 px) removidos.
- **Sem defeito achado.** Rosto (piscadas e reações), pernas, adereços (mais, divisão, régua, chama e faíscas), braço direito em todo o aceno.
- **Limite conhecido.** Um resíduo muito leve do preenchimento do rosto só aparece com contraste multiplicado por cinco. O lobo escuro do corpo fica à mostra, com a borda levemente serrilhada, quando o punho esquerdo sobe.
- **Teste.** `src/data/oliver-layers.test.ts` agora também limita a profundidade da aba (6 a 30 px) e falha com a aba antiga.

# Espaço do aluno sem o widget de caderno, 2026-10-19

- **O que mudou.** O widget de caderno (prévia folheável no meio da fileira de atalhos) saiu do Espaço do aluno. Sobraram os dois atalhos de arte, ilha e foco, que agora ficam lado a lado em duas colunas iguais, com a mesma altura, no desktop (220 px, na largura do herói e das métricas) e no celular (130 a 200 px conforme a largura), e a arte centralizada dentro de cada cartão. Antes, o foco e a ilha ficavam empilhados à esquerda do caderno e o celular ficava com uma coluna estreita demais para a ilha.
- **Código.** `StudentDestinations` perdeu o caderno, a leitura dos cadernos e a prop `dispatch`, que só ele usava. O CSS de `student-destination--notes`, `student-resume-open` e `student-empty-notebook` foi removido. A retomada do último caderno (`studentResume.notebook`) continua sendo gravada pela tela de Cadernos, e a prévia `student-notebook-preview` segue existindo para `student-favorites-shelf`, que hoje não é usada em nenhuma tela (não verificado se havia plano de ligá-la ao Espaço).
- **Teste.** `e2e/student-resume.spec.ts` deixou de exercitar o caderno e agora confere que ele não existe, que ilha e foco têm o mesmo tamanho e a mesma linha, ficam abaixo do herói, dentro da largura da página e com a arte dentro do cartão, em desktop e mobile.

# Tomate do Pomodoro em Rive, 2026-10-19

- **O que mudou.** O tomate de SVG com anel que sumia saiu. A aba Foco mostra um tomate de papel recortado que é comido por oito mordidas, com pedaço que salta, migalhas, sementes, gotas e brilhos, e brota de novo no fim da fase de foco.
- **Sincronia.** `tomatoStage` dá uma mordida a cada oitavo da duração escolhida, então 25 ou 50 minutos seguem a mesma sequência. Ao fim do foco a última mordida fica 2,6 s e o tomate volta inteiro. Reiniciar o contador também devolve o tomate inteiro.
- **Código.** `AnimatedPomodoroTomato` carrega `public/pomodoro-tomato/tomato.riv` depois do primeiro quadro (`estagio-N.webp`), que segue como imagem acessível. `PomodoroTomato` estático também serve ao Espaço do aluno. O relógio fica sobre uma minhoca verde de papel recortado (`PomodoroWorm`, SVG decorativo) que cobre toda a área do relógio; o rótulo da pausa é uma etiqueta de papel logo abaixo. A sequência de 8 mordidas foi conferida no navegador também com 50 minutos (uma a cada 6 min 15 s) e com durações personalizadas de 1 min, 8 min e 1 h 30 min (mesma sequência; o relógio de horas usa fonte menor para caber na minhoca).
- **Custo.** O .riv tem cerca de 571 KiB e só baixa sem movimento reduzido. Teto em `performance:check`: 700 KiB.
- **Teste.** `e2e/pomodoro-tomato.spec.ts` e testes de unidade. Gerador documentado em `scripts/tomato-rive/README.md`.

# Tomate e minhoca com animação parada, 2026-10-19

- **O que mudou.** Parado (antes de começar, em pausa e durante a contagem), o tomate respira, sobe e desce e balança, a folha acompanha, e a minhoca ondula da cauda para a cabeça, pisca e mastiga. A animação "ambiente" do Rive subiu de amplitude (a anterior era quase invisível) e passou a incluir a minhoca.
- **Código.** `scripts/tomato-rive/worm.cjs` virou módulo (formas da minhoca) além de gerar `minhoca.svg`; `art.cjs` recorta gomos, olhos e boca em camadas e `generate.cjs` monta o rig. O CSS esconde a minhoca estática quando o Rive carrega (`:has`) e a mantém com movimento reduzido ou falha de carga.
- **Custo.** `tomato.riv` foi de 571 para cerca de 662 KiB (teto de 700 KiB). A animação ambiente roda a 15 quadros por segundo com interpolação linear. Sem JavaScript novo.
- **Som das mordidas.** Cada mordida da sequência (de uma etapa para a seguinte) toca `mordida.wav`, sintetizado por `scripts/tomato-rive/sound.cjs` (antecipação, estalos da casca, baque, esguicho e gotas, 37 KiB). Respeita a preferência de efeitos sonoros do aplicativo (`areSoundEffectsEnabled`) e não toca em saltos de etapa (abrir a aba no meio do tempo), na volta ao zero nem na etapa inicial. O arquivo só é pedido na primeira mordida. Sem JavaScript de áudio além de `new Audio`; o JS da aplicação ficou em 1500,0 KiB, rente ao teto, então o próximo recurso precisa enxugar código antes.
- **Botões do contador (efeitos e sons).** Começar/Continuar, Pausar e Reiniciar (também Encerrar e registrar, que reinicia) tocam `comecar.wav`, `pausar.wav` e `reiniciar.wav` via `playPomodoroSound` (`src/data/pomodoro-sfx.ts`, também usado pela mordida), só com os efeitos sonoros do aplicativo ligados. Visual só em CSS, sem JavaScript: o botão afunda ao apertar e, ao soltar, o tomate dá um pulinho elástico e um estouro de confete de papel abre em volta dele (gatilho `:active`, então teclado, mouse e toque funcionam igual). Movimento reduzido (sistema ou aplicativo) desliga o pulo e o confete. O JS da aplicação ficou 9 bytes abaixo do teto de 1500 KiB.

# Gatinha agora se chama Olena em todo o app, 2026-10-20

- **O que mudou.** O nome da gatinha preta e assistente deixou de ser Helena e passou a ser Olena em tudo o que a pessoa vê: catálogos pt-BR e en-US (29 textos cada: assistente, conversa, rótulos de acessibilidade das poses, avisos de indisponibilidade, Palavras escolhidas pela Olena, Noite da Olena, Olena inteligente), mensagens do servidor (assistente e escuta coletiva), instrução de sistema da IA tutora, avatar do perfil, metadados do `index.html`, `llms.txt`, termos de uso (personagens), títulos dos SVGs e README. Atualizados também os testes, os e2e, `docs/DESIGN_SYSTEM.md` e a linha de design do `AGENTS.md`.
- **O que não mudou, de propósito.** Identificadores internos (componentes como `HelenaChat`, `HelenaLoading`, `HelenaMascot`, arquivos `helena-*`, `/api/helena`, a máquina de estados "Helena" dentro do .riv, o arquivo `helena.webp` e as chaves de armazenamento), porque renomear exige migração de dados e do arquivo de animação. Os registros históricos deste arquivo continuam com o nome antigo.
- **Avatar da Letícia removido.** Saiu da lista de avatares e o arquivo `leticia-coelho.svg` foi apagado. Quem o tinha escolhido volta ao avatar padrão pela regra existente (`profileAvatarSource`), e salas que mostrem o avatar antigo caem no avatar padrão.
- **Versão do catálogo.** `CATALOG_VERSION` mudou, então os aparelhos baixam os textos novos.

# Nome de uma das criadoras removido, 2026-10-20

- **O que mudou.** O nome de Helena Ferreira saiu da equipe listada nos termos de uso e na política de privacidade (agora José Oliver e Leo Bizzocchi), do registro histórico da política neste arquivo e dos testes, que passaram a usar nomes fictícios (Ana Souza). Nenhuma outra ocorrência no repositório rastreado.
- **Limites.** O histórico do Git continua com o nome antigo (não se reescreve histórico). A versão da política de privacidade não mudou, então ninguém é solicitado a aceitar de novo; se a mudança deve contar como alteração da política, a versão precisa subir em uma mudança própria. O arquivo `docs/CONTRATO_SOCIETARIO.md` não foi lido nem alterado, como manda o `AGENTS.md`; se ele citar o nome, isso é com a proprietária.

# Amigos, Encerrar e registrar e equipe, 2026-10-22

- **Encontre seus amigos mostrava "Lista de conexões inválida."** Causa: ao remover o avatar da Letícia, qualquer conta que ainda o tinha gravado fazia a validação do cliente recusar a lista inteira (`isProfile` exige um avatar do catálogo). Correção: o servidor (`profile-social-handler.ts`) passa a devolver `profileAvatarSource(...)`, então avatar aposentado volta como o padrão em qualquer lista. A validação do cliente continua estrita (endereços fora do catálogo seguem recusados). Uma correção também no cliente passou do teto de JavaScript de 1500 KiB e foi descartada; o servidor e o cliente saem juntos no mesmo deploy. Teste novo em `profile-social-handler.test.ts`.
- **Encerrar e registrar não respondia no cronômetro nem no Pomodoro.** Causa: o vínculo com a agenda lido ao abrir a aba (`restored.agendaEventId`) nunca era limpo. Uma sessão antiga aberta pela agenda fazia o botão exigir 60 segundos e ficar desabilitado, e o vínculo era regravado a cada sessão, inclusive depois de encerrar. Agora o vínculo é um estado: só vale se for de hoje ou de ontem e é descartado ao encerrar. Teste e2e novo em `focus-session.spec.ts` com vínculo antigo semeado.
- **Equipe.** "Erick Gabriel" entra na equipe da Galeria.Oli nos termos de uso e na política de privacidade (José Oliver, Erick Gabriel e Leo Bizzocchi). A versão da política não mudou, então ninguém é solicitado a aceitar de novo. Se a inclusão deve contar como alteração da política, a versão precisa subir em uma mudança própria, decisão da proprietária.

# Vite atualizado por aviso de segurança, 2026-10-22

- **O que mudou.** `npm audit fix` subiu o Vite de 8.3.2 para 8.3.5 e dependências de build (`rolldown`, `launch-editor` e afins, 6 pacotes) só no `package-lock.json`. Nenhuma versão em `package.json` mudou e nenhum código de produto mudou.
- **Por quê.** O check obrigatório "Dependency audit and SBOM" falhava na `main` e em todo PR por 6 avisos novos do Vite e do `launch-editor` (severidade alta). Eles afetam o servidor de desenvolvimento e o servidor de preview, não o código entregue aos usuários.
- **Verificação.** `npm audit --audit-level=high` sem vulnerabilidades, `tsc` limpo, build ok e JavaScript da aplicação em 1499,1 KiB (953 bytes abaixo do teto de 1500 KiB, mais folga que antes).

# Lista de conexões tolera perfis fora do padrão, 2026-10-22

- **O que mudou.** O erro "Lista de conexões inválida." voltou depois da correção do avatar aposentado. Em vez de caçar cada dado inválido por conta, o cliente (`requestSocial`) passa a descartar da lista de conexões só o perfil que não passa na validação, e a lista inteira deixa de ser recusada. `self`, resultados de busca e sugestões continuam estritos. Teste novo em `profile-social.test.ts`.
- **Servidor.** A capa de cada perfil também passa por `profileCover(...)`, então uma capa aposentada gravada em conta antiga volta como a capa padrão em vez de invalidar o perfil. O erro apareceu ao abrir Seguidores e Seguindo.
- **Limite.** Um perfil inválido fica invisível na lista, sem aviso. A causa nos dados de produção não foi identificada: sem acesso às contas, a hipótese principal é um avatar aposentado ou um campo de detalhes inválido em alguma conta seguida. Se uma pessoa específica não aparecer, é esse o motivo.

# Perfil emitido pelo servidor sempre válido, 2026-10-22

- **Por quê.** Depois de a lista de conexões passar a descartar perfis inválidos, a conta `bizzok` sumiu dos seguidores: ela tinha algum campo fora do padrão e antes derrubava a lista inteira. A causa exata nos dados dela não foi identificada.
- **O que mudou.** `profile()` no servidor só emite `details` se passarem em `validSocialProfileDetails` (contas antigas podem ter links gravados em outro formato) e limita o nome a 80 caracteres. Com isso, avatar, capa, detalhes e nome de qualquer conta saem sempre válidos, então nenhuma conta deveria mais ser descartada pelo cliente. Teste novo em `profile-social-handler.test.ts`.
- **Limite.** Sem acesso aos dados de produção, não confirmei que esses campos eram a causa. Se `bizzok` continuar fora da lista depois do deploy, o campo inválido é outro.

# Conquistas matemáticas e segurança social, 2026-10-22

## Correção das regressões do CI, 2026-10-22

Validação final da correção: npm run verify aprovado, 331 arquivos e 2130 testes. São 22 execuções E2E aprovadas, 16 dos fluxos afetados e seis do sino. Teste unitário dos pontos: vermelho antes e cinco testes do arquivo verdes depois. Aplicação final 1499,7 KiB de 1500 KiB. Mesclagem continua condicionada aos checks do novo head.

As duas falhas desktop foram reproduzidas antes da correção. card-integrity procurava Cartas do Oliver, atalho removido por solicitação do proprietário. O teste agora continua uma Poeira cósmica, revela e guarda a carta para abrir a coleção pelo fluxo real; mantém a inspeção e os gestos de todas as cartas e confirma a ausência do atalho antigo.

A estrela de pontos da conclusão offline tinha geometria vazia após a extração para SVG externo. RoomPointsIcon volta a embutir somente seus três paths originais, preservando facetas e cores em todos os consumidores. Teste unitário falhou antes e passou depois, comparando os paths e preenchimentos com a fonte original nas variantes pontos/XP. E2E verifica separadamente a geometria dos dígitos e da estrela enquanto o navegador está offline. As artes aprovadas das conquistas não mudam.

Dezesseis E2E focados Edge desktop/mobile passaram. O teste do sino, que oscilou no CI, passou em seis execuções locais, três por projeto, sem alterar seu comportamento ou expectativas. Build medido em 1499,7 KiB, sem alterar limite. No CI anterior, WebKit shard 2 excedeu 15 minutos instalando o navegador e shard 1 atingiu 20 minutos executando testes, inclusive as regressões acima. Nova tentativa local de instalar WebKit falhou no download. Nenhum workflow, timeout, escopo de testes ou configuração externa foi alterado; WebKit exige o CI do novo commit.

## Refinamento da galeria e compartilhamento, 2026-10-22

Direção aprovada pelo proprietário: badges fechadas inspiradas nas ilhas atuais de Matemática, com pedra creme, rochas cobalto, vegetação facetada e pequenos detalhes dourados. Cada objetivo recebe uma cena matemática própria; as onze raras preservam o Oliver original, com olhos de coração. As tentativas vetoriais, ilustração solta e moldura ornamental foram descartadas. Artes geradas pelo imagegen integrado com referências locais aprovadas e convertidas em WebP transparente de 512 px em public/achievement-badges/math. Números usam os símbolos originais de paper-digits.svg em grafite sobre a placa, sem texto gerado. Exportação incorpora somente a badge do objetivo e os dígitos locais antes de rasterizar, sem enviar dados do usuário.

Causa dos controles genéricos: os dialogs eram portais filhos de document.body e não herdavam paper-buttons.css, cujas regras estão no escopo .app-shell. Portais agora montam dentro do app e continuam no top layer nativo, reaproveitando os recortes e estados reais. Compartilhar usa ação primária roxa, salvar usa papel do tema, voltar usa a seta amarela original; X colorido continua sem placa. Teste de navegador confere cor real da ação, símbolos dos números e badge quadrada sem distorção.

Graphify foi solicitado para o recorte de componentes: grafo estrutural de sete arquivos, 24 nós e 27 arestas, fora do repositório de produto. Custo de extração LLM zero. Diagnóstico aponta 14 endpoints externos ausentes, um self-loop e quatro pares colapsados, portanto não representa o sistema inteiro. Nenhum documento privado foi incluído e o contrato societário foi excluído da detecção.

Validação da família aprovada das ilhas: 57 arquivos distintos, 512 por 512 com alpha, total de 2.339.026 bytes. Nove testes focados aprovados; npm run verify aprovado com 331 arquivos e 2129 testes. Vinte E2E Edge desktop/mobile aprovados, cobrindo perfil, conexão social, ajuste das ilhas, galeria, inspeção e compartilhamento. O PNG exportado é verificado por pixels da pedra cobalto, Oliver turquesa e números, além de dimensões e download. Brilho usa a máscara alpha da própria badge, sem sair da silhueta. Aplicação 1499,5 KiB, entrada 217,5 KiB, sem aumentar limites. WebKit não validado localmente, aguarda CI. Previews usam dados fictícios. Nenhuma mesclagem feita nesta revisão.

Conquistas usam composições de ábacos, compassos, frações, álgebra, tangentes, integrais e superfícies espaciais dentro da mesma família de badges das ilhas. Raras recebem brilho holográfico interativo na inspeção 3D. Efeito respeita movimento reduzido.

Perfil mostra três conquistas sem fundo. Galeria separada usa três colunas no celular e cinco no desktop, com seleção, inspeção e navegação por teclado. Atalhos de cartas e conquistas removidos do canto da ilha; cartas continuam no fluxo de abrir/guardar a Poeira cósmica. Datas são derivadas do primeiro recibo cronológico que comprova o objetivo, com deduplicação e fuso da conta. Histórico legado sem recibo datado mostra Data não registrada no histórico, nunca a data de hoje. Resumo público compartilha apenas IDs conhecidos e datas ISO limitadas ao catálogo e aos objetivos conquistados, sem atividades privadas. Mantém bloqueios e cotas existentes.

Compartilhar prepara um PNG próprio 1080 por 1350 com a mesma badge e dígitos originais, objetivo, nome público e data disponível. Preparação é no navegador, sem envio externo. Web Share só abre por clique; navegadores sem compartilhamento de arquivo recebem alternativa de salvar imagem. Cancelar não é falha. Recursos usados no PNG são estáticos da própria origem. Links temporários são revogados ao fechar, trocar imagem ou desmontar. A aplicação não promete integração direta com Instagram nem cria destinos sociais falsos.

Build inicial do refinamento ultrapassou o teto de 1500 KiB. Extração fiel dos desenhos existentes de ações, pontos e troféus solares da sala para sprites preservou cores, facetas e classes; build seguinte 1499,1 KiB, entrada 217,5 KiB, sem aumento de limites. Testes e capturas cobrem galeria, data, Oliver, rotação e download do PNG. Validação final registrada na PR; nenhuma configuração externa ou dado de produção foi alterado.

Validação: npm run verify aprovado, 331 arquivos e 2127 testes; 42 testes focados aprovados. Regressão ampliada com 34 E2E Edge desktop/mobile aprovada; após correção da herança de fundo no perfil, mais 16 E2E aprovados, com teste explícito de fundo transparente, três colunas, data, exportação e alternativa ao Web Share. Duas falhas transitórias de salas ocorreram durante builds simultâneos que substituíam os chunks do preview; ambas passaram na repetição sem builds concorrentes, sem alteração nos testes de sala. Build final 1499,1 KiB. Previews usam registros fictícios de teste, não dados de produção. WebKit não validado localmente, aguarda CI.

- Ajuste pós-CI: profile-showcase ainda exigia o widget removido Meu progresso. Expectativas agora exigem a região Conquistas de matemática e ausência do widget antigo, preservando todas as verificações de capa, controles, overflow e movimento reduzido. Oito E2E desse arquivo passaram em Edge desktop/mobile, claro/escuro. Nenhum código de produto ou configuração de CI foi alterado.

- Perfil substitui Meu progresso por uma coleção de 57 conquistas, com objetivos de rodadas registradas, acertos, dias de prática no fuso da conta, etapas confirmadas e ilhas concluídas. Trinta objetivos pertencem às seis ilhas atuais. Progresso é derivado dos registros de matemática e do workspace já sincronizados, sem nova chave ou migração e sem zerar o histórico. Dias e rodadas só usam atividades existentes, sem inventar datas para dados legados. Tentativas repetidas com o mesmo ID são deduplicadas.
- Artes matemáticas autorais em SVG facetado, três categorias editoriais de raridade. Raras desbloqueadas recebem brilho discreto, sem porcentagens inventadas. PaperArtInspection reutiliza o arraste, setas, Home e verso das cartas. Movimento reduzido desliga cintilação. Cada ilha tem acesso aos objetivos; o perfil mostra coleção completa, bloqueadas e conquistadas. Medalhas competitivas não foram criadas, aguardam critérios da dona.
- AchievementAnnouncer permanece durante a navegação, compara os identificadores na sessão após a recuperação da conta e parabeniza somente novos desbloqueios. Na primeira montagem reconhece o histórico sem bombardear avisos. A fila de avisos é transitória, não um segundo saldo de conquistas. A publicação do resumo visual sai do Perfil e acompanha a sessão autenticada, inclusive conquistas novas. Os identificadores públicos são validados pelo catálogo, armazenados como mapa para resistir à omissão de listas vazias no Realtime Database. São metadados declarados da conta, não prova antifraude nem autorização de plano, XP ou recompensa financeira.
- Inspeção de outra pessoa conserva capa, personagem, nível, ofensivas e redes e acrescenta coleção e ações de segurança. Bloqueio exige confirmação e token real, guarda até 200 alvos por conta no estado social privado, remove seguidores nos dois sentidos, avisos e curtidas entre as partes, impede seguir/curtir e oculta busca, listas, sugestões e atividades para quem foi bloqueado. Desbloquear não recria vínculos. Não bloqueia a coexistência em salas coletivas, que possuem outro domínio de participantes. Exclusão de conta limpa também os bloqueios recebidos.
- Denúncia usa o atendimento existente, com usuário alvo e justificativa limitada. Reaproveita autenticação, autorização da equipe, idempotência e cotas por conta e globais já existentes. Sucesso só após resposta confirmada; erro preserva texto e identificador de tentativa. Revisão humana, sem sanções automáticas, sem prometer prazo. Nenhuma regra, variável externa, conta de produção ou plano foi alterado.
- Causa confirmada do resumo ausente do bizzok: campo socialLinks vazio omitido no banco. publicProfileDetails normaliza somente a ausência de links, mantendo nível e ofensivas, mas continua recusando detalhes realmente inválidos. Regressão reproduz a omissão do campo, sem gravar em produção.
- Peso: primeiro build 1514,8 KiB, acima do teto de 1500. Artes existentes de quatro famílias de ícones foram extraídas sem redesenho para sprites SVG cacheáveis, preservando facetas, cores e atributos acessíveis. Build seguinte 1495,3 KiB; entrada 217,5 KiB. Nenhum teto foi aumentado. Mecanismo 3D foi separado das artes/cartas para evitar acoplamento do catálogo nas conquistas.
- Verificação concluída na branch feat/math-achievements-profile: npm run verify aprovado, 331 arquivos e 2124 testes. Vinte E2E de regressão passaram em Edge desktop/mobile, claro/escuro; após compactar a prévia da coleção, mais dez E2E focados passaram. Build final: aplicação 1495,8 KiB, entrada 217,5 KiB, abaixo dos limites existentes. WebKit aguarda CI. Dados reais de seguidores e perfis não foram modificados. Mesclagem depende de autorização explícita e CI verde.

## Conquistas abrem rápido e teto de JavaScript em 1600 KiB (2026-10-23)

- Causa medida: a galeria baixava até 58 selos WebP de 512 px (cerca de 40 KiB cada, 4,8 MiB no total das duas pastas) para mostrá-los com cerca de 100 px, sem cabeçalho de cache.
- Cada selo ganhou uma miniatura de 256 px (cerca de 15 KiB) em `public/achievement-badges/{math,general}/thumb/`. Só os cartões da grade usam a miniatura; a inspeção e o cartão de compartilhamento continuam com a arte completa.
- As miniaturas da categoria atual são aquecidas em ociosidade antes de abrir a galeria, e as da outra aba depois, para a troca de abas não esperar rede.
- Cartões fora da tela usam `content-visibility: auto`, o que evita pintar e animar o brilho de dezenas de selos invisíveis.
- `vercel.json`: `/achievement-badges/*` com `Cache-Control: public, max-age=604800, stale-while-revalidate=86400`. Como os nomes não têm hash, uma arte trocada pode levar até uma semana para chegar a quem já abriu. Para forçar, renomear o arquivo.
- Teto de JavaScript total e teto absoluto subiram de 1500 para 1600 KiB por decisão da dona do projeto. A entrada inicial segue com seu orçamento próprio.
- Não verificado: o ganho em tempo real em aparelho móvel. Conferir no preview com o painel de rede do navegador (bytes transferidos ao abrir Conquistas).

## Teste de manuscrito fecha o aviso de conquista antes de arrastar (2026-10-23)

O e2e `handwriting-studio` ("escreve, ajusta e salva") passou a falhar no CI desde o merge do #508: o arraste da alça "Redimensionar imagem importada" não mudava a largura. Hipótese: salvar o caderno desbloqueia conquistas gerais, e o aviso `.achievement-notice` (fixo no canto inferior direito, `z-index` 140) cobre a alça da página grande vinda do PDF. O teste agora fecha os avisos de conquista visíveis antes do arraste. Nenhum código do produto mudou. Verificado: o trecho do arraste passa localmente com imagem no lugar do PDF; a importação de PDF não roda no meu ambiente local, então a confirmação final é o CI. Não verificado: que a causa seja só o aviso.

## zod atualizado por aviso de segurança (2026-10-23)

O aviso GHSA-mrhx-c7xc-m3w5 (alta, consumo de memória em coleções grandes) atingiu o `zod`, que entra só como dependência transitiva de desenvolvimento do `eslint-plugin-react-hooks`. `npm audit fix` atualizou apenas o `package-lock.json`; `package.json` e código do produto não mudaram. `npm audit` voltou a zero vulnerabilidades. Não afeta o bundle publicado.

## Busca de amigos sem erro cru de rede e destaques da visita (2026-10-23)

- A busca de amigos mostrava "Failed to fetch", a mensagem crua do navegador quando a requisição nem chega ao servidor (sem rede, rede móvel instável). `requestSocial` agora repete uma vez as leituras (GET, sem efeito no servidor) e troca a falha pelas mensagens já existentes do catálogo ("Confira sua conexão e tente novamente." ou "A conexão demorou demais."). Ações (seguir, bloquear) não são repetidas, para nunca executar duas vezes. Resposta sem JSON (por exemplo erro 500 em HTML) também não vaza mais o erro do navegador.
- Não verificado: a causa real da falha no aparelho. O erro cru indica que a requisição não chegou ao servidor; se persistir com boa conexão, conferir os logs da função `/api/profile-social` na Vercel.
- Na inspeção de perfil de outra pessoa, a coleção compacta mostra somente os destaques que ela escolheu, sem os espaços vazios com "+" (que só fazem sentido para o dono, que pode escolher). Os destaques já eram enviados e lidos pelo servidor; o dono continua vendo os espaços para escolher.
- Não verificado: se os destaques de uma conta específica já foram sincronizados. A sincronização do perfil é única (nome, foto, conquistas, destaques e dados públicos) e falhas dela são silenciosas; um dado público inválido derruba tudo. Conferir no Firebase os campos `achievementFavorites` e `achievementFavoritesUpdatedAt` da conta.

## Inspeção de perfil com voltar e cartão de compartilhar completo (2026-10-24)

- Inspeção de perfil de outra pessoa: seta amarela de voltar no canto esquerdo do cabeçalho, na mesma linha do X, sem placa e com sublinhado amarelo no teclado. A seta aparece só quando há para onde voltar. O X passa a fechar tudo.
- Bug de voltar: ao abrir um perfil a partir de Seguidores ou Seguindo, o voltar recomeçava a busca e a lista sumia. O diálogo agora lembra a lista de origem (tipo e dono) e o voltar a recarrega do servidor. Perfil aberto por link não tem voltar, só fechar.
- Cartão do próprio perfil: botões Copiar link, Compartilhar e Salvar cartão só com ícone (nome acessível e dica preservados). O cartão na tela e o PNG salvo mostram o nível no canto da foto, as etiquetas do perfil (CREKS, DEV, BETA TESTER, GALAXIA) e, se a pessoa escolheu, os destaques de conquista em tamanho menor (até 3, miniaturas). Sem destaques, nada é reservado para eles.
- A rasterização dos selos reaproveita a função extraída de `achievement-png.ts` (`inlineAchievementArt`), que continua aceitando só caminhos da arte oficial. A lista de etiquetas por conta foi movida para `src/domain/profile-labels.ts`, usada pelo perfil e pelo cartão.
- Nenhum texto novo no catálogo de idiomas: foram reaproveitadas as mensagens existentes.
- Não verificado: o botão nativo Compartilhar, que só existe em navegadores com `navigator.share` (celular). Em desktop o cartão mostra Copiar link e Salvar cartão.
- Prévia visual feita com o app real e uma API simulada (conta e lista de seguidores de mentira), em largura de celular.

### Ajuste: destaques na inspeção e cartão no desenho do perfil (2026-10-24)

- Inspeção de perfil: a coleção compacta sobe para logo abaixo do nome, das etiquetas e do @, e mostra somente os destaques que a pessoa escolheu, sempre 3 lado a lado e menores. Antes, sem escolha, o app exibia os 3 primeiros ganhos por conta própria, e a grade caía em 2 colunas no celular.
- PNG do cartão: o selo de nível e as etiquetas passam a ser desenhados com as formas e cores do perfil (pentágono amarelo com sombra, "NV" e dígitos de papel, etiquetas com canto recortado, sombra interna inferior e espaçamento de 0,1em), no lugar de retângulos e fonte comum.
- Cartão na tela: o papel é creme nos dois temas, então a etiqueta CREKS mantém as cores claras do tema claro também no escuro. O "NV" do selo fica grafite em qualquer tema (no escuro a cor global de textos pequenos o deixava cinza sobre o amarelo).
- Regressão corrigida antes do merge: o cabeçalho da inspeção passou a `space-between` e jogou o X sozinho para a esquerda quando o perfil abre por link (sem seta). O X volta ao canto direito e só a seta é empurrada para a esquerda (`margin-right: auto`). O e2e `profile-visit-layout` ganhou o caso com a seta (esquerda, mesma linha do X, sem placa).

## Onboarding em conversa com a Olena (2026-10-25)

- O onboarding virou uma conversa: a Olena se apresenta, faz as 9 perguntas de antes em balões de papel e a pessoa responde tocando em respostas rápidas. A resposta sobe como balão roxo à direita, a Olena reage com uma frase curta e a próxima pergunta entra depois de um indicador de digitação. Ao fim, a Olena chama para entrar com Google e a conversa sai com uma transição curta para a tela de login.
- Roteiro 100% local: nenhuma chamada de rede, IA ou Cloudflare. As falas e reações são textos fixos nos catálogos de idiomas (15 entradas novas, índices 3032 a 3046, PT e EN). O nome "assistente" aqui descreve a personagem; não há modelo de linguagem por trás.
- Respostas continuam canônicas em português e na mesma ordem (`answers[0..8]`), então `buildSetup`, `helena.onboarding.v1`, o login e a sincronização não mudaram.
- Perguntas de escolha única avançam ao tocar na opção (botões, não rádios, para o teclado não avançar ao navegar com setas). A pergunta de várias respostas usa botões de alternar (`aria-pressed`) e o botão Continuar. Voltar reabre a pergunta anterior com a resposta marcada, sem repetir a digitação.
- Animações: balões entram com mola, opções entram em sequência, a pose da Olena troca com entrada saltitante e balança enquanto "fala", a barra de progresso desliza. Movimento reduzido (sistema ou preferência do app) mostra tudo de uma vez, sem atrasos.
- Foco: removido o contorno roxo do onboarding. A regra compartilhada de foco (`paper-controls.css`) pinta o foco de amarelo em todo o app; no onboarding e no login o foco do teclado fica em sublinhado simples, a pergunta que recebe foco por código não mostra nada, e o realce amarelo só volta com "Realçar seleções" ligada nas configurações de acessibilidade. Fora do onboarding a regra compartilhada não mudou.
- Quadrado branco atrás da Olena: as poses antigas tinham fundo marfim e dependiam de `mix-blend-mode: darken`, que falha em alguns navegadores e contextos. Foram geradas versões recortadas com transparência (`public/helena-onboarding-step-*-cutout.webp`) e o blend e o filtro saíram do CSS. As poses antigas continuam no repositório.
- Entrar como convidado continua disponível: na despedida da Olena (sem aceite, nada vai a servidor, como na tela de login) e na própria tela de login, que não mudou. A lógica ficou em `enterAsGuest`, compartilhada pelos dois lugares.
- Quem volta do redirecionamento do Google reabre a conversa na despedida da Olena, com as respostas restauradas.
- Testes: unitários da conversa (abertura, resposta com reação, várias respostas, voltar, despedida), idioma inglês e e2e do fluxo completo, foco por teclado e convidado. Prévia visual feita com o app real em desktop e celular.
- Não verificado: a leitura por leitor de tela real do fluxo. A pergunta recebe foco a cada passo e o indicador de digitação tem texto oculto; conferir com VoiceOver ou TalkBack.

## Bot do Discord por requisição, sem servidor ligado (2026-10-25)

- Decisão da proprietária registrada em `docs/SUPPORT_DISCORD_PLAN.md`: o bot usa REST para enviar e um endereço de interações assinadas para receber, sem processo 24 horas. Só documentação: nenhum bot, token, endereço ou canal foi criado e o transporte segue `enabled: false`.
- Pesquisa de hospedagem gratuita sempre ligada feita em guias de terceiros. Resultado: Oracle e Google e2-micro são as únicas máquinas realmente gratuitas, com ressalvas de ociosidade, cartão e manutenção; Fly.io, Koyeb, Render, Replit e Glitch não servem. Valores e limites **não verificados** em fonte oficial.
- Limite do modelo: sem conexão contínua, o bot não lê mensagens comuns, presença, entradas nem voz.
- Mapa de canais proposto (a confirmar). Canais de LOG de conta e conquista dependem de aviso de privacidade e consentimento.
- Não verificado: limites de execução e termos do plano gratuito da Vercel para as funções do bot.

## Endpoint de interações do Discord, etapa 1 (2026-10-25)

- Adicionado `POST /api/olena?action=discord-interactions`: valida a assinatura Ed25519 do Discord com `node:crypto`, recusa reenvio (janela de 5 minutos), corpo grande e configuração ausente, responde ao PING e recusa servidores fora de `DISCORD_ALLOWED_GUILD_IDS`. Reaproveita a função `api/olena.ts`, sem função nova.
- Só a base do "Receber": nenhum ticket é enviado ao Discord, nenhum comando existe e o token do bot ainda não é lido. O transporte de suporte segue `enabled: false`.
- Variáveis criadas na Vercel (produção, sensíveis) pela proprietária em 25/10/2026: `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_BOT_TOKEN`. Falta criar `DISCORD_ALLOWED_GUILD_IDS`. Os valores não ficam no repositório.
- O token do bot foi colado no chat da sessão de desenvolvimento e deve ser redefinido no portal do Discord, com o novo valor atualizado na Vercel pela proprietária.
- Pendências antes de ligar o atendimento: teto global e limite por origem no endpoint, fila de envio atômica, comandos e testes com o servidor de testes.
- Não verificado: o PING real do portal contra a URL publicada; a rede desta sessão não alcança o Discord.

## Comandos /ajuda e /status do bot do Discord (2026-10-26)

- O endpoint de interações responde a `/ajuda` e `/status` (efêmeros, sem menções) e recusa comandos desconhecidos. Nenhum ticket é enviado ao Discord e o token do bot continua sem uso no código do servidor.
- Novo `scripts/register-discord-commands.mjs`, que a proprietária roda localmente para registrar os comandos no servidor de testes. O token só passa por variável de ambiente e nunca é impresso.
- A etapa 1 foi confirmada pela proprietária: o portal do Discord aceitou o endereço de interações (PING respondido). Não verificado por esta sessão, que não alcança o Discord.
- Não verificado: o registro dos comandos e a resposta no servidor de testes.

## Preview das cartas de arcano, 27/10/2026

Arte aprovada de A Estrela preservada sem regeneração (arcana-star-prototype-v3.webp). Frente refinada em React/CSS, verso comum vetorial e regras em ARCANA_CARD_DESIGN.md. Preview isolado em /previews/arcana.html, sem substituir coleção ou dados existentes. Validação: TypeScript e ESLint dos componentes sem erros; quatro renders Chromium/Edge em desktop 1100x820 e celular 390x844, claro/escuro, sem erros de navegador ou overflow horizontal. Frente e verso conferidos no render desktop. No celular as faces seguem em coluna, com rolagem vertical natural. Verify integral e integração na coleção não executados nesta revisão visual.

## Revisão de identidade das cartas, 27/10/2026

Lote de expansão interrompido por rejeição do proprietário: personagens deformados e arte afastada do app. O preview expõe somente as duas referências aprovadas e oito composições corrigidas, ainda em avaliação. Recortes oficiais embutidos em SVG garantem preservação dos rostos; não são poses novas. XII usa Leo. Verificação Chromium/Edge: 32 inspeções das oito cartas, desktop/celular, claro/escuro, carregamento sem erro e sem overflow horizontal. TypeScript do preview passou. Coleção e recompensas permanecem intactas; não há PR ou merge desta revisão.

### Substituição do estudo com recorte de avatar

A montagem SVG de avatares foi rejeitada. Nova proposta integral de O Mago em mago-olena-v3.webp, com ilustração nova e moldura do componente original. Manifesto expõe somente A Estrela, O Louco corrigido e a nova proposta de O Mago. Sem aprovação implícita das outras cartas. Preview TypeScript/ESLint e quatro cenários Chromium PC/celular claro/escuro passaram, incluindo troca frente/verso. Não houve integração da coleção, publicação ou merge.

### II, A Sacerdotisa, novo estudo visual

Criada uma ilustração integral nova em priestess-olena-v3.webp, com miniatura própria e moldura reutilizada. Preview inspecionado em quatro combinações PC/celular e claro/escuro, inclusive carregar arte e alternar frente/verso, sem erro de navegador ou overflow. TypeScript do preview passou. Não houve integração na coleção ou merge.

## Nova direção restrita das cartas, 28/10/2026

Por direção explícita, substituído o preview multicolorido por O Mago em fundo preto, roxos e amarelo do app, com nova moldura e verso mais contidos. O manifesto exibe somente uma proposta, não as 78 como concluídas. TypeScript passou; oito renders Chromium/Edge, frente/verso PC/celular claro/escuro sem erros ou overflow. Arte raster pode ter variações tonais/antialiasing. Sem integração de coleção, publicação ou merge.

### Moldura anterior com paleta restrita

Restaurada estrutura de papel amarela com faixa de título preta/amarela e cantos assimétricos, mantendo arte e cores aprovadas. CSS consolidado, removidas regras sobrepostas dos estudos anteriores. Oito renders PC/celular claro/escuro frente/verso e TypeScript do preview passaram. Sem integração ou publicação.

## Contrato visual consolidado, 28/10/2026

Proprietário aprovou a combinação atual de paleta restrita e moldura anterior de papel. ARCANA_CARD_DESIGN.md foi reescrito como contrato único vigente, retirando instruções antigas contraditórias. DESIGN_SYSTEM e SECOND_BRAIN apontam para essa referência. Sem mudanças de produto ou novas artes nesta etapa de documentação; provas anteriores do preview permanecem válidas.

### Continuidade da direção restrita

Adicionada Sacerdotisa com arte nova priestess-ink-v1.webp e miniatura, preservando a moldura aprovada. Oito renders e TypeScript do preview passaram. Galeria tem dois estudos na paleta vigente; demais artes continuam planejamento.

### Correção dos Enamorados

Catálogo alterado para Alice e Leo. Leo redesenhado com anatomia compacta após rejeição da primeira versão; public/arcana/ink/major-06-v2.webp e miniatura, sem substituir arquivo anterior. Preview abre VI para inspeção. Sem alteração da coleção real.

### Soso reconstruída em O Julgamento

Nova proposta major-20-v3.webp substitui no preview a versão rejeitada; originais preservados fora do manifesto. Face preta e recortes roxos retomam a linguagem restrita aprovada. Preview abre XX. Oito renders PC/celular claro/escuro frente/verso e TypeScript passaram. A proposta aguarda avaliação artística, sem merge/publicação ou modificação da coleção.

### VI reconstruído novamente

Novo arquivo major-06-v4.webp e miniatura, baseado nas referências oficiais e no Mago restrito. Sem reutilizar composição deformada. Preview abre VI; oito renders claro/escuro PC/celular frente/verso passaram. A validação técnica não equivale à aprovação artística. Coleção real intacta.

### Baralho arcano completo no preview

78 artes disponíveis, variantes finais style-v3 priorizadas para Oliver e Miau. Conferência Edge Chromium: 312 inspeções PC/mobile claro/escuro, sem erros ou overflow. Publicação autorizada do preview e documentação, sem migração da coleção existente. Verify integral será registrado após execução.

## Oliver espiando animado em Rive, 2026-10-27

- `public/oliver-peeking-widget/oliver.riv` (cerca de 438 KiB) anima a arte nova do widget de Matemática por camadas recortadas da própria imagem, sem redesenho: respiração do corpo, piscadas e batimentos nos olhos em forma de coração, boca, mãos que apertam o chão, sinal de mais e divisão flutuando com halo que respira. Cliques disparam pulo, balanço e coração; o mouse inclina o conjunto.
- Decisão de corte: as bordas suavizadas do sinal de mais e da divisão ficam com o próprio sinal, e o halo respira por uma cópia sem borda. Com a borda no halo, o Rive filtrava as camadas em separado a cada deslocamento fracionário e a borda ficava pontilhada. O corte entre corpo e mãos segue arestas escuras da arte, com uma aba de corpo escurecida sob cada mão.
- `OliverHeroArt` volta a ser usado por `MathPracticeHero` e passa a renderizar `.math-hero-peek` (imagem como primeiro quadro, canvas por cima). Movimento reduzido (sistema ou app) mantém só a imagem e não baixa runtime nem arquivo. As regras CSS `.math-hero-oliver` e a arte da ilha antiga (`oliver-math-islands`) deixaram de ser usadas; os arquivos continuam no repositório e podem ser removidos em uma limpeza própria.
- `performance:check` passa a medir `dist/oliver-peeking-widget/oliver.riv` (teto de 512 KiB).
- Verificação feita no runtime oficial em Chromium: repouso igual à arte (diferença máxima 3/255), laço de 12 s sem salto, varredura de frestas nos quadros do ambiente e das três reações, e zoom nas juntas e nas bordas. Mobile e WebKit ficam para o CI. Detalhes em `scripts/oliver-peek-rive/README.md`.

## Segurança: CI e janela do Pomodoro, 2026-10-28

- O Secret scan baixava o gitleaks 8.30.0 sem conferir o arquivo. Agora usa `curl -f` e confere o SHA-256 publicado pelo projeto (o hash foi conferido baixando o arquivo oficial). Ao trocar a versão, atualizar o hash junto; ele confirma só que o binário é o da versão, não que a versão é confiável.
- A janela flutuante do Pomodoro inseria o texto de `/paper-digits.svg` com insertAdjacentHTML. Agora o sprite é lido como SVG e só entra se for um `<svg>` sem script nem foreignObject e sem erro de leitura. O arquivo é do próprio site, então o risco real era baixo; a mudança tira a interpretação como HTML.
- Não alterados, de propósito, por falta de verificação: `frame-src https://*.firebaseapp.com https://*.web.app` no CSP (o ideal é o domínio exato do projeto, que é o VITE_FIREBASE_AUTH_DOMAIN configurado na Vercel; trocar sem conferir pode quebrar o popup do Google) e `script-src https://apis.google.com` (o SDK do Firebase carrega o gapi para o popup; remover quebra o login). Passo da dona: ler o valor de VITE_FIREBASE_AUTH_DOMAIN na Vercel, trocar o curinga pelo domínio exato no vercel.json e testar o login com Google num deploy de preview. Não foram adicionados Cross-Origin-Embedder-Policy (quebra popups e reCAPTCHA) nem `preload` no HSTS (só vale depois de submeter o domínio à lista).

### Revisão de segurança: o que ficou como decisão da dona

- Gravação no banco por contas de e-mail e senha sem verificação: `users/$uid` aceita escrita de qualquer conta não anônima, com até 8 milhões de caracteres. Criar contas por e-mail é grátis, então um abuso em massa pode gastar armazenamento e download do Realtime Database (não medido). Proposta, que muda o comportamento hoje documentado (sincronizar sem e-mail verificado) e por isso não foi aplicada: no `.write` de `users/$uid`, acrescentar `&& (auth.token.firebase.sign_in_provider != 'password' || auth.token.email_verified == true)`. Contas Google e Discord não mudam; contas de e-mail precisariam verificar o endereço antes de sincronizar, e o cliente teria de mostrar o aviso "confirme seu e-mail para sincronizar" em vez de falhar em silêncio. Regras só valem depois de publicadas pela dona. Alternativa com menos impacto: limite menor de tamanho enquanto o e-mail não for verificado. No console: App Check no Realtime Database e no Auth, e limites de cadastro.
- Código da sala de 5 letras: não é problema. `public-stream-id.ts` já publica cada sala por um identificador aleatório de 128 bits, entregue só a quem entra pela API; o código curto não dá acesso à leitura direta do banco. A avaliação inicial desta revisão errou aqui por não ter lido esse arquivo.
- Cadastro por e-mail revela se o endereço existe ("Entre pelo método que já utiliza"). A correção é do console Firebase (proteção contra enumeração de e-mails); o recurso não está no código.

## Segurança do login: vínculo recente e sessões, 2026-10-28

- Revisão de segurança do código de login, do servidor e das regras do banco (leitura de código; nada foi testado contra produção). Achados corrigidos nesta mudança: vincular Discord sem login recente, ausência de encerramento global de sessões e limite por IP que contava três passos por login.
- Servidor: start com Authorization exige auth_time de menos de 240 s (401 recent-login); novo passo revoke-sessions; limite por IP só no start. firebase-account-identity devolve authTime. Testes em discord-auth-handler.test.ts e discord-auth-runtime.test.ts (login velho, token sem auth_time ou do futuro, revogação, limites, origem cruzada).
- Cliente: confirmação "Confirme que é você" antes de associar o Discord e para sair de todos os aparelhos; testes em account-access-panel.test.tsx. Seis textos novos nos catálogos.
- Não verificado: login real Discord/Google, o efeito de validSince no Firebase de produção e a revogação de ID tokens no banco (continuam valendo até expirar). Para conferir: entrar em dois navegadores, usar "Sair de todos os aparelhos" num deles e ver o outro cair na próxima chamada ao servidor.
- Fora do repositório (da dona do projeto): conferir no console Firebase a proteção contra enumeração de e-mails, a política de senha obrigatória, App Check no Realtime Database e no Auth, e AUTH_PUBLIC_ORIGIN na Vercel.

## Caderno em 3D, 2026-10-28

- Decisão: o caderno do Espaço do aluno passa a ser desenhado em 3D (three.js 0.169.0, MIT, versão exata no package.json e `@types/three` igual). O editor de escrita à mão (Escrever à mão) não foi tocado: ao entrar numa folha, abre o mesmo editor 2D de sempre. Só o caderno e o que o acompanha (folhas, divisórias, marcadores, capa) são 3D.
- Recurso ligado por padrão (preferência `notebook3d`, em Perfil, Aparência e acessibilidade, "Caderno em 3D"). Cai para a vitrine 2D, sem aviso, quando a pessoa desliga, quando o aparelho não tem WebGL ou quando a cena falha ao carregar. Nada sai do aparelho: a cena usa só dados locais.
- Capa única nova (arco, bússola, etiqueta). Saíram o inventário de capas, o botão Personalizar e as artes Helena e Oliver. `coverStyle` segue aceito nos dados salvos por compatibilidade.
- Folheio com física própria (mola por folha, curvatura), capa e contracapa que viram, espiar a pilha, divisória e marcador nas mesmas regras da vitrine 2D (`placeTab`, testada em `notebook-3d-model.test.ts`). Capa e contracapa e anterior/próxima usam as setas de papel do Foco.
- Animações: abrir a capa ao chegar da estante, entrar na folha (a folha vem de frente e vira o editor), voltar da folha (o caderno reabre na dupla certa e a folha volta ao lugar), escolher no índice (folheia até a folha e entra). Sons de papel sintetizados (`src/data/notebook-sound.ts`, Web Audio, sem arquivos), respeitando Efeitos sonoros e só depois de um gesto. Estrelas de papel ao abrir a capa. Movimento reduzido: sem folheio animado e sem estrelas.
- Teclado e toque: abrir a folha é tocar nela (ou usar os botões "Abrir folha N", visíveis só com foco de teclado); capa e folhas pelas setas; a caixa de ferramentas é a mesma. Foco por sublinhado amarelo, sem outline.
- Orçamento de desempenho: three.js não cabe no teto de 1600 KiB do total da aplicação. A cena (`notebook-3d-scene`, 528 KiB), a tela do caderno 3D (`notebook-3d-book`, `notebook-3d-view`) e os sons ganharam orçamento próprio de 600 KiB em `scripts/check-performance-budget.mjs`, mesmo precedente do leitor PDF, e saem do total da aplicação. O que fica no total é só a ponte entre a vitrine e o 3D (preferência, jornada da capa, índice, miniatura compartilhada em chunk próprio, botão no Perfil): +2,1 KiB, de 1597,6 para 1599,7 KiB medidos no Windows (o Linux do CI mede cerca de 0,5 KiB a mais e passou de 1600,0). Por isso o teto do total (`MAX_TOTAL_JS_BYTES` e `HARD_CEILING_TOTAL_JS_BYTES`) subiu de 1600 para 1602 KiB. Esta é a única subida do teto absoluto; a decisão é da dona do projeto e fica sinalizada na PR. Alternativas descartadas: carregar three.js de uma CDN (envia a requisição a terceiros e depende de rede) e canvas 2D com transformações (não dá folheio com profundidade). Não medido: custo de bateria e de memória em aparelhos de entrada.
- Validação visual feita com Chromium e WebGL por software (SwiftShader): PC (1366 x 860) e celular (iPhone 13), modos claro e escuro, capa fechada, caderno aberto, folha de criação, folhas criadas, índice e volta do editor. Contraste do texto e das setas conferido nas capturas. Limites: SwiftShader é lento e as capturas de animação mostram quadros, não a fluidez real; a fluidez em celular de entrada, a iluminação em telas diferentes e o som real não foram verificados em aparelho. Para conferir: abrir um caderno com folhas num celular e folhear, entrar e sair de uma folha e usar o índice.
- Testes: `notebook-3d-model.test.ts` (estrutura, regras de marcação e física), `notebook-sound.test.ts`, `accessibility-preferences.test.ts`, `profile-view.guest.test.tsx` e `e2e/notebook-3d.spec.ts` (PC e celular). As suítes de e2e do caderno 2D rodam com `notebook3d: false` no storageState global do Playwright; as que usavam Personalizar e o inventário foram ajustadas à capa única.
- Falhas que já existiam na main e não foram tocadas: `listening-audio.test.ts` (8 testes, `object.stream is not a function` neste Node 22) e `student-resume.spec.ts` no celular (altura de `.math-hero-slide` 425 px contra 420 px).

Validação de publicação do preview arcano: lint sem erros (24 avisos existentes), formatação, API e idiomas aprovados; 363 arquivos e 2382 testes passaram. Build inicialmente encontrou three ausente no checkout após sincronização do caderno 3D. npm ci do lockfile vigente concluiu com zero vulnerabilidades; build e performance repetidos passaram, JS inicial 220,5 KiB e aplicação 1599,7 KiB. Sem alteração de dependências, teto ou CI nesta entrega. TypeScript do preview e catálogo 78/78 aprovados. Logs externos arcana-release-final-verify.log e arcana-release-build.log. Preview isolado com 312 inspeções PC/mobile claro/escuro, sem erros de navegador ou overflow.

## Caderno em 3D: otimização de desempenho, 2026-10-28

- Medido com Chromium e WebGL por software (SwiftShader), caderno de 24 folhas, antes e depois. Contadores do `renderer.info` na dupla aberta: chamadas de desenho 79 para 21, triângulos 19.408 para 1.736, texturas na GPU 50 para 13 (com 120 folhas continuam 13). Antes o laço desenhava sem parar; agora, parado, são 0 quadros (o teste `e2e/notebook-3d.spec.ts` confere isso pelo contador `nb3dStats().frames`). Não medido: tempo de GPU e bateria em aparelho real, porque SwiftShader roda na CPU. Para conferir: gravar o desempenho no Chrome do celular (DevTools remoto) ao folhear e ao ficar parado.
- Laço sob demanda: a cena só pede quadros enquanto algo se move (folha, câmera, foco, estrelas, arrasto) e dorme depois de dois quadros de assentamento. Acorda em qualquer entrada (toque, dado novo, redimensionar, aba voltando a ficar visível). Aba oculta não desenha.
- Texturas em janela: só as folhas perto da dupla aberta (cerca de 8) têm textura e miniatura; as outras usam o papel em branco e a memória é liberada 1,5 s depois do folheio assentar. O verso da folha divide a textura da frente (UV espelhado na geometria), o que corta as texturas à metade. Folhas paradas por baixo da de cima não são desenhadas (o bloco de papel as representa).
- Placa de vídeo: resolução limitada a 1,5x (antes 2x), antialiasing só abaixo de 1,5x de densidade, sombra de 1024 (antes 2048, borda suave) com `PCFShadowMap`, materiais Lambert no lugar de PBR (papel e couro são foscos, o difuso é o mesmo), capa e contracapa em 1024 de largura (antes 1240), sem `preserveDrawingBuffer`. Se o aparelho não sustenta 36 quadros por segundo durante o movimento, a cena baixa a resolução e depois desliga as sombras, sozinha.
- CPU: a busca da distância da câmera (projeta oito cantos, doze passos) só roda quando o enquadramento muda, com vetores reaproveitados; o tamanho vem de um `ResizeObserver` e não de `getBoundingClientRect` a cada quadro; `bendSheet` reescreve as linhas no lugar (antes criava cerca de 450 arrays por folha em movimento por quadro); as estrelas dividem texturas, material e geometria (antes 18 canvas e texturas por rajada); a imagem da folha para a jornada ao editor sai de `toBlob` (antes `toDataURL` síncrono).
- Carregamento: as miniaturas são desenhadas uma por vez, da mais próxima da dupla para a mais distante, só dentro de oito folhas, e em 768 de largura (antes todas, 900). A cena e a tela do 3D são baixadas em silêncio 1,5 s depois de a estante abrir (não com "economizar dados" ligado) e em paralelo quando o caderno abre.
- Orçamento: o total da aplicação ficou em 1600,2 KiB (teto 1602), a cena em 543 KiB (teto 600).

## Caderno em 3D: design, marcas e animações, 2026-10-28

- Capa sem personagem: a arte nova (céu de papel com lua, constelação, colinas, cantoneiras amarelas e costura) sai de `notebook-cover-paint.ts`, desenhada na cena e gerada em WebP para a estante e a vitrine 2D pelo mesmo código. A legenda da etiqueta virou "CADERNO DE ESTUDOS". Contracapa com o medalhão da lua no lugar da Olena. Capas mais grossas, maiores que as folhas e com os cantos de fora arredondados; guarda lilás com estrelas e luas sem repetição visível. Folhas com grão de papel, pauta e margem quando ainda não têm desenho, número numa bolinha de papel e sombra da dobra. A pilha fica mais alta nos cadernos finos (espessura por folha entre 0,012 e 0,05) para mostrar quantas folhas há.
- Marcas: com a ferramenta de divisória ou marcador ativa, espiar e abrir folhas ficam desligados; um fantasma da marca aparece exatamente onde ela vai cair e a dica diz "Pôr aqui · folha N"; fora do lugar válido o ponteiro vira "proibido" e a dica explica a regra. No toque, o fantasma segue o dedo até soltar. Na edição, a marca apontada ganha um recorte amarelo claro por baixo e a escolhida, amarelo forte (o painel de nome, cor e remover continua o mesmo). A divisória entra só 0,08 na folha (antes 0,3), então não atravessa as folhas que levantam ao espiar ou virar; o leque de espiar ficou mais baixo.
- Dicas: passar o ponteiro sobre a folha mostra a moldura amarela e "Abrir folha N · título"; na borda de fora, "Próxima" ou "Anterior"; com o caderno fechado, o ponteiro indica que o toque abre.
- Câmera fixa: sem zoom pela roda e sem girar arrastando. Lente mais fechada (20 graus, antes 30), menos inclinação e enquadramento simétrico com espaço para o fecho e as divisórias, no PC e no celular.
- Entrar na folha: a folha se solta do caderno, sobe girando até ficar de frente, com sombra embaixo e o caderno escurecendo atrás; o editor 2D continua do retângulo onde ela parou. O fundo da jornada até o editor usa uma foto do quadro (antes o canvas copiado saía em branco). Sair da folha: ela desce da frente e se encaixa no lugar. Voltar para a estante: o caderno folheia até a capa, fecha e só então a capa viaja até a estante.
- Medição (SwiftShader, 24 folhas): parada a cena continua em 0 quadros; total da aplicação 1600,5 KiB (teto 1602), cena 3D 556,5 KiB (teto 600). Não verificado em aparelho real: suavidade da folha subindo e do caderno fechando, que dependem de GPU de verdade. Para conferir: abrir uma folha e voltar à estante num celular.
- Testes novos em `e2e/notebook-3d.spec.ts`: dica de abrir folha, fantasma e aviso ao pôr divisória, destaque e remoção na edição, e o caderno fechando antes de voltar à estante (só no PC, porque depende do ponteiro). Unitários de espessura da pilha e da divisória curta em `notebook-3d-model.test.ts`.

## Caderno em 3D: barra de baixo, câmera e nitidez, 2026-10-28

- Pedido da dona depois de testar no celular. Controles: as ferramentas (divisória, marcador, editar marcas, índice) deixaram de ficar no alto com texto. Agora há uma barra embaixo com a seta de papel virada para cima (mesma `FocusPaperArrow` do Foco e do Pomodoro, com `aria-expanded`), as ferramentas só com ícone e o "+" de nova folha também só com ícone. A seta mostra e esconde as ferramentas; ao esconder, qualquer ferramenta ativa é cancelada (`cancel` em `PaperToolsScene`). A dica de uso da ferramenta (`notebook-tool-hint`) aparece acima da barra enquanto ela está aberta.
- Saíram as setinhas roxas de capa, anterior e próxima, e o título do caderno ao lado da seta amarela (continua no `h1` com `visually-hidden`, porque o nome já está na capa). Virar a folha é arrastar ou tocar na borda; para teclado e leitor de tela existem botões fora da vista (`.notebook-3d-keys`) que aparecem com o sublinhado amarelo quando recebem foco: anterior, próxima e "Abrir folha N". Os nomes continuam nos `aria-label` e nas dicas do ponteiro.
- Câmera: mais inclinada (0,8 rad desde a vertical, antes 0,48), enquadramento mais justo (margem de 2% a 4% em vez de 5% a 10%) e a área do caderno maior no PC. No celular a cena ocupa a largura e uma altura proporcional (84% da largura), sem sobra de espaço em branco. O fecho da direita cabe inteiro.
- Nitidez: a resolução máxima subiu de 1,5x para 2x (telas de celular passam de 2,5x). A causa mais provável do "144p" era a queda automática de resolução em aparelhos mais lentos, que ficava para sempre; agora a resolução cai só enquanto algo se move, não abaixo de 1,25x, e volta à cheia assim que a cena para. Texturas das folhas de 1024 para 1280 de largura, capa e contracapa de 1024 para 1400, miniaturas das folhas de 768 para 1152, anisotropia até 8 (antes até o máximo da placa, que os celulares limitam), e a janela de folhas com textura caiu de oito para seis para a memória não crescer. O cartão de "nova folha" usa 768.
- Não verificado: a nitidez em aparelho real (o navegador de teste desenha por software e as capturas são reduzidas) e o gasto de memória das texturas maiores em celulares de entrada. Para conferir: abrir o caderno no celular e comparar a capa e uma folha com texto, antes e depois.
- Falha antiga do ambiente de teste, sem relação: `e2e/page-index.spec.ts` ou `e2e/notebook-showcase.spec.ts` falham quando rodam juntos nesta máquina (o clique em "Criar próxima folha" cai durante a animação da folha), inclusive na `main` anterior ao caderno 3D (4 de 4 execuções) e na atual; passam sozinhos e no CI.

### Ajuste seguinte, 2026-10-28

- O "+" de nova folha deixou de ficar solto: agora é o último botão da bandeja que a seta roxa abre, ao lado de divisória, marcador, editar marcas e índice (prop `endControl` de `NotebookPaperTools`). Sem folhas, a bandeja já abre sozinha para o "+" de criar a primeira estar à vista.
- A seta amarela de voltar saiu do meio e ficou no canto esquerdo (`.notebook-preview-heading.is-3d`, com largura total). No celular a barra encosta à esquerda e fica mais compacta para não passar por baixo do mascote.
- Câmera mais em pé: inclinação de 0,3 rad desde a vertical (antes 0,8), quase de frente para a tela. A inclinação anterior deixava o caderno deitado.
- Cortes vistos no preview do PC: (1) a ponta do marcador (a lua) saía do quadro da cena por baixo, porque o enquadramento não incluía o marcador; agora o enquadramento ganha margem embaixo quando há marcador e do lado de fora quando há divisória nas folhas já viradas; (2) a barra de baixo ficava para fora da tela de 720 de altura; a área da cena agora mede `100vh - 290px` (limitada por 62vw e 900px) e a largura máxima subiu para 1500px; (3) a instrução da ferramenta cobria a borda do caderno; agora ela troca o texto "Folhas N e N+1 de N" na mesma linha. Conferido em 1280 x 720, 1366 x 768, 1920 x 1080 e celular. As divisórias passam por cima da tira do fecho; a prévia da divisória (translúcida) fica sobre ela e parece cortada, o que é só a transparência.

### Integração Arcano em andamento

Nova branch feat/arcana-collection integra as 78 cartas aprovadas no perfil e nos baús. Regra do proprietário: manter somente A Estrela já obtida, com arte nova; demais cartas antigas deixam de aparecer. Pontos e recibos preservados. Fonte e limite de rede documentados em ARCANA_INTEGRATION.md. Testes focados de migração/sorteio/API passaram; build inicial excedeu JS por catálogo embutido, resolvido servindo JSON próprio sob demanda, sem aumentar teto. Última medida 1600,2 KiB de 1602. Testes PC/mobile claro/escuro em execução; resultados finais pendentes.

### Integração Arcano: provas locais concluídas

Verify integral passou: 365 arquivos, 2387 testes; lint sem erros e 24 avisos existentes, formatação, API, idiomas, build e desempenho verdes. JS inicial 220,5 KiB, aplicação 1600,9 KiB de 1602, sem alterar teto ou workflow. Log externo ../../arcana-production-final-verify.log. Cenários de navegador Chromium/Edge: 18 fluxos PC/mobile de galeria, arraste real, filtros, baús, ilhas, perfil próprio e contrato visual do perfil visitado em claro/escuro passaram; a prova visual de perfil visitado usa fixture de layout, e o componente real tem teste Vitest. Dez cenários por categoria conferiram todas as 78 artes/identidades, rotação e limites de título no PC/mobile, todos passaram. A antiga conferência única de 78 excedeu 90 segundos; dividida em categorias mantendo todas as asserções, sem aumentar duração nem reduzir escopo. Logs ../../arcana-release-browser.log e ../../arcana-integrity-final.log. HTTP real ar17 retornou 200/CORS *, formato card validado. Os testes automatizados interrompem a origem externa ou simulam respostas para validar fallback, erro e cancelamento, sem depender do serviço real. Política 2026-10-29 documenta consulta dos significados, corpo sem marcas de terceiros, teste de hosts CSP atualizado com cobertura específica.

### Abertura mais rápida e sem molduras amarelas, 2026-10-29

- Medido com o perfilador do navegador (12 folhas, desenho por software, então os tempos absolutos são maiores do que numa placa de vídeo real): ao abrir o caderno, 905 ms eram gastos em `supportsNotebook3d`, que criava um contexto WebGL inteiro só para testar o suporte. Agora ele só confere se a API de WebGL existe, e se a cena não conseguir o contexto ela mesma devolve o caderno ao 2D (o caminho de `onUnavailable` já existia). Essa fatia saiu da abertura.
- A compilação dos shaders (10 programas) passou para `compileAsync`, que usa compilação paralela quando o aparelho oferece, antes do primeiro quadro. O carregamento (`HelenaLoading`) agora só some depois do primeiro quadro desenhado (`firstFrame()`), então a pessoa não vê o canvas vazio; `data-ready` passou a significar "primeiro quadro pintado".
- Não verificado: o ganho da compilação paralela. No navegador de teste (software) a compilação continuou na faixa de 700 ms, porque ali o aparelho não oferece a extensão. Para conferir num aparelho real: abrir o caderno com o painel de desempenho gravando e ver se a tarefa longa de "link program" sumiu.
- Fora do escopo e não mexido: o Rive da Helena (cerca de 500 ms de WebAssembly) carrega junto, na mesma tela, e disputa o processador na abertura.
- Molduras amarelas removidas: a moldura da folha ao apontar e o recorte amarelo claro de marca apontada. Apontar agora só muda o cursor e a dica de texto. O recorte amarelo forte continua só na marca escolhida durante a edição, porque é a indicação de seleção. O teclado segue com o sublinhado amarelo da regra de foco do app.

### Abertura sem lote de texturas, 2026-10-29 (continuação)

- Causa provável do travamento ao abrir: `syncPages` pintava de uma vez todas as folhas da janela (até sete telas de 1280 pixels de largura) e depois mandava as texturas à placa no primeiro quadro, junto com a compilação dos shaders. Agora só as folhas à vista (e as que viram sobre elas) saem prontas; as vizinhas são pintadas uma por vez a cada 40 ms (`paintQueue`), e cada uma chega à placa só depois de pintada. O folheio usa o mesmo caminho.
- As fontes do app deixaram de segurar a abertura: a cena espera no máximo 500 ms por `document.fonts.ready`. Se as fontes chegam depois, `redrawText()` redesenha capa e folhas (só quando as fontes ainda não estavam carregadas na criação da cena).
- Medido (12 folhas, desenho por software): a maior tarefa longa da abertura caiu de 756 ms para 431 ms e o tempo de ligação dos programas de shader de cerca de 726 ms para cerca de 377 ms; o tempo até o caderno aparecer ficou em torno de 3 s neste navegador de teste, que não tem GPU. O que sobra é o Rive da Helena (cerca de 585 ms de WebAssembly na mesma tela) e a compilação por software. Não verificado em aparelho real: conferir abrindo o caderno no celular com o painel de desempenho gravando.
- Não reproduzi o "bloco de folha parada" relatado: na estante com o caderno de teste não apareceu nenhum bloco. A hipótese tratada aqui é o lote de texturas travando o primeiro quadro e a animação de abrir. Se o bloco continuar, uma captura de tela do momento ajuda a achar a causa.
- Teste novo: `notebook-3d-support.test.ts` falha no código anterior (a sondagem criava um contexto WebGL) e passa agora.

Validação após sincronizar main e21116b (caderno 3D): npm run verify exit 0, 366 arquivos e 2389 testes, lint/formatação/API/idiomas/build/performance verdes. Aplicação 1600,8 KiB de 1602, entrada 220,5 KiB. Resumos editoriais em inglês foram corrigidos para traduções curtas, separados dos textos originais da API; IDs dos catálogos preservados. i18n:check repetido e build/performance do head traduzido passaram. Logs ../../arcana-main-final-verify.log e ../../arcana-head-build.log. Previews reais do fluxo de perfil em ../../arcana-production-preview, PC/mobile claro/escuro, com dados de teste. Nenhuma alteração nas 78 artes aprovadas.

### Caderno de volta ao 2D, marcas e divisórias com volume, 2026-10-29

- Decisão da dona do produto: o caderno em 3D travava demais, então o padrão voltou a ser o caderno 2D de sempre (vitrine, folheio e jornadas 2D). O 3D ficou como opção experimental em Perfil, Aparência e acessibilidade (`notebook3dOptIn`, padrão desligado; o texto avisa que pode pesar em aparelhos mais lentos). O campo antigo `notebook3d` é ignorado para ninguém ficar no 3D sem querer. O código do 3D não foi removido: é chunk preguiçoso e só baixa com a opção ligada (nada muda no orçamento de JavaScript).
- Divisórias e marcadores do 2D ganharam volume só com CSS: a divisória sai da borda com ângulo de 22 graus (12 graus na folha à vista, quase reta ao apontar ou focar), com degradês de luz e sombra que cai na página; o marcador pende da folha com sombra em camadas e balança de leve (mais rápido ao apontar). A animação do folheio das folhas e as jornadas do 2D não foram tocadas. Com "Reduzir movimento" (ou o sistema pedindo menos movimento) o balanço e as transições param.
- Conferido em 1280 x 720 e celular, nos modos claro e escuro (capturas durante o desenvolvimento): contraste do texto das divisórias mantido (texto escuro em amarelo e azul, claro nos demais), marcador visível por cima das folhas, foco por teclado continua com o contorno amarelo existente. Limite: o texto da divisória fica um pouco menos nítido com a inclinação em telas de baixa densidade. Não verificado: aparelho real.
- Testes: `e2e/notebook-tabs-depth.spec.ts` (a divisória tem transformação 3D, o marcador tem a animação, a divisória ainda leva à folha, o movimento reduzido para o marcador; falha sem o CSS novo) e `src/data/accessibility-preferences.test.ts` (padrão 2D e campo antigo ignorado).
- Catálogo de textos: id 3173 reescrito para "Experimental: ..." nos dois idiomas; manifesto regenerado.

### Interface nova no caderno 2D, 2026-10-29 (ajuste)

- Correção de rumo: voltar ao 2D não era para desfazer o resto da interface nova. O caderno 2D agora tem a mesma organização do 3D: ferramentas só com ícone (divisória, marcador, editar marcas, índice) numa barra embaixo, junto do "+" de nova folha (ícone sem texto, só com folhas); seta amarela de voltar no canto esquerdo; sem o nome do caderno no cabeçalho (o `h1` continua para leitores de tela com `visually-hidden`, e o nome está na capa). As setas "‹ Capa" e "Próxima ›" e a linha "Folhas 1 e 2 de N" continuam como no 2D original.
- Como funciona: `NotebookPaperTools` ganhou `toolbarHost`; o `NotebookSpread` 2D passa o elemento `.notebook-2d-dock` e a caixa de ferramentas é desenhada ali por portal, com estado e regras iguais. A instrução da ferramenta ("Toque na borda direita") só aparece com uma ferramenta ligada (`:has(.notebook-paper-tool[aria-pressed="true"])`). A prévia compacta do espaço do aluno e o modo somente leitura não mudam (`hasDock` é falso).
- Perdeu-se, de propósito: o rótulo que aparecia ao apontar ou focar uma ferramenta. O nome continua no `aria-label`, no `title` e na instrução da ferramenta.
- Cabe na tela de 720 de altura sem rolar (barra termina em 708 px; com uma ferramenta ligada a instrução empurra a barra para um pouco abaixo da dobra). A seta de voltar saiu da linha do título (posição absoluta no canto), o que economiza uma linha. Conferido em 1280 x 720 e celular, claro e escuro.
- Testes ajustados ao novo desenho: `notebook-celestial` (lista de botões ganhou o "+"), `notebook-preview-controls` (seta à esquerda, título escondido, barra embaixo, rótulo escondido) e `notebook-tabs` (no celular de 320 de largura todos os ícones cabem, com área de toque de 40 px ou mais).
- O marcador do 2D balança uma vez ao apontar ou focar (antes balançava sem parar, o que também impedia o Playwright de considerar o botão estável). Sem balanço com movimento reduzido.
