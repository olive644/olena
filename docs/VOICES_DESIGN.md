# Idiomas: contrato visual, de navegação e ensino

Decisão explícita do proprietário em 02/11/2026: as seis partes aparecem como seis cenários navegáveis por setas, igual em Matemática. Cada cenário abre seus próprios materiais. Não são seis tópicos numa lista nem seis locais clicáveis sobre um único mapa.

Este documento é a referência de trabalho para Idiomas. Ler junto com DESIGN_SYSTEM.md e VOICES_PORT.md antes de mudar uma tela ou gerar uma arte. Ele substitui as propostas de níveis como ilhas e de seis ilhas de assuntos.

## Estrutura

Ilhas gerais > Cais dos Encontros (Inglês) > carrossel de seis cenários/partes por setas > materiais da parte > prática e confirmação. Praça dos Ventos, Jardim das Palavras e Pátio dos Traços também são ilhas gerais, ainda bloqueadas.

- Porto das Vozes foi retirado da navegação por decisão do proprietário. Sua arte permanece apenas como referência histórica de estilo. Não recriar essa camada intermediária.
- Inglês é uma única ilha, Cais dos Encontros, com seis partes. Não criar seis ilhas completas para essas partes.
- A1 a C2 podem indicar dificuldade do material. Não são uma camada de navegação nem prova de certificação.
- Espanhol, Japonês e Chinês continuam bloqueados nesta entrega, mesmo que Inglês chegue a 100%.

## Nomes e identidade

| Idioma   | Nome principal      | Silhueta da arte                                         |
| -------- | ------------------- | -------------------------------------------------------- |
| Inglês   | Cais dos Encontros  | Casa de estudos, pátio de conversa, canal e barco        |
| Espanhol | Praça dos Ventos    | Moinho, praça circular, fonte e arcadas                  |
| Japonês  | Jardim das Palavras | Pavilhão aberto, árvore facetada rosada e ponte vermelha |
| Chinês   | Pátio dos Traços    | Portal circular, pavilhão de dois telhados e bambus      |

O idioma aparece como rótulo menor e na bandeira. Os nomes são definidos em src/data/voices-language-catalog.ts. São rótulos visuais: não renomear IDs persistentes, recibos ou chaves de recompensas ao trocar um nome.

## Arte: o que permanece

A referência artística é public/practice-islands/languages.webp, Porto das Vozes. As quatro artes vigentes ficam em public/languages/islands/. O Cais dos Encontros conserva sua arte ao construir as partes internas.

- Mesma câmera isométrica, recortes facetados e escala de polígonos da referência.
- Rochas azul-marinho, pedra clara, telhados turquesa, água poligonal, vegetação geométrica e pequenos detalhes amarelos.
- Poucas formas grandes e silhueta legível em celular. Transparência verdadeira, sem retângulo de fundo.
- Cada idioma tem composição e arquitetura próprias. Mudar só a bandeira da mesma casa com ponte não cria uma ilha distinta.
- Bandeira britânica para Inglês, espanhola para Espanhol, japonesa para Japonês e chinesa para Chinês.
- Não acrescentar brilho realista, texturas, arquitetura minuciosa, excesso de móveis, enfeites ou ornamentação. Não trocar por desenho vetorial simplificado.
- Não reconstruir personagens para decorar ilhas ou partes. Usar as artes existentes de Olena, Oliver e do perfil.
- Cada parte tem um cenário de uma região do mesmo Cais, derivado da arte inglesa: cais, praça, ponte, mirante, pátio e casa. São recortes de lugares com plataformas rasas, não novas ilhas de idioma com grandes bases rochosas. Conservar arquitetura, materiais, câmera e acabamento. Não redesenhar a ilha principal.

As artes são exportadas em WebP, 800 por 800, com alpha. O estado bloqueado pertence à interface, nunca deve ser pintado na imagem. Novas artes precisam ser mostradas em preview; resultado gerado não equivale a aceite do proprietário.

## Interface: Matemática é a referência

Reaproveitar os componentes e a estrutura existentes, sem reinterpretar os controles:

- Setas roxas: FocusPaperArrow com as classes compartilhadas de Matemática.
- Botão disponível: HelenaRoomIcon com name="play".
- Botão bloqueado: PaperIslandLock, extraído sem redesenho do cadeado das ilhas gerais. Nunca usar play, emoji, ícone do navegador ou um novo cadeado nesse estado.
- Porcentagem sobre o avatar, seis segmentos de progresso, dígitos em PaperDigits/MathNumber.
- Pontos, percentual e três espaços de poeira cósmica em MathPlaceTreasure aparecem somente no carrossel das partes. A ilha geral do idioma não mostra essas informações nem os três botões de +. Materiais e atividades também não repetem o tesouro.
- Transições de entrada, saída e navegação conservam o comportamento compartilhado, com redução de movimento do sistema e do app.
- Sem descrição "6 partes..." abaixo do nome da ilha. A informação aparece dentro do percurso.
- Fontes originais, botões de papel e foco amarelo. Não adicionar fontes remotas, molduras de foco roxas ou pretas ou ações dependentes de hover.

PaperIslandLock é compartilhado por LearnView, MathIslandJourney e VoicesLanguageMap. Alterações futuras nesse desenho precisam continuar compartilhadas, sem cópias divergentes.

## Interior e seis partes de Inglês

Entrar no Cais dos Encontros abre o carrossel fullscreen de seis cenários, com setas roxas, avatar, percentual do cenário e recompensas compartilhadas. Explorar um cenário abre os materiais específicos dele, com a arte daquela região no emblema e ao fundo. Não substituir o carrossel por lista, grid de aulas ou hotspots.

As seis partes são apresentações e verbo to be, rotina e presente simples, passado, planos e futuro, argumentação e conexões, expressões e interpretação. PC e celular navegam pelos seis cenários por setas, gesto e teclado, como Matemática. A folha mostra somente os materiais do cenário escolhido e Voltar retorna ao cenário, não a outro idioma. Todos os alvos essenciais continuam acessíveis por toque e teclado.

- Partes pertencem ao mesmo percurso e ao mesmo percentual. Não têm ilhas ou registros de pontos separados.
- Cenários seguintes permanecem visíveis para navegação, mas abrir seus materiais exige confirmar a parte anterior, como os destinos bloqueados de Matemática. Mostrar o cadeado original e botão desativado.
- Parte confirmada recebe o check original. Seleção usa papel amarelo com tinta escura em ambos os temas.
- Cada parte tem 120 tarefas (30 situações em quatro formatos), exige 100 acertos diferentes para a confirmação e reserva o último ponto percentual até a confirmação 4 de 5. São 720 tarefas no percurso. Repetição não gera domínio novo.
- Falha na confirmação exige quatro acertos de revisão. Erro não apaga domínio adquirido.
- Acertos, erros, pontos, XP, poeira e Arcano continuam usando as regras documentadas em VOICES_PORT.md. Não inventar valores para preencher o preview.
- Fala, lacuna, resposta contextual e ordenação usam o conteúdo próprio existente. A voz local é opcional e tem alternativa em texto. Não anunciar pronúncia, chamada ou IA generativa que não existe.

## Prova antes de entregar

Conferir o componente real em PC e celular, claro e escuro, incluindo 320 px. Conferir cadeados, play, nomes, bandeiras, contraste dos dígitos e papéis, foco, movimento reduzido, carregamento e recuperação, scroll e bloqueios. Registrar SHA, viewport, tema, fixtures e limitações em CURRENT_STATE_AUDIT.md.

Testes precisam preservar progresso, recarga, pontos, revelação de cartas e Matemática. Não alterar expectativas, tempos, workflows ou limites para esconder uma falha. Regras de conta e publicação Firebase continuam em VOICES_PORT.md. Aceite visual não é autorização de mesclagem; aplicar o fluxo Git de AGENTS.md.

### Cenários e materiais

| Parte | Cenário              | Material                    | Arte          |
| ----- | -------------------- | --------------------------- | ------------- |
| 1     | Cais das Boas-vindas | Apresentações e verbo to be | welcome.webp  |
| 2     | Praça dos Hábitos    | Rotina e presente simples   | habits.webp   |
| 3     | Ponte das Memórias   | Passado e experiências      | memories.webp |
| 4     | Mirante dos Planos   | Planos e futuro             | plans.webp    |
| 5     | Pátio das Ideias     | Argumentação e concessões   | ideas.webp    |
| 6     | Casa dos Sentidos    | Expressões e interpretação  | meaning.webp  |

Artes em public/languages/english-parts/, catálogo em src/data/english-part-catalog.ts. O percentual de cada cenário usa seu domínio de 100 questões e confirmação final; o percentual do idioma continua a média dos seis cenários. Os pontos e a poeira continuam no registro inglês compartilhado, sem duplicação por troca de tela. IDs de partes e currículo permanecem estáveis. Completar a primeira parte libera a segunda; não libera outro idioma.

## Aprender antes de responder

Antes de praticar, cada parte apresenta quatro explicações graduais: significado, regra, contraste e aplicação em conversa, com exemplos em inglês e significado em português. Não supor conhecimento prévio de termos como to be, auxiliar ou expressão idiomática. Explicar os termos na própria lição.

Durante a atividade não mostrar Voltar, título central da ilha, porcentagem geral, Ver texto da fala ou botão Continuar. A fala já está em texto. Ouvir a fala aparece somente quando há voz inglesa local; ausência de voz é silenciosa e não bloqueia o estudo. Escape continua oferecendo saída com confirmação e foco contido.

Respostas usam math-answer-button, seus tons, recortes, avatar/reação e efeitos sonoros existentes de Matemática. Acerto reage por 650 ms e avança automaticamente. Erro reage por 1300 ms e abre a revisão da Olena, com sua arte aprovada do onboarding, resposta dada, significado, regra e orientação. Não avançar automaticamente enquanto a pessoa lê essa explicação. Agora é sua vez retorna à prática com apoio adaptado. Os tempos são de feedback, não prazo de resposta nem de leitura. Respeitar movimento e som configurados.

A área de materiais usa toda a superfície temática, sem faixa de fundo vazia ou tesouro duplicado. Conferir scroll real, contraste e botões em PC, 320 px, claro e escuro.

## Partida de Inglês com regras compartilhadas, 03/11/2026

Esta direção substitui o feedback intermediário descrito acima. A atividade mantém apenas o Voltar de Matemática, pontos, relógio e três corações. Sem título central da ilha, porcentagem geral, barra roxa de questões ou contagem Questão X de Y. O estudo inicial também perde a miniatura da ilha; os seis cenários do carrossel permanecem intactos.

Contagem inicial 3, 2, 1, com um segundo por batida e som configurável. Reutilizar ARCADE_LIVES, ARCADE_RESERVE, ARCADE_COUNTDOWN, arcadeQuestionTiming e arcadeReserve. Três corações, reserva inicial 60, teto 90, prazo do banco ativo de Matemática: base 28 + teto de caracteres/12 + quatro segundos por faixa adicional, com drain 1. Acerto repõe dois segundos, ou três se ocorreu até 32% do prazo; expiração custa coração e quatro segundos extras, com reposição da reserva quando esgotada. Feedback de acerto 650 ms e erro 1300 ms. Pausar relógio durante contagem, feedback, seleção pendente, saída confirmável e revisão. Retomar considerando relógios monotônico e civil, inclusive após voltar da aba.

Prática continua até perder os três corações, atingir o alvo de domínio ou esgotar os 120 IDs sem repetição. O fim mostra revisão de cada erro com escolha real (ou tempo esgotado), frase, significado, pista linguística própria e resposta correta. Não interromper cada erro com uma explicação. Revisão não tem prazo. Depois mostrar resultado e Tentar novamente; a nova partida restaura corações/reserva, sem apagar domínio, pontos ou histórico. Confirmação termina em cinco respostas ou três erros e mantém a exigência de quatro acertos e revisão de quatro acertos após reprovação.

As 180 situações têm regras bilíngues específicas e faixas pedagógicas autorais de 0 a 5. Não inferir dificuldade apenas de meaning/gap/reply/order. Seis acertos de uma mesma faixa permitem subir, dois erros consecutivos retomam uma faixa mais simples e erro reduz apoio de formato. Conteúdo já dominado é preterido. Isso é seleção didática determinística, não certificação de nível nem texto gerado por IA.

Arte de conversa em public/languages/characters/: Olena mantém olhos amarelos angulares, estrela, orelhas, proporções e facetas originais, com colete/livro/lenço. Oliver não aparece na atividade; os controles de resposta representam a participação do usuário. Primeira geração da Olena foi rejeitada e não entra no produto. Usar a referência original como alvo de edição, não redesenhar a identidade. Conferir rostos e proporções nas duas superfícies e em 320px.

### Ajuste final de composição e relógio ativo

Direção posterior do proprietário: sem cartão branco externo na atividade; Olena centralizada acima da fala, sem Oliver. As respostas representam a participação do usuário. A Olena mantém o modelo original com roupa discreta; o asset de Oliver produzido nesta revisão foi retirado do produto. Botões coloridos, relógio/corações e Voltar permanecem. A reserva usa a mesma barra math-reserve, com avanço ligado ao banco real de segundos, e a expiração mostra a reação original com perda de quatro segundos. Não confundir essa reserva com a barra roxa de quantidade de questões removida.

Correção da referência de prazo: a versão inicial usava o cálculo legado. O jogo ativo de Matemática usa o banco math-challenge-bank: base 28 + teto de caracteres/12 + quatro por faixa adicional (e dez para Cálculo), com drain 1. Esse cálculo foi extraído sem mudar valores para arcadeQuestionTiming e é o usado em Inglês, com comprimento da fala e exigência didática mapeada às três faixas do banco. A confirmação usa faixa 3. O tempo exibido é o menor entre prazo individual e reserva restante. Demais regras de corações, reposição, penalidade e contagem são as mesmas.

Ajuste de espaço confirmado pelo proprietário: não mostrar arte da Olena nem de Oliver nas perguntas. Manter somente identificação/fala, relógio/reserva/corações e opções centralizadas com mais espaço. A arte da Olena pertence apenas à revisão final, fora da partida cronometrada. O teste de navegador exige ausência de imagens na conversa da questão.

## Ampliação A1, 03/11/2026

Contrato atual da primeira parte em [ENGLISH_A1.md](ENGLISH_A1.md): seis assuntos internos, 120 situações inéditas, cobertura por assunto e preservação das 720 tarefas anteriores. Não altera os seis cenários, artes, outras partes ou regras compartilhadas do relógio. O banco da primeira parte passa a 240 IDs, os demais continuam com 120.

## Retomada da pergunta, 03/11/2026

O cursor privado da prática é gravado assim que a questão aparece. Sair da rodada, da ilha ou recarregar permite retomar o mesmo ID. Depois de perder os três corações, Tentar novamente retoma a questão do último erro. Os corações e a reserva reiniciam; domínio, pontos e respostas já registrados permanecem. A contagem 3, 2, 1 continua obrigatória. Uma resposta correta limpa o cursor anterior antes de selecionar a próxima, evitando repetir um acerto no intervalo do feedback.

Confirmação interrompida mantém ID da tentativa, cinco perguntas, posição, acertos e erros já respondidos; concluir grava uma única atividade e um único recibo. Confirmação reprovada continua exigindo revisão, com a prática retomando o último erro. O carrossel interno reabre a última parte praticada, respeitando o bloqueio sequencial.

Os cursores ficam em englishCheckpoints no perfil privado já sincronizado, separados por parte e modo, com proprietário, data e marca de limpeza. O merge mantém a versão mais recente de cada cursor e não ressuscita posição limpa por uma cópia antiga. Nenhuma regra Firebase, chave sincronizada nova ou dado público foi adicionado. Testes simulam contas e merge; sincronização real entre aparelhos não foi verificada.

## Entrada e resultado de partida, 03/11/2026

Direção vigente do proprietário substitui as telas de material anteriores: ao explorar a parte, apresentar entrada compacta com avatar, Praticar e confirmação quando elegível. Não exibir cabeçalho/proficiência, guias, assuntos A1, contadores ou resumo textual da rodada nessa tela. Conteúdo JSON, tarefas, domínio e histórico são preservados; explicações específicas continuam na revisão dos erros ao fim da partida.

O resultado usa ArcadeResults, o mesmo componente de Matemática: avatar, pontos com dígitos originais e contagem animada, mensagem, parte, poeira cósmica quando realmente concedida e Tentar de novo. A ação de levar poeira retorna ao cenário com a mesma entrega visual e os espaços existentes. O componente apresenta os valores, sem conceder XP ou pontos novamente; liquidação mantém recibos e motor existentes. Sem recompensa inventada quando os três espaços estiverem ocupados ou a gravação falhar. Movimento e som respeitam preferências globais.

Frases da revisão usam papel amarelo com dobra, facetas e base, tinta grafite em ambos os temas. Não usar o bloco retangular translúcido com borda lateral. Foco em títulos segue o contrato global de DESIGN_SYSTEM.md.

XP aparece somente na notificação RoomRewardNotice, como em Matemática, respeitando a preferência de avisos de recompensas. Inglês usa apresentação de XP já liquidado pelos recibos individuais, sem conceder novamente nem mostrar uma linha de XP na tela de resultado. A notificação fica adiada durante a revisão dos erros.

## Fala intercalada, 03/11/2026

Contrato em ENGLISH_SPEAKING.md. Nas seis partes, tarefas de ordenação a partir da faixa 1 podem ser respondidas por voz, com permissão específica e conferência da transcrição. As primeiras faixas continuam interpretação/seleção; a API adaptativa, os IDs, checkpoints e recompensas permanecem. Alternativa Agora não posso falar mantém a mesma questão com palavras. Não armazenar áudio ou texto ditado e não anunciar nota de pronúncia. Os botões, checkbox, microfone, papel e reações são os originais do app, em claro/escuro e mobile.

## Fala local opcional, 03/11/2026

A prática de fala usa a captura local e o worker descritos em ENGLISH_SPEAKING.md. Preservar os controles de papel, checkbox universal, HelenaLoading, sons e preferências existentes. Preparar modelo é uma ação explícita anterior à gravação; nunca ativar microfone ao terminar download. Mesma questão e alternativa de palavras nas seis partes. Não alterar personagens, artes, banco didático, regras arcade ou recompensas nesta integração.

### Ajuste aprovado de interação da fala

Após a solicitação de remover Enviar resposta, as palavras usam estados neutro/verde/vermelho no papel original. Verde também tem sublinhado; vermelho, sublinhado ondulado, sem depender só de cor. Captura local em AudioWorklet, parciais a cada 2 s, finalização após pausa de 1 s ou Terminar fala. Frase completa correta avança automaticamente; divergência pede repetir, sem registrar erro de conteúdo. Sem placa externa nova, sem avatar adicionado. Validar as seis partes em claro/escuro e PC/mobile.

## Fala incremental, 04/11/2026

A frase reconhecida permanece no papel original. Palavras corretas pulsam em verde e divergências têm movimento curto vermelho; preservar sublinhado textual e respeitar movimento reduzido e preferências de som. Prévia de streaming nunca confirma sozinha uma resposta. Não reintroduzir parágrafos técnicos sobre o modelo no centro da atividade. Solicitar permissão de microfone ao iniciar, sem descontar tempo enquanto a pessoa decide, e manter consentimento separado para baixar o modelo.

## Oito partes de Inglês, 05/11/2026

Decisão posterior do proprietário amplia o percurso para oito cenários. A ordem visual é Cais das Boas-vindas, Praça dos Hábitos, Ponte das Memórias, Mirante dos Planos, Mercado dos Encontros (B1), Pátio das Ideias, Arquivo das Entrelinhas (C1) e Casa dos Sentidos. As setas, números, retrato, indicadores e botões usam os componentes atuais. Mercado e Arquivo têm artes próprias transparentes, derivadas da identidade visual aprovada da Praça, com pedra clara, telhados turquesa, canal e bandeira britânica. São partes compactas da ilha principal.

## Apoio e produção escrita, 05/11/2026

A direção aprovada mais recente permite estudo recolhível na entrada das oito partes. Não restaurar uma página extensa obrigatória antes de cada rodada. Usar os cartões de papel, dobra amarela e controles originais. Estudo não tem cronômetro. Resposta escrita opcional compartilha o mesmo ID, cronômetro e liquidação da ordenação com palavras. Campo rotulado, botão Conferir resposta e alternativa para retomar palavras devem funcionar por teclado e toque. Nunca aceitar frases apenas por conterem palavras da resposta. Explicações de erro continuam somente na revisão final.
