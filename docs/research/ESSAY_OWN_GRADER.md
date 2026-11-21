# Primeiro avaliador próprio de redação

Experimento local de 20/11/2026. O treinamento foi realizado e repetido para verificar a reprodução do artefato. A nota do app continua desativada. Não foram utilizados API de inferência, pesos dos classificadores USP, dados privados de alunos ou serviços pagos.

## O que foi construído

Preparação verificável da Essay-BR, separação por tema, extração local do texto completo, treinamento de cinco pequenas regressões e avaliação com notas humanas já existentes na base. O resultado é um protótipo de pesquisa, não uma correção validada do ENEM.

Fonte: https://github.com/rafaelanchieta/essay, revisão `31e502ff3075e182cdda2560a767be65db677fa5`. O repositório declara MIT, com aviso preservado em `essay-own-corpus-LICENSE.txt`. Os hashes dos arquivos e a atribuição de conjuntos estão em `essay-own-data-audit.json`. Não foi feita auditoria independente dos direitos dos textos coletados de terceiros; a declaração do repositório não é apresentada como autorização jurídica confirmada de todos os autores para o produto.

Modelo de linguagem congelado: `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, revisão fixada `2c4055b12046f11709e9df2c122e59ffbdc2f900`, Q8. É a conversão ONNX do modelo Sentence Transformers cuja licença Apache-2.0 foi verificada nos metadados da revisão `e8f8c211226b894fcb81acc59f3b34ba3efd5f42`. A proveniência da conversão e os hashes ficam no cache de pesquisa. Os pesos desse encoder não foram treinados por nós; foram treinados apenas os cinco avaliadores sobre as representações congeladas.

## Dados e isolamento

- 4.570 ocorrências de entrada; duas com o mesmo texto normalizado e notas conflitantes foram excluídas, sem inventar uma média.
- 4.568 redações retidas, com rótulos nas cinco competências e soma validada contra o total da fonte.
- Treino: 3.122 redações de 60 temas. Validação: 792 de 13 temas. Teste: 654 de outros 13 temas.
- Temas identificados pelos IDs de proposta da fonte. Não há IDs compartilhados nem duplicatas textuais normalizadas entre conjuntos. Os 86 contextos de proposta não têm duplicatas normalizadas exatas. Ainda falta uma auditoria semântica de propostas muito próximas e de quase duplicatas.
- A fonte contém redações de prática, com escalas mapeadas pelos autores. Não são 4.568 notas oficiais novas do Inep nem uma banca independente criada para o app.

Vocabulário lexical, IDF, médias, escalas e pesos são ajustados exclusivamente no treino. A regularização é escolhida usando somente a validação. O teste é usado para medir e relatar os candidatos, não para escolher a regularização ou ajustar pesos. IDs e métricas são registrados; os textos ficam apenas no cache ignorado pelo Git.

## Leitura e arquitetura

Foram codificados 1.855.114 tokens das redações, em 16.966 blocos de no máximo 126 tokens de conteúdo, mais os tokens especiais. A contagem de entrada coincide com a contagem processada: não há corte silencioso em 512 tokens. Os textos motivadores das propostas também são codificados integralmente.

O candidato semântico usa a média ponderada e normalizada dos blocos, o último bloco, a interação com a representação da proposta, a similaridade com a proposta e 14 características estruturais. Isso preserva o acesso ao final do texto, mas não demonstra compreensão da argumentação, correção gramatical ou cumprimento da competência 5. A similaridade é apenas uma entrada de um avaliador treinado com rótulos; não é convertida diretamente em nota.

Três candidatos foram comparados com uma referência que sempre retorna a mediana aprendida no treino:

1. Características estruturais, como extensão, parágrafos e pontuação.
2. Representações semânticas congeladas mais características estruturais.
3. TF-IDF de caracteres mais características estruturais, como controle lexical.

Cada candidato possui cinco regressões Ridge. A previsão experimental é limitada a 0–200 e arredondada em passos de 40. Essa regra de saída não equivale a aplicar toda a matriz de correção do ENEM. A soma serve apenas à comparação experimental do total.

## Resultados nos 654 textos reservados

Erro absoluto médio por competência, em escala 0–200; menor é melhor:

| Candidato             |    C1 |    C2 |    C3 |    C4 |    C5 |
| --------------------- | ----: | ----: | ----: | ----: | ----: |
| Mediana do treino     | 22,45 | 28,20 | 25,26 | 31,56 | 34,37 |
| Estrutura             | 22,45 | 24,16 | 20,55 | 28,93 | 28,93 |
| Semântico + estrutura | 21,28 | 24,46 | 26,54 | 30,70 | 29,97 |
| Lexical + estrutura   | 22,57 | 24,10 | 20,37 | 28,99 | 28,99 |

Erro absoluto médio do total, em escala 0–1000:

| Candidato             | MAE total | Maior erro absoluto observado |
| --------------------- | --------: | ----------------------------: |
| Mediana do treino     |    137,43 |                           600 |
| Estrutura             |    115,84 |                           600 |
| Semântico + estrutura |    119,51 |                           680 |
| Lexical + estrutura   |    115,84 |                           600 |

O candidato semântico melhorou algumas médias, mas piorou C3 e não demonstrou ganho consistente nas cinco competências. Os intervalos de melhoria por tema, obtidos por mil reamostragens dos 13 temas de teste, incluem zero nas cinco competências desse candidato. O controle estrutural/lexical mostrou melhoria mais consistente em C3 e C5. Isso não valida a qualidade pedagógica de suas notas ou uma explicação baseada apenas em contagem.

As métricas por faixa humana, erros acima de 80 pontos por competência, QWK, viés, previsões e regularizações selecionadas estão em `essay-own-training.json`. Essas métricas não são comparáveis diretamente às da etapa USP, que usou outro corpus e apenas 24 avaliações.

## Exportação e prova em JavaScript

O avaliador complementar semântico foi exportado em JSON com 166.691 bytes, contendo escalas, médias, cinco conjuntos de coeficientes e contrato de entrada. Não inclui os pesos do modelo de linguagem, que continuam necessários e têm o custo de download e memória já conhecido. Portanto, 167 KB não é o tamanho total de um corretor independente.

Três entradas reservadas tiveram a mesma saída no cálculo Python e no cálculo JavaScript dos coeficientes. O SHA-256 do artefato permaneceu igual ao repetir o treinamento. A prova verifica a aritmética dos avaliadores; não é validação completa em navegador, celular físico ou de qualidade da nota.

Os pesos treinados, embeddings e textos ficam em `tmp/essay-own-grader`, excluído do Git. Nada foi copiado para `public/` e nenhuma nota foi ligada na interface. Não há justificativas pedagógicas geradas a partir dos coeficientes.

## Reprodução local

Usar o Python isolado do laboratório. Dependências registradas em `scripts/data/essay-own-lab-requirements.txt`; instalar primeiro PyTorch CPU pelo índice oficial se for necessário recriar o ambiente. O app não ganhou dependências por causa deste treinamento.

1. `node scripts/prepare-own-essay-corpus.mjs`: corpus e licença de revisão fixa.
2. `python scripts/prepare_own_essay_data.py`: validação, limpeza e conjuntos.
3. `node scripts/cache-own-essay-encoder.mjs`: encoder fixado, conferência dos pesos e licença declarada da base.
4. `node scripts/encode-own-essay-corpus.mjs`: representações das redações sem acesso remoto.
5. `node scripts/encode-own-essay-corpus.mjs --prompts`: representações das propostas sem acesso remoto.
6. `python scripts/train_own_essay_grader.py`: ajuste, seleção na validação e medição dos candidatos.
7. `node scripts/probe-own-essay-head.mjs` e `node scripts/check-own-essay-grader.mjs`: paridade e consistência dos relatórios.

`scripts/test_prepare_own_essay_data.py` testa formatos da fonte, duplicatas, rótulos conflitantes, divisão por tema e rejeição de entrada executável. `scripts/test_train_own_essay_grader.py` verifica a escala, a aritmética e que mudar rótulos exclusivos de teste não altera pesos ou regularização.

No ambiente utilizado, a extração de representações levou aproximadamente nove minutos e cada treinamento/comparação levou cerca de 1 minuto e 45 segundos. Não são promessas de desempenho em outro computador.

## Decisão e trabalho restante

O primeiro protótipo foi treinado e avaliado. Ele não atende à liberação de um corretor profissional: há erros extremos e nenhuma melhoria consistente do candidato semântico nas cinco competências. As notas permanecem desativadas.

A próxima experiência precisa investigar representações e treinamento que capturem melhor sintaxe, argumentação e intervenção, com seleção pela validação. Não ajustar repetidamente esta experiência para melhorar os números já vistos no teste. Uma nova experiência precisa de protocolo de avaliação definido antes dos resultados e revisão pedagógica independente, incluindo casos de fuga, tangenciamento, cópia, repetição e redações insuficientes. Qualquer modelo de nota deverá abster-se quando a análise for inválida ou incompleta, sem inventar uma pontuação.

Antes do produto: esclarecer a cobertura dos direitos dos textos da base, validar em redações reais do formato do app, medir em celular físico e resolver os gates de qualidade. Nenhum treinamento pago, endpoint externo de correção ou cobrança por redação foi ativado.

## Ajuste fino do BERTimbau completo, rodada curta (21/11/2026)

Pergunta: treinar o encoder inteiro é pior que as regressões sobre representações congeladas? Receita: `neuralmind/bert-base-portuguese-cased` com média das representações e uma camada linear de cinco saídas, erro quadrático, AdamW com taxa 3e-5, 3 épocas, 384 tokens por texto, lote 8. `scripts/finetune_bertimbau_essay.py`, mesma divisão por tema (60/13/13), nos 654 textos de teste, notas arredondadas para múltiplos de 40.

Limites desta rodada (importam): CPU de 4 núcleos, sem GPU; só **400 das 3.122** redações de treino (13%); uma semente, sem ajuste de parâmetros, sem seleção de época; textos acima de 384 tokens cortados; 240 das 792 redações de validação. É um piso, não o teto do método.

| Competência                       |    C1 |    C2 |    C3 |    C4 |    C5 | QWK médio | MAE total (0 a 1000) |
| --------------------------------- | ----: | ----: | ----: | ----: | ----: | --------: | -------------------: |
| Mediana do treino                 |     0 |     0 |     0 |     0 |     0 |         0 |               137,43 |
| Estrutura                         | 0,150 | 0,362 | 0,356 | 0,358 | 0,383 |     0,322 |               115,84 |
| Semântico congelado + estrutura   | 0,293 | 0,422 | 0,279 | 0,373 | 0,389 |     0,351 |               119,51 |
| BERTimbau ajustado (400 redações) | 0,254 | 0,370 | 0,247 | 0,323 | 0,304 |     0,300 |               125,02 |

Leitura: com 13% dos dados, o ajuste fino chegou perto do QWK dos modelos treinados com todo o conjunto (0,30 contra 0,32 a 0,35) e melhorou sobre a mediana, mas não bateu o erro médio do controle estrutural. Isso NÃO mostra que o ajuste com todos os dados seja melhor ou pior: não foi testado. A literatura publicada reporta QWK de 0,60 a 0,73 por competência em redações de simulado ([JBCS 2025](https://www.ime.usp.br/~ddm/publication/barbosa-2025-jbcs)); a diferença para 0,30 é grande e não foi explicada aqui (dados, divisão, tokens e régua podem diferir; não verificado). Próximo passo para decidir: treino com os 3.122 textos, 512 tokens e seleção de época, em GPU, mais a IA da Olena com um exemplo no prompt, na mesma divisão.

## Caderno para o teste completo com GPU

`scripts/notebooks/essay_bertimbau_gpu.ipynb` roda o ajuste fino completo (3.122 redações de treino, 512 tokens, até 4 épocas, melhor época escolhida só pela validação) no Kaggle ou no Colab com GPU. Baixa o corpus na revisão fixada, confere o checksum e as contagens da divisão por tema (3.122, 792 e 654) e imprime uma tabela com QWK por competência e erro médio, ao lado das rodadas anteriores. Grava `resultado.json` sem texto de redação.

Verificado: o código do caderno rodou até o fim em CPU em modo miniatura (`SMOKE = True`), incluindo download, checksum, divisão, treino, escolha de época, teste e tabela. Não verificado: o caminho com GPU (precisão mista e `GradScaler`), que não existe neste ambiente, e a duração real (estimada em 30 a 90 minutos). Os limites de direitos dos textos de terceiros e de uso só em pesquisa continuam valendo.

## Resultado da versão 1 em GPU e versão 2 (21/11/2026)

Versão 1 do caderno (Kaggle, GPU T4, 3.122 redações, 512 tokens, 4 épocas, uma semente, taxa 3e-5), nos 654 textos de teste: QWK por competência 0,336, 0,485, 0,363, 0,457 e 0,410 (média **0,410**), erro médio no total 111,4. Melhor que as rodadas anteriores (QWK médio 0,30 a 0,35; erro 115,8 a 125,0) e abaixo da meta que tínhamos fixado (0,60 para investir, abaixo de 0,45 para encerrar). A melhor época pela validação foi a primeira, e a época 4 teve QWK de validação 0,380: mais treino não ajudou. Não há sinal de decoreba dos temas (validação 0,380, teste 0,410).

Versão 2 (`scripts/notebooks/essay_bertimbau_gpu.ipynb`): taxa 2e-5, 3 épocas, três sementes com a melhor época de cada uma escolhida só pela validação, e o resultado é a média das previsões. Meta fixada antes de rodar: QWK médio do conjunto **igual ou maior que 0,50** e nenhuma competência abaixo de 0,40; abaixo disso, encerrar o treino próprio para nota. Não se ajusta nada olhando o teste. Verificado: o código rodou em CPU em modo miniatura. Não verificado: o caminho com GPU da versão 2 e o resultado dela.

### Resultado da versão 2 e decisão (21/11/2026)

Conjunto das três sementes, nos 654 textos de teste: QWK por competência 0,381, 0,483, 0,383, 0,450 e 0,388 (média **0,417**), erro médio no total 119,6. Por semente, o QWK médio ficou entre 0,405 e 0,421, com a melhor época sendo a última. Validação do conjunto: 0,392 (sem sinal de decoreba dos temas). Contra a meta fixada antes (QWK médio de 0,50 ou mais e nenhuma competência abaixo de 0,40): **não atingida**, com C1, C3 e C5 abaixo de 0,40.

Com a versão 1, são quatro rodadas independentes entre 0,405 e 0,421: o patamar não depende da semente nem da taxa de aprendizado. O erro total piorou na versão 2 (119,6 contra 111,4) com o mesmo QWK. Leitura, não demonstrada: o limite parece estar nos dados (notas de simulado, com ruído entre corretores), não em falta de treino ou de máquina.

**Decisão da dona do projeto: encerrar o treino próprio para nota e seguir pela IA da Olena**, com comentários por competência, sem número. Não há versão 3 (ajustar mais contra o mesmo teste inventaria um resultado melhor). O que mais moveria a nota no futuro são dados melhores: redações oficiais corrigidas por pessoas, com direitos dos textos conferidos.
