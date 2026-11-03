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
