# A1: situações, cobertura e compatibilidade

## Escopo e objetivos

Ampliação da primeira parte, Cais das Boas-vindas. Os seis cenários visuais existentes não viram seis novas ilhas. O A1 reúne seis assuntos internos, cada um com vinte situações inéditas e dois guias bilíngues:

| Assunto                    | O aluno pratica                                   |
| -------------------------- | ------------------------------------------------- |
| Conhecer e se apresentar   | Cumprimentos, nome, idade, origem e soletração    |
| Pessoas e coisas por perto | Família, cores, objetos, artigos, plural e posse  |
| Encontrar lugares          | Localização, instruções curtas, placas e direções |
| Meu dia e meus horários    | Rotina, horas, frequência e presente simples      |
| No café e nas compras      | Pedidos educados, preços e quantidades            |
| Entender e pedir ajuda     | Formulários, mensagens, necessidades e repetição  |

São 120 situações autorais independentes, uma tarefa por situação, IDs 120 a 239. Cada assunto distribui cinco tarefas de interpretação, cinco de lacuna, cinco de resposta contextual e cinco de montagem. Distratores e explicações são próprios. Na interface inglesa, interpretação usa paráfrases, não repete a frase como resposta. Isso não é certificação A1 nem avaliação completa de conversação, audição ou pronúncia.

## Progressão e revisão

A API própria do Olena e o fallback determinístico compartilham o seletor. Inicia com apoio simples, prioriza lacunas do primeiro assunto ainda abaixo de doze acertos distintos, avança conforme evidência daquele assunto e retoma dificuldade menor no assunto do erro. Não usa somente o tipo de botão como dificuldade. IDs já respondidos na partida são excluídos; tarefas dominadas são preteridas. Uma próxima partida pode recuperar conteúdo anterior para revisão.

A primeira parte continua exigindo cem IDs distintos corretos, agora também pelo menos doze em cada assunto. Cumprida a cobertura, a confirmação usa cinco assuntos diferentes, exige quatro acertos e mantém revisão após reprovação. Uma parte já confirmada em versões anteriores continua confirmada, sem retirar acesso. Relógio, três corações, reserva e contagem inicial continuam os mesmos contratos compartilhados com Matemática. Explicações dos erros aparecem apenas na revisão final, específicas à pergunta e à escolha, sem prazo para leitura.

## Preservação de dados

Os JSONs english.json e english-v4.json não são reescritos nesta ampliação. As 720 tarefas anteriores continuam disponíveis com seus IDs e respostas. O arquivo novo english-a1-v1.json soma 120 tarefas, totalizando 840 no percurso. As outras cinco partes e seus materiais continuam intactos. Os quatro guias antigos da primeira parte permanecem abaixo dos novos assuntos.

Evidência nova usa englishA1Attempt, curriculum 5, somente na primeira parte. englishAttempt curriculum 4 e languageAttempt legados conservam seus contratos e limites. O workspace aceita o campo aditivo e o merge por ID mantém histórico. O marcador de falha antecipada novo também é separado. Clientes antigos não interpretam os novos IDs como questões antigas; não se deve remover metadados desconhecidos nem regravar o ledger para reverter a interface.

Pontos, datas, XP e recibos anteriores não são migrados ou apagados. Recompensas usam o mesmo ledger inglês e recibos idempotentes por partida. Matemática continua separada. A escolha da última ilha fica vinculada ao proprietário e à preferência de matéria inicial vigente; mudar essa preferência invalida somente o destino visual anterior, nunca progresso.

## Pesquisa e licenças

Consulta em 03/11/2026, a descritores públicos e documentação dos projetos. Nenhuma lição, frase de banco de terceiros ou áudio foi importado.

- [Council of Europe, descritores CEFR](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors-search): necessidades concretas, informações pessoais e interação simples.
- [British Council, A1 elementary](https://learnenglish.britishcouncil.org/level/understand-your-level/a1-elementary): objetivos introdutórios, sem assumir conhecimento prévio.
- [A1 reading](https://learnenglish.britishcouncil.org/free-resources/reading/a1) e [A1 listening](https://learnenglish.britishcouncil.org/free-resources/listening/a1): mensagens, formulários, horários, compras e falas familiares.
- [Present simple](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/present-simple) e [Question forms](https://learnenglish.britishcouncil.org/free-resources/grammar/a1-a2/question-forms): referência de estrutura, sem copiar exercícios.
- [Free Dictionary API](https://github.com/meetDeveloper/freeDictionaryAPI): consulta lexical, não currículo. Não integrada; não envia palavras nem IP do aluno ao serviço.
- [Tatoeba, contribuições CC0](https://en.wiki.tatoeba.org/articles/show/cc0-contributions): licenças variam por frase, tradução e áudio. Nenhum item importado.
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs): agendamento de repetição espaçada, MIT. Não adicionada, pois não substitui o seletor adaptativo existente nem é necessária para este recorte.

Sem dependência nova, API didática externa, voz remota ou segredo. A entrega não comprova qualidade de voz local, OAuth, Firebase real, revisão pedagógica independente ou resultado educacional em produção.

## Validação e rollback

Testes cobrem integridade das 120 situações, todos os 720 resultados anteriores, cobertura por assunto, limites da API, leitura/merge, bloqueio da confirmação e recompensa idempotente. Navegador deve validar materiais, contagem, perda, revisão, confirmação, recarga e recompensas em PC e 320x568, claro e escuro, além de regressões de Matemática e navegação.

Rollback de interface mantém registros novos no workspace, sem apagar recibos ou reinterpretar IDs. Para restaurar a versão nova depois, os mesmos metadados permitem recompor domínio. Não converter curriculum 5 em curriculum 4.

## Retomada da pergunta, 03/11/2026

O cursor privado da prática é gravado assim que a questão aparece. Sair da rodada, da ilha ou recarregar permite retomar o mesmo ID. Depois de perder os três corações, Tentar novamente retoma a questão do último erro. Os corações e a reserva reiniciam; domínio, pontos e respostas já registrados permanecem. A contagem 3, 2, 1 continua obrigatória. Uma resposta correta limpa o cursor anterior antes de selecionar a próxima, evitando repetir um acerto no intervalo do feedback.

Confirmação interrompida mantém ID da tentativa, cinco perguntas, posição, acertos e erros já respondidos; concluir grava uma única atividade e um único recibo. Confirmação reprovada continua exigindo revisão, com a prática retomando o último erro. O carrossel interno reabre a última parte praticada, respeitando o bloqueio sequencial.

Os cursores ficam em englishCheckpoints no perfil privado já sincronizado, separados por parte e modo, com proprietário, data e marca de limpeza. O merge mantém a versão mais recente de cada cursor e não ressuscita posição limpa por uma cópia antiga. Nenhuma regra Firebase, chave sincronizada nova ou dado público foi adicionado. Testes simulam contas e merge; sincronização real entre aparelhos não foi verificada.
