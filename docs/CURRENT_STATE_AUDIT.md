# Auditoria do estado atual

## Borracha de texto e controles compactos

Trocar de ferramenta anima a elevação e o encaixe do ícone por 420 ms; o nome se expande por 320 ms. O estojo desloca e inclina o instrumento escolhido. prefers-reduced-motion desliga essas transições. Orçamento total de JavaScript ajustado a 677 KiB para a borracha de texto (medido 675,5 KiB); orçamento de entrada permanece em 264 KiB.

A borracha substitui por espaços os caracteres tocados do texto integral, preservando a posição dos demais e o histórico de desfazer/refazer. Caixas de texto legadas são apagadas como objetos inteiros. Selecionar Borracha encerra a edição de texto e deixa o canvas receber o gesto. Salvar usa disquete redesenhado; PNG, PDF e espessuras usam papel roxo facetado. Ferramentas e ações revelam os nomes ao passar o mouse, focar pelo teclado ou selecionar, em todas as larguras. Ícones de ações são grafite, com suporte creme no tema escuro.

## Pincéis da caneta

O estojo agora ilustra os instrumentos inteiros em papel recortado: Fineliner, Caneta-tinteiro e Pincel macio. A tinteiro simula ponta inclinada conforme a direção e pressão; o pincel acrescenta marcas de cerdas translúcidas. Espessura continua no controle superior, separada do tipo de instrumento. O estojo recolhe ao abrir a janela ampliada para não sobrepor seus controles no celular.

Selecionar Caneta exibe o estojo à direita. No celular, o painel vira uma faixa horizontal. O campo opcional brush fica em cada traço e é validado na leitura; folhas antigas mantêm o renderizador anterior. Canvas principal, janela ampliada, rascunho, histórico, PNG e impressão compartilham esse estilo. O pincel acumula transparência ao sobrepor segmentos, sem simulação física de aquarela.

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

O contador fica no centro da silhueta vazada de uma maçã em papel recortado. O contorno roxo acompanha o tempo restante e muda para verde durante a pausa. Facetas, folha dobrada e base deslocada seguem a identidade HelenaStudy. A lógica de ciclos permanece igual.

## Barra desktop e Espaço do aluno, 15/09/2026

O rail desktop usa fundo grafite e ícones claros no tema claro. No tema escuro, usa fundo branco e ícones grafite em todos os estados. O cartão inicial do Espaço do aluno não mostra a antiga mascote 2D. A identidade aprovada da Helena permanece nos fluxos de onboarding, login e mundos.

## Onboarding e loading em papel, 14/09/2026

Preview disponível em /?onboarding=1, sem bloquear visitantes existentes ou convites de sala. Cinco perguntas e cinco poses WebP, com pré-carregamento da próxima imagem. Preferências são locais, salvas somente após login concluído. Login Google requer VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN e VITE_FIREBASE_PROJECT_ID, provedor Google habilitado e domínio autorizado. Não há sincronização de estudos nem autorização de backend baseada nesse login.

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
- Escuta em sala: a lista personalizada aceita pares colados com `=`, ponto e vírgula, vírgula, tabulação ou hífen, informa erros por linha e substitui o antigo catálogo extenso por cinco exemplos básicos. A tela do anfitrião oculta a palavra por padrão; cada participante recebe feedback privado com resposta, tradução e XP antes do avanço. Repetições, velocidade e reprodução automática são sincronizadas na sala.
- Bingo: cartelas e marcas validadas no servidor; primeira cartela completa encerra a partida. Entrada tardia recebe até 9 itens restantes e pode ter cartela menor; desabilitar entrada tardia quando a igualdade competitiva for importante.
- Resiliência: Error Boundary da sala, cancelamento de requisições, timeout, retomada com retry sem apagar credencial em falha transitória, validação de payloads, logs de ação/status/duração, foco de teclado contido no diálogo.
- Evidência local: concorrência de 30 entradas/respostas em armazenamento atômico de teste; ETags/412 com HTTP simulado; partidas completas de quiz e bingo com anfitrião e dois jogadores em contextos separados, incluindo reload. Transporte E2E usa handler real + adaptador em memória, **não Firebase real**. Edge instalado substituiu browsers cujo download falhou; Safari/WebKit, bloqueio físico de celular, carga real de 30 dispositivos e auditoria assistiva completa continuam pendentes.
- Dependências: firebase (App Check oficial, carregamento dinâmico) e jose (JWT/JWKS no servidor). Entrada inicial permanece abaixo de 222 KiB; orçamento total passa a 395 KiB por ~44 KiB opcionais do SDK e novos controles.

Ativação e limites operacionais: ver `ROOM_SETUP.md`.

## Sistema oficial de ícones HelenaStudy

- A navegação usa glifos preenchidos e arredondados próprios para Espaço, Agenda, Foco, Praticar, Mais, Biblioteca, Hábitos, Notas, Planos e Banco.
- A mesma geometria assume grafite sobre superfícies claras, roxo no estado ativo e creme sobre a navegação escura.
- O amarelo permanece reservado aos pequenos acentos de cada símbolo, de acordo com a identidade da HelenaStudy.
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
- identidade HelenaStudy com assinatura Oli;
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
enquanto o cabeçalho mantém a assinatura HelenaStudy com o sufixo roxo. Os arquivos
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
somente HelenaStudy, sem alterar a origem ou as regras de engenharia do repositório.

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
a 1 MB por item. A digitalização atual não executa OCR; reconhecimento de texto continua planejado
para uma mudança com modelo de ameaça e estratégia de processamento próprios.

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

## 10. Iconografia própria da HelenaStudy

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

A pronúncia neural usa o **Cloudflare Workers AI** (modelo `@cf/myshell-ai/melotts`, voz natural em
inglês), chamado direto pela função `/api/speech` da Vercel com o token em variável de ambiente
protegida, nunca exposto ao navegador. O navegador envia somente o texto da pergunta e a velocidade;
a resposta chega em MP3.

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
dispositivo é acionada automaticamente, tanto no Quiz de Escuta quanto no Modo Sala.

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

O lobby mostra conexão, participantes, convite, resumo e duração estimada. A entrada normaliza o
código e informa separadamente sala inexistente, iniciada, cheia ou nome duplicado. No celular, o
cabeçalho da sala permanece visível e oferece uma ação textual para sair.
O lobby do anfitrião usa layout flat responsivo. O convite e a lista de participantes ficam ao lado
da escolha da atividade no desktop e passam para uma coluna no celular. Escuta coletiva e Bingo
estão disponíveis; Flashcards em grupo e Quiz competitivo aparecem desabilitados como “Em breve”.
A barra inferior resume a rodada e mantém a ação de início visível. Os ícones aprovados do projeto,
a arte da Helena segurando a placa e o QR SVG dinâmico foram preservados.
No quiz de escuta, a Lista personalizada é o fluxo principal. Ela aceita até 30 pares separados por
igual, ponto e vírgula, vírgula, tabulação ou hífen. Respostas equivalentes podem ser cadastradas com
barra vertical, por exemplo `bus = ônibus | autocarro | o ônibus`. O formulário aponta erros e
duplicatas por linha, mostra uma prévia e confirma quando as palavras são aplicadas. Controles
incompatíveis ficam ocultos. O professor também pode habilitar a aceitação de um único erro de
digitação em respostas com quatro ou mais caracteres. Essa tolerância permanece desligada por padrão.
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

A pronúncia das palavras (Escuta coletiva e Bingo) usa o mesmo cliente e o mesmo caminho de geração
de áudio do Quiz de Escuta individual (`NaturalVoicePlayer`, `POST /api/speech`), em vez de chamar a
Web Speech API direto. Professor e participantes ouvem a mesma pronúncia gerada pelo Cloudflare
Workers AI, com a voz do navegador entrando só se o serviço inteiro falhar. Trocar de pergunta cancela
qualquer reprodução ou pedido de áudio pendente da pergunta anterior.

## 13. Experiência de estudo renovada

A foto aprovada da Helena, sem óculos e com fundo roxo, é usada no ícone da aba e na marca do menu,
por meio do arquivo local `public/helena-portrait.png`.

O painel e a navegação adotam uma hierarquia inspirada em aplicativos de revisão como SimpleStudy:
próxima ação evidente, atalhos de prática, progresso diário visível e cartões fáceis de reconhecer.
A referência é apenas de experiência; cores, componentes, textos e iconografia continuam próprios.

A identidade HelenaStudy permanece baseada em preto, amarelo, violeta e na mascote original. A nova
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

# Marca Pepopsia, setembro de 2026

A marca exibida na interface, nos metadados e nos materiais públicos passou a ser Pepopsia. Helena continua sendo o nome da gatinha e da assistente; identificadores internos antigos foram preservados para não quebrar dados locais, links e integrações existentes.

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
