# Avaliação local de notas por competência

Verificação em 20/11/2026. Nenhuma API de inferência, chave ou serviço pago foi utilizado. Nenhuma nota foi ativada no aplicativo. Não há pesos no diretório público ou dependências novas no bundle decorrentes deste experimento.

## Resultado da decisão

É tecnicamente possível executar um dos classificadores publicados da USP em JavaScript local. Isso ainda não autoriza distribuir os pesos nem demonstra correção pedagógica suficiente para liberar C1–C5 e total no produto. Recomendação: manter os modelos no laboratório até esclarecer a licença e concluir uma avaliação representativa, inclusive por tema e faixa de nota.

## Artefatos e licença

- Cinco checkpoints `kamel-usp/jbcs2025_bertimbau_base-C1` até `C5`, revisões e SHA-256 fixados em `essay-grader-audit.json`.
- Configuração: `BertForSequenceClassification`, rótulos 0, 40, 80, 120, 160 e 200; limite de 512 tokens.
- Os arquivos originais somam 2.178.672.640 bytes. Não incluem tokenizer nem ONNX; o tokenizer foi obtido da versão fixada do BERTimbau base.
- Não foi encontrada licença explícita nas model cards ou arquivos dos cinco checkpoints. O repositório `https://github.com/kamel-usp/jbcs2025` também não declara licença. A licença MIT do BERTimbau base não deve ser apresentada como autorização confirmada para redistribuir estes ajustes finos.
- A página do dataset `https://huggingface.co/datasets/kamel-usp/aes_enem_dataset` indica Apache-2.0 nos metadados e MIT na descrição. Esclarecer essa divergência e a cobertura dos textos de terceiros antes de incorporar dados ao produto.
- Os relatórios experimentais dos autores têm licença CC-BY-NC-4.0. Não foram incorporados como dados de treino ou componentes do app.

Fontes verificadas: APIs públicas e arquivos dos publicadores; `https://huggingface.co/kamel-usp/jbcs2025_bertimbau_base-C1`, respectivos C2–C5, dataset e repositório acima. Só os metadados, configurações e evidências necessárias são registrados; nenhum código do repositório de pesquisa foi copiado para o aplicativo.

## Comparação exploratória com notas humanas

Arquivo de teste oficial do dataset, configuração JBCS2025, revisão `8df4b700221dc20410e1e28900bbf215da545347`. Seleção determinística de 24 linhas igualmente espaçadas entre as 138 do split, correspondentes a 23 redações distintas. São avaliações públicas já existentes, não uma nova banca ou um holdout independente criado por nós. Não é amostra representativa de todas as notas e temas do app.

| Modelo | Erro absoluto médio (0–200) |  RMSE | Concordância exata |
| ------ | --------------------------: | ----: | -----------------: |
| C1     |                        6,67 | 16,33 |             83,33% |
| C2     |                       40,00 | 55,38 |             37,50% |
| C3     |                       36,67 | 52,92 |             41,67% |
| C4     |                       15,00 | 24,49 |             62,50% |
| C5     |                       40,00 | 55,38 |             33,33% |

O protocolo exploratório recebeu somente a redação. O código atual dos autores oferece entradas com ou sem contexto, mas a model card desses checkpoints antigos não confirma o protocolo usado para cada peso. Não apresentamos este teste como reprodução integral dos resultados publicados. Os arquivos JSON registram as previsões, notas humanas e índices; os textos permanecem apenas no cache de pesquisa.

Um texto do recorte excedeu 512 tokens e foi truncado. O teste sintético de texto longo também perdeu seu final. Não podemos obter uma nota válida do texto completo usando um corte silencioso, nem presumir que média de notas por trecho preserve os critérios do ENEM.

## Casos de falha

Sem tratamento de entrada, os cinco modelos somaram 400 pontos para `teste` e 560 para palavras-chave repetidas. Na repetição, C3 retornou 200. Esses casos não possuem notas humanas; são testes de robustez e não entram nas métricas acima. Não basta expor os cinco números retornados como uma nota de redação.

Como a entrada exploratória é apenas o texto, trocar o tema selecionado sem alterar o texto não muda os logits. A análise temática separada continua necessária; não se pode presumir que C2 detecte fuga ao tema escolhido no app.

## Conversão local

C1 exportada para ONNX e quantizada em MatMul, Gemm e Gather, somente no cache `tmp/essay-grading-lab`. Tamanho FP32: 435.967.068 bytes; Q8: 109.752.745 bytes. Três smoke tests mantiveram a classe. Nas 24 avaliações, 22 mantiveram a previsão e duas mudaram em 40 pontos. Quantização não é numericamente equivalente ao original e precisa de sua própria avaliação.

Transformers.js já instalado no projeto carregou a C1 Q8 em Node CPU com modelos remotos desabilitados. O carregamento medido foi aproximadamente 672 ms no ambiente usado; isso não é medida de download inicial, de navegador WASM ou de celular físico. O resultado desta etapa não prova viabilidade de todos os cinco modelos em aparelhos modestos.

## Reprodução

Usar Python 3.12 em ambiente isolado. As versões usadas estão em `scripts/data/essay-grader-lab-requirements.txt`; PyTorch CPU foi instalado a partir de `https://download.pytorch.org/whl/cpu`. Nenhum pacote Python foi adicionado às dependências do app.

1. Executar `node scripts/audit-essay-graders.mjs` para auditar metadados públicos fixados.
2. Executar `node scripts/download-essay-graders.mjs` para baixar os pesos ao cache de pesquisa e verificar SHA-256. São cerca de 2,18 GB; não é uma etapa do build do app.
3. O mesmo downloader prepara o tokenizer BERTimbau base e o parquet público de teste, ambos de revisões fixadas, com hash do parquet em `test-source.json`. Nenhuma redação do usuário é usada.
4. Executar `scripts/evaluate-essay-graders.py` com o Python do laboratório. Não executa código remoto nem arquivos pickle; utiliza safetensors.
5. Executar `scripts/export-essay-grader-probe.py` e `node scripts/probe-essay-grader-js.mjs` para a prova local de C1.
6. Executar `node scripts/check-essay-grader-reports.mjs` para validar revisões, escalas, contagens e aritmética dos relatórios.

## Condições antes da integração

Confirmar permissões de pesos e dados; confirmar o protocolo de entrada; avaliar todos os textos do benchmark e um conjunto separado por tema e faixa de nota; medir robustez, truncamento, quantização e desempenho em celular físico. Definir abstenção para entradas inválidas ou análise incompleta. Classificadores não produzem justificativas pedagógicas por si sós, portanto não inventar explicações causais a partir da classe prevista.

Se não houver autorização ou qualidade suficiente nos pesos publicados, o caminho seguinte é treinar e validar um avaliador próprio sobre uma base com direitos esclarecidos. Não haverá substituição silenciosa por API paga.
