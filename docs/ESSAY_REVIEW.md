# Revisão de redação do Olena

## Entrega atual

A revisão acontece apenas ao entregar a redação. Não há seletor de modos nem sugestões durante a escrita; o spellcheck nativo fica desativado nesta folha. A entrega pausa o cronômetro, salva o rascunho e registra uma cópia do texto entregue no workspace (`essay-submission`). Aplicar uma sugestão altera o rascunho e preserva essa cópia. Reentregar conteúdo idêntico não cria outra cópia.

O corretor usa Hunspell em WebAssembly (`hunspell-wasm` 0.3.0) e o dicionário brasileiro VERO (`dictionary-pt` 4.0.0). O worker e os arquivos são carregados do próprio domínio apenas após a entrega; não há chamada de IA nem envio da redação a terceiros. O primeiro uso baixa cerca de 6,3 MB de arquivos sem compressão, incluindo o motor e os dados. Não prometer funcionamento offline antes de os arquivos estarem disponíveis no aparelho.

Os avisos mostram palavras não reconhecidas, alternativas, localizar no texto e ignorar. Nomes próprios podem ser sinalizados. Não são avaliações de concordância, estrutura argumentativa ou nota Enem. Cada resultado pertence ao texto exato analisado; alterações invalidam as sugestões. Correção explícita é uma transação do histórico e pode ser desfeita.

## Custos

Nenhum serviço pago, credencial ou infraestrutura externa foi ativado. Os dois pacotes não cobram por chamada. O tráfego dos arquivos estáticos e o salvamento no workspace seguem a hospedagem e sincronização já existentes. Licenças, créditos e fontes dos pacotes estão em `public/third-party/essay-spelling.txt`.

Antes de acrescentar LanguageTool comercial, hospedagem de um servidor próprio ou avaliação por modelo, informar o custo de operação e obter autorização. A API pública gratuita do LanguageTool não pode ser usada para automação do produto.

## Próximas etapas

A decisão do proprietário é seguir sem a API do Olena e sem serviços de correção com cota por chamada. A comparação gratuita foi executada e documentada em [Avaliação local](research/ESSAY_LOCAL_EVALUATION.md).

1. Rubricas editoriais por proposta e sinais verificáveis de repetição, insuficiência e cópia literal.
2. Pertinência temática local como sinal auxiliar, com abstenção em temas próximos. MiniLM e E5 foram testados, mas não aprovados como corretores completos.
3. Avaliação por competência somente depois de testar um modelo especializado com redações corrigidas por pessoas, temas separados e casos adversariais. Não transformar similaridade em nota.
4. Comparação de versões e atividades baseadas em dificuldades recorrentes.

Nenhum modelo de aproximadamente 129 MiB foi incorporado ao app; testes e pesos ficam no laboratório isolado. Qualquer integração deve preservar o editor sem o modelo e ser medida em aparelho físico.

## Verificação em 20/11/2026

13 testes focados: dicionário real, acentos e offsets UTF-16, substituição e revisão obsoleta, limite de ocorrências, ignorar, erro/retry, revisão apenas ao entregar e histórico. TypeScript e ESLint focado aprovados. Build Vite aprovado. Edge com biblioteca completa em 1366 e 390 px, temas claro/escuro, e build de produção com CSP: sugestão, aplicar, desfazer/refazer, entrega limpa e ausência de requisições externas. Carregamento observado de aproximadamente 1,0 a 1,4 s nesses testes de desktop com viewport móvel, não medido em aparelho físico.

Limitação de release: `check-performance-budget` acusa JavaScript total de 1873,1 KiB contra teto de 1764 KiB; entrada inicial de 219,4 KiB dentro do teto. O limite não foi aumentado e o check não foi desativado. Resolver o excesso antes de considerar a entrega pronta para publicação. Não atribuir todo o excesso ao corretor sem comparação de baseline.

## Triagem temática local automática

Depois de entregar, a análise de tema inicia automaticamente na tela de resultado. O primeiro uso baixa aproximadamente 150 MB de modelo, tokenizer e runtime; não há download durante a escrita. Cancelar ou mudar o texto/tema encerra o worker e invalida respostas antigas. Falhas não bloqueiam ortografia, edição ou rascunho.

MiniLM multilíngue quantizado, com revisão fixada, é executado no worker em WASM de thread única. Configuração, tokenizer e pesos são baixados por GET do publicador no Hugging Face/CDN; nenhum texto é enviado a esse serviço. A CSP permite somente conexões adicionais aos hosts necessários de download, sem permitir scripts remotos ou workers blob. O runtime WASM é servido pelo próprio app.

Os 60 perfis editoriais em public/essay-topics/profiles.json combinam o título específico (65%) e a descrição de apoio (35%). Isso reduz a influência de descrições genéricas compartilhadas entre assuntos. São vetores de referência e não critérios de nota aprendidos de corretores. Gerar novamente com scripts/generate-essay-topic-profiles.mjs e a mesma revisão do modelo.

A redação é dividida em blocos curtos para não truncar silenciosamente o texto inteiro. Os blocos são reunidos por parágrafo e no texto completo; a comparação considera o perfil selecionado, o foco e assuntos alternativos. A saída apresenta indícios de alinhamento, possível tangenciamento, possível fuga ou resultado inconclusivo, com parágrafos originais localizáveis. Textos curtos, repetições e margens pequenas causam abstenção. Não se atribui zero nem nota por similaridade.

Os limiares são conservadores e experimentais, não calibrados com juízos humanos. Nos dois exemplos extensos pertinentes do smoke test, houve abstenção devido a temas próximos. Isso é uma limitação real, não deve ser apresentado como correção já equivalente a uma banca. Antes de notas ou conclusão definitiva de fuga, exigir validação em redações reais e temas próximos.

Verificação: 23 testes focados aprovados, TypeScript, ESLint e build. Edge com build de produção/CSP: possível fuga em texto de outro assunto, possível tangenciamento ao mencionar o tema só na introdução, e inconclusivo em repetição, nos viewports 1366/390. Requisições externas observadas foram somente GET de arquivos do modelo, sem conteúdo da redação. Nenhum celular físico medido.

Gate de publicação continua pendente: 2791,7 KiB de JavaScript total contra 1764 KiB; entrada inicial permanece 219,4 KiB. O worker de tema é opcional e tem cerca de 889 KiB, mas ainda conta no teto global. Não aumentamos nem burlamos o limite. É necessário resolver o orçamento antes da publicação.

### Resultado de redação em tela própria (2026-11-20)

A entrega agora alterna o editor para uma tela de resultado com a arte existente da Olena. Não abre LibraryDialog; controles e botão flutuante do editor são ocultados. Retornar à folha preserva o rascunho e o histórico. A revisão ortográfica exibe contexto e distingue possíveis alterações de acentuação. Diagnósticos objetivos apontam parágrafos duplicados, bloco único e períodos longos, sem inferir qualidade ou nota. A triagem temática apresenta os parágrafos mais próximo e mais distante do tema, mantendo abstenção e consentimento para o modelo local. Não há nota pedagógica atribuída nem serviço pago ativado.

### Viabilidade de notas locais (20/11/2026)

Cinco classificadores USP auditados e executados em laboratório isolado, com hashes de pesos fixados. Comparação exploratória: 24 avaliações públicas de 23 redações, C1/C4 mais próximas das notas humanas nesta amostra; C2/C3/C5 com maiores desvios. Entradas inválidas receberam notas positivas, e o limite de 512 tokens cortou textos. C1 convertida para ONNX Q8 (109,75 MB), funcionando em Transformers.js Node CPU; 22/24 previsões iguais ao FP32. Não houve teste em aparelho físico nem integração de notas no app. Licença explícita dos pesos não localizada, e licença do dataset tem divergência de metadados. Nenhuma API paga usada. Resultados e condições de integração em docs/research/ESSAY_GRADING_FEASIBILITY.md.

### Primeiro treinamento próprio (20/11/2026)

Corpus Essay-BR de revisão fixa e licença MIT declarada: 4.570 ocorrências, 4.568 retidas após exclusão de duas conflitantes. Divisão por IDs de proposta: 60 temas/3.122 redações de treino, 13/792 de validação e 13/654 de teste. Encoder local congelado leu integralmente 1.855.114 tokens; treino de cinco regressões com seleção apenas na validação, controles estrutural/lexical e mediana do treino. Cabeçalho semântico exportado com 166.691 bytes, reprodutível e com paridade aritmética em JS, sem pesos do encoder incluídos. MAE total semântico 119,51/1000, maior erro 680; C3 piorou em relação à mediana e não houve ganho consistente nas cinco competências. Portanto, notas continuam desativadas. Cache privado ignorado, nenhuma API paga ou dependência nova do app. Evidências e limites: docs/research/ESSAY_OWN_GRADER.md.

### Análise automática e marcações (20/11/2026)

Por pedido do usuário, a análise de tema inicia ao abrir o resultado da entrega, sem botão de download ou análise manual. Não inicia durante a escrita; cancelamento, retry e invalidação por texto/tema continuam. O primeiro uso pode baixar o modelo local automaticamente; nenhuma redação é enviada. As observações de tema, ortografia e organização foram reunidas em Marcações, com trechos do texto e marcadores facetados, mantendo apenas diagnósticos disponíveis e sem inventar notas ou avaliações de competências. Erros e resultados inconclusivos continuam explícitos.

## Comentários da Olena por competência (21/11/2026, só backend)

Por decisão da dona, a Olena (Cloudflare Workers AI) passa a comentar a redação em C1 a C5, com nível (Precisa melhorar, Bom, Muito bom) por competência. Isto **muda** o texto acima sobre não haver envio da redação a terceiros: a revisão de ortografia, tema e estrutura continua no aparelho, mas o pedido de comentários da Olena envia o texto ao servidor e ao provedor de IA, só depois de um toque e com aviso do custo. Nesta etapa existe apenas a capacidade `essay` do servidor; a tela vem na PR seguinte. A nota numérica fica atrás da chave `OLENA_ESSAY_SCORE` (desligada), até a medição. Modelo de ameaça, custo e regra da nota em [REDACAO_IA.md](REDACAO_IA.md).

A tela dos comentários da Olena (PR 2) fica no painel "Redação" da tela de resultado, depois da triagem de tema e antes da revisão ortográfica. Pede aviso e toque antes de enviar, mostra custo e saldo, e exige conta. Ver [REDACAO_IA.md](REDACAO_IA.md).
