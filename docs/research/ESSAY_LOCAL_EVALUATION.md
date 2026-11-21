# Avaliação local de correção de redação

Data: 20/11/2026. Objetivo: escolher componentes gratuitos que ajudem a corrigir redações sem a API do Olena, sem cobrança por chamada e sem transformar similaridade em nota.

## Decisão

Os projetos pesquisados ajudam como referência ou componentes, mas nenhum foi aprovado nesta avaliação como corretor completo pronto para o navegador. A revisão ortográfica local existente permanece ativa. Os modelos semânticos foram executados apenas no laboratório isolado `tmp/essay-model-evaluation`, sem adicioná-los às dependências de produção, à política CSP ou ao download dos usuários.

MiniLM e E5 são candidatos a **sinal de pertinência temática**, não a avaliadores das cinco competências. Não há limiar calibrado para anunciar fuga ao tema, nem pontuação Enem validada. Não há motivo demonstrado para escolher o segundo em vez do primeiro com esta amostra: ambos acertaram os mesmos 11/12 casos pertinentes e confundiram a mesma paráfrase.

## Inspeção dos repositórios

| Projeto e revisão inspecionada                                                                                            | Licença observada                                | Evidência e decisão                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [IME-USP/correcao-enem](https://github.com/mateuslatrova/correcao-enem), `ad0cb852f709f58120a02b26d6d52010ce83e75a`       | MIT                                              | Código e notebooks de fuga ao tema e aglomerados de palavras. Dependências Python/PyTorch/CUDA; notebooks usam Colab e dados de treinamento. Não encontrei um checkpoint ONNX ou pesos de classificador pronto na árvore inspecionada. Referência útil, não executado como corretor completo. |
| [NILC-Metrix](https://github.com/nilc-nlp/nilcmetrix), `5416e430747530e0054a45259329a306d37c8b69`                         | AGPL-3.0                                         | Métricas de português; README pede ferramentas de aproximadamente 2 GB, Docker e PostgreSQL. Não instalado, nem copiado para o app. Exigiria avaliar componentes e obrigações da licença antes de integrar.                                                                                   |
| [UTFPR/CorrecaoRedacao](https://github.com/IC-Redacoes-UTFPR/CorrecaoRedacao), `7f2ae90c27d2b1c5498324fc522901783724e924` | Não identificada na inspeção da árvore/metadados | Experimentos com modelos de 7B a 72B, adaptadores LoRA e chamadas a APIs em etapas posteriores. Adaptador não substitui o modelo-base. Não executei os experimentos completos nem incorporei código/pesos. Publicidade do código não basta para assumir permissão de redistribuição.          |
| [dsvi-b/corretor-enem](https://github.com/dsvi-b/corretor-enem), `e3807a6f11bbed7e201bf6b75f0b3c11b5a782aa`               | MIT                                              | Rubricas e corpus SQLite usados por um agente de programação. O agente interpreta a redação. O anúncio de ausência de API própria não significa que o raciocínio seja executado sem modelo. Não adotado como motor autônomo.                                                                  |

A inspeção é de documentação, código e artefatos publicados. Não comparar as métricas dos autores como se tivessem sido reproduzidas neste equipamento.

## Experimento executado

Runtime isolado: `@huggingface/transformers@3.8.1`, ONNX Runtime CPU. Equipamento: Intel Xeon E5-2670 v3, Windows, aproximadamente 8 GB de RAM total. Sem GPU, servidor de inferência, chave de API ou serviço pago.

Modelos fixados por hash:

- [MiniLM multilíngue ONNX](https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2), `2c4055b12046f11709e9df2c122e59ffbdc2f900`. Modelo-base declara Apache-2.0; a conversão não traz licença explícita no metadado consultado. Conferir a cadeia de licenças antes de redistribuir.
- [E5-small multilíngue ONNX](https://huggingface.co/Xenova/multilingual-e5-small), `761b726dd34fb83930e26aab4e9ac3899aa1fa78`. Modelo-base intfloat/multilingual-e5-small declara MIT; conferir também a conversão antes de redistribuir.

Cada modelo possui cerca de 118,3 MB de pesos quantizados e 17,1 MB de tokenizer, aproximadamente 129 MiB combinados, fora do runtime. Esse tamanho não foi adicionado ao app. Inferência local elimina cobrança por chamada, mas não o custo de distribuição, armazenamento, bateria e processamento no aparelho.

### Casos

26 execuções por modelo, seis assuntos: cidadania digital, estigma de saúde mental, permanência escolar, trabalho por plataformas, resíduos e violência contra a mulher. Incluem seis textos pertinentes, seis paráfrases, seis textos de outro tema, seis repetições de palavras-chave, um texto sem sentido e uma palavra isolada. São 20 textos distintos, pois os casos de outro tema reutilizam textos pertinentes de outras categorias.

Textos autorais de controle, sem notas de professores. Os resultados não medem precisão de nota, desempenho em redações completas ou equivalência à banca. A referência temática contém uma descrição curta de cada tema, não todos os textos motivadores.

### Resultados

| Medida                                              | MiniLM    | E5-small  |
| --------------------------------------------------- | --------- | --------- |
| Tema esperado nos textos pertinentes/paráfrases     | 11/12     | 11/12     |
| Carregamento inicial com download                   | 16,46 s   | 17,04 s   |
| Carregamento com arquivos em cache e rede bloqueada | 1,32 s    | 1,32 s    |
| Mediana por texto, execução com rede bloqueada      | 17,09 ms  | 16,92 ms  |
| Maior tempo por texto, mesma execução               | 32,16 ms  | 36,80 ms  |
| RSS do processo ao final da execução offline        | 395,8 MiB | 420,3 MiB |

Memória é o RSS total do processo Node, não memória incremental do modelo nem pico monitorado. Medições não foram feitas em celular físico ou no browser; não usar esses números como promessa mobile.

Ambos confundiram a paráfrase de transporte de passageiros por aplicativo com cidadania digital. A margem entre o primeiro e o segundo tema foi de cerca de 0,001: um caso que exige abstenção, não declarar fuga ao tema.

As seis listas de palavras-chave foram associadas ao tema correto em ambos os modelos, embora não sejam redações argumentativas. Isso não é erro na tarefa de similaridade, mas comprova que **similaridade temática não demonstra qualidade de redação**. Um pipeline que a convertesse diretamente em nota aceitaria esse atalho.

Os textos sem sentido e a palavra isolada também recebem algum vizinho mais próximo. O fato de existir um primeiro colocado nunca é evidência suficiente para aprovar o texto.

## Caminho de integração recomendado

1. Manter ortografia e sugestões explícitas locais já existentes.
2. Preparar rubricas editoriais por proposta, com critérios verificáveis e exemplos que não sirvam como redação-modelo para copiar.
3. Tratar repetição, cópia literal dos motivadores e insuficiência como sinais com evidência, sem inventar leitura semântica por contagem de conectivos.
4. Avaliar pertinência por trechos e com possibilidade de abstenção, incluindo temas próximos entre as 60 propostas. Os dois modelos deste teste são candidatos apenas a essa camada.
5. Antes de nota C1-C5, testar um classificador especializado ou modelo local com redações reais corrigidas, temas separados entre treino e teste e casos adversariais. Não aprovar um modelo apenas por acertar estes textos autorais.
6. Para qualquer download opcional no produto, medir em celular físico, permitir recusa e manter o editor utilizável sem o modelo. Não carregar aproximadamente 129 MiB silenciosamente.

Nenhuma API do Olena ou API paga foi usada. A próxima integração depende de resultados de qualidade e compatibilidade, não de contratar um provedor.

## Reproduzir

Instalar somente no diretório de laboratório, sem alterar o package.json do app:

```powershell
npm install --prefix tmp/essay-model-evaluation --no-audit --no-fund @huggingface/transformers@3.8.1
node scripts/evaluate-essay-topics.mjs tmp/essay-model-evaluation minilm
node scripts/evaluate-essay-topics.mjs tmp/essay-model-evaluation e5
node scripts/evaluate-essay-topics.mjs tmp/essay-model-evaluation minilm offline
node scripts/evaluate-essay-topics.mjs tmp/essay-model-evaluation e5 offline
node scripts/check-essay-evaluation.mjs
```

A primeira execução baixa pesos públicos e os armazena no cache do laboratório. As execuções `offline` bloqueiam fetch e usam apenas o cache. Relatórios incluem hash, runtime, equipamento, resultado por caso, similaridade e tempos, sem notas de redação.
