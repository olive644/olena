Warning: truncated output (original token count: 64157)
Total output lines: 1945

# Auditoria do estado atual

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

O contador fica no centro da silhueta vazada de uma maçã em papel recortado. O contorno roxo acompanha o tempo restante e muda para verde durante a pausa. Facetas, folha dobrada e base deslocada seguem a identidade OlenaStudy.…14157 tokens truncated…r um contorno de largura variável preenchido de uma vez. Isso elimina os degraus de espessura, as "contas" nas juntas e o escurecimento onde segmentos translúcidos se sobrepunham. O raio é suavizado ao longo do traço e só depende dos pontos até o vizinho seguinte, então a ponta ao vivo e o traço pronto usam a mesma conta. Cantos fechados ganham um disco limitado ao menor raio vizinho. Os fios do pincel macio seguem o traço em caminhos únicos.
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
- **Responsável:** a empresa Galeria.Oli, com José Oliver, Helena Ferreira e Leo Bizzocchi.
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
