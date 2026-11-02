# Porto das Vozes: primeira ilha de Inglês

## Entrega

Porto das Vozes abre a Ilha de Inglês. O percurso introdutório, inspirado em situações de nível A1, tem seis partes sequenciais: Café no porto, Primeiros encontros, Caminhos da ilha, Uma mochila de descobertas, O ritmo do dia e Um convite para explorar. São 36 falas originais de Olena com respostas para Oliver, trabalhadas em quatro formatos, totalizando 144 tarefas. Isto não representa um curso A1 completo nem certificação de proficiência.

O aluno interpreta uma fala, completa uma palavra, escolhe uma resposta contextual e monta uma frase com palavras. A fala pode ser ouvida mediante ação do aluno, quando há voz inglesa local no aparelho. O texto oferece alternativa equivalente. Não há captura de microfone, avaliação de pronúncia, chamada, tradução automática ou conversa generativa nesta entrega.

## Regras compartilhadas com Matemática

- Seis partes, banco de 24 tarefas por parte e alvo de 20 questões diferentes respondidas corretamente.
- A confirmação tem cinco questões e exige quatro acertos. Antes da confirmação, o domínio da parte reserva o último ponto de progresso. Somente seis confirmações produzem 100%.
- Erros são contabilizados, não retiram domínio adquirido e recebem a resposta esperada e o significado da fala. Questões ainda não dominadas têm prioridade nas próximas rodadas.
- Reprovar uma confirmação exige quatro respostas corretas de revisão antes de tentar novamente. Partes seguintes permanecem bloqueadas até a confirmação anterior.
- Rodadas de prática têm seis tarefas. Cada acerto vale 20 pontos e 4 XP, preservando a conversão de pontos para XP usada em Matemática. Recarregar uma rodada inacabada não concede recompensa.
- Mesma implementação de poeira cósmica, três espaços, espera de dez segundos, sorteio de cartas e chance arcana de 5%. A coleção Arcano e as datas de revelação são compartilhadas. Os pontos e recibos de Inglês ficam separados dos de Matemática.
- O primeiro percurso não impõe corrida contra relógio ou perda de vidas: a compreensão inicial permite ouvir e reler. Isso não altera o motor, os desafios ou o progresso de Matemática.

## Persistência, conta e compatibilidade

`PracticeActivity.languageAttempt` é um campo opcional aditivo. Guarda a parte, formato da rodada, IDs de questões e acertos. O workspace existente mantém o histórico e o merge por ID conserva atividades de aparelhos diferentes. Registros de Matemática e registros antigos sem esse campo continuam válidos. A leitura deduplica IDs e só considera tentativas coerentes, na ordem de conclusão e de desbloqueio.

Recompensas usam `helena.englishRewards.v1`, com o mesmo parser e merge de recibos, baús, prazos e revelações. A chave separada evita que um cliente antigo de Matemática sobrescreva recompensas que desconhece. A coleção reúne os dois registros. O isolamento e a limpeza de conta usam os mecanismos existentes; temporizadores descartam liquidação se o proprietário local mudou.

**Publicação necessária pela responsável:** publicar as regras atualizadas de `firebase-room.rules.json` antes de disponibilizar a funcionalidade em produção. Foi adicionada apenas a chave de recompensas de Inglês às listas permitidas e à soma existente de oito milhões de caracteres. O limite por item continua cinco milhões. A validação `stateV2` impede substituição integral que omita recompensas inglesas já existentes. Não há mudança de autenticação ou abertura de leitura pública. O agente não publicou regras ou alterou painéis.

O resumo social consulta o registro inglês somente ao publicar atividade de uma conta cujo workspace já contém tentativas de idioma. É uma leitura pequena adicional nesse caso, sob as cotas existentes, sem assinatura ou leitura por visitante. As primeiras datas das cartas são deduplicadas entre os dois registros.

## Pesquisa e decisões

Pesquisa realizada em 02/11/2026, em documentação pública. Nenhum conteúdo protegido, áudio ou sessão autenticada de outro curso foi copiado.

| Referência                                                                                                                                                                                                                                                                   | O que orientou a decisão                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [MEC: como utilizar o aplicativo](https://www.gov.br/mec/pt-br/assuntos/noticias/2026/julho/saiba-como-utilizar-o-aplicativo-mec-idiomas) e [Agência Gov: recursos](https://agenciagov.ebc.com.br/noticias/202609/conheca-recursos-do-mec-idiomas-para-aprender-nova-lingua) | Organização em níveis e módulos, entrada A1 ou nivelamento e prática de compreensão. A arquitetura inspira o percurso, sem copiar currículo ou afirmar equivalência.                                                                                                                                               |
| [Council of Europe: descritores](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions)                                                                                                                                                | Objetivos comunicativos observáveis, como fazer um pedido e pedir direções. A etiqueta introdutória não certifica domínio do nível.                                                                                                                                                                                |
| [British Council: A1 listening](https://learnenglish.britishcouncil.org/free-resources/listening/a1)                                                                                                                                                                         | Contextos cotidianos e linguagem básica clara. As falas, exercícios e imagens do Olena são próprios.                                                                                                                                                                                                               |
| [Web Speech: localService](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService)                                                                                                                                                               | A propriedade distingue voz local de voz remota. Esta entrega seleciona apenas uma voz inglesa local, em vez de assumir que qualquer voz do navegador é offline. Disponibilidade e qualidade variam por aparelho.                                                                                                  |
| [Free Dictionary API](https://github.com/meetDeveloper/freeDictionaryAPI)                                                                                                                                                                                                    | Candidato futuro para consulta opcional de palavras, não para currículo ou correção de diálogo. Não integrado: exigiria avaliar licença dos dados, disponibilidade, cache, consentimento e envio do termo/IP ao serviço. A licença do servidor não concede automaticamente direitos sobre todo conteúdo retornado. |
| [Piper atual, OHF Voice](https://github.com/OHF-Voice/piper1-gpl)                                                                                                                                                                                                            | Candidato para produzir áudios estáticos de falas próprias, fora do navegador. Exige avaliar GPL-3.0, licença de cada voz e custo de processamento. Não foi instalado, executado ou incluído no bundle.                                                                                                            |

A API atual `/api/olena` informa catálogo e capacidades. Ela não declara tutor textual generativo ou voz em tempo real configurados. O contrato Helena exige consentimento por pergunta e não deve ser apresentado como serviço generativo ativo. O percurso usa correção local determinística, sem API paga, chaves novas ou requisições didáticas externas.

Outras rotas próprias também foram inspecionadas: `/api/speech` já possui adaptador Cloudflare TTS, consentimento explícito, limites de texto, cotas de geração e cache compartilhado para salas. É a primeira opção de reaproveitamento caso se decida oferecer voz remota neste percurso, mediante verificação de configuração, orçamento e consentimento; esta entrega não a chama e não inspecionou credenciais. `/api/olena-learning` produz rascunhos internos de um corpus público, com autenticação operacional e verificação aritmética; não é uma API de conversação ou avaliação linguística pronta. A declaração de capacidades do catálogo não comprova o estado de todas as rotas em produção.

Não foi identificada uma API pública documentada do MEC que pudesse ser usada como conteúdo deste percurso. Não foram inspecionados endpoints privados. Bibliotecas de chamada não fornecem, por si, voz ou professor de idiomas.

## Próximas etapas possíveis

Revisão pedagógica das falas, áudios próprios previamente produzidos e licenciados, mais situações e depois outros níveis. Nivelamento, conversação aberta e pronúncia precisam de projetos próprios, dados de avaliação, orçamento e consentimento. Não habilitar um serviço remoto silenciosamente quando faltar uma voz local.

## Validação e limites

Os testes de domínio cobrem 144 tarefas, respostas, duplicação, bloqueio sequencial, confirmação, recuperação, merge de workspace e recompensas. O navegador exercita o componente real em Chromium/Edge, PC e celular, claro e escuro, com perfil fictício de visitante. Inclui recarga, alternativa textual, saída por Escape e revelação de carta. A sincronização Firebase, OAuth real, qualidade de voz do aparelho e publicações sociais reais não são comprovadas por fixtures.

Screenshots de validação ficam fora do produto, em `b/previews-voices-port`. O percurso é carregado sob demanda; não há dependências novas. Antes de publicar, executar `npm run verify` e os E2E do percurso e de Matemática. Não baixar WebKit.

Verify integral final aprovado: 389 arquivos e 2.524 testes; lint sem erros e 27 avisos existentes; tipos/API/idiomas/formatação/build/desempenho verdes. Aplicação 1693,3 KiB de 1704 e entrada 220,6 KiB. O teto total foi ajustado sob autorização vigente do proprietário para crescimento de funcionalidades, sem alterar o teto da entrada e sem dependências novas. Dez E2E Edge/Chromium de Inglês e Matemática passaram em PC/mobile claro/escuro, sem skips; a matriz inglesa usa 320 × 568. Logs externos voices-final-verify.log e voices-final-browser.log.

Os índices de partes e questões são identificadores persistentes. Não reordenar o catálogo publicado; mudanças incompatíveis de currículo exigem uma versão explícita e migração. Conteúdo de diálogo inclui a intenção da resposta de Oliver para evitar marcar como errada outra resposta genérica plausível.

Rollback: retirar a entrada de Idiomas da interface, preservando o histórico e a chave inglesa. Não apagar recibos, pontos ou cartas. Clientes antigos que tentarem substituir um estado omitindo a chave protegida receberão rejeição em vez de apagar dados; precisam carregar a versão atual.
