# Continuidade do treinamento de redação

O usuário pediu em 20/11/2026 que o Claude continue o treinamento enquanto o trabalho de design prossegue. Este documento prepara a continuidade; não significa que um agente Claude foi acionado.

## Estado atual

- Branch de trabalho: `feat/redacao-propostas-estante`. Há trabalho anterior não commitado; preservar alterações existentes e não mesclar/publicar sem pedido.
- Relatório principal: `docs/research/ESSAY_OWN_GRADER.md`.
- Experimento anterior USP: `docs/research/ESSAY_GRADING_FEASIBILITY.md`.
- Notas na interface continuam desativadas. Não substituir pendência por pontuação inventada.
- Nenhuma API paga, serviço de inferência externo ou gasto por correção foi autorizado.

## Treinamento realizado

Essay-BR de revisão fixa, MIT declarada: 4.568 redações retidas. Temas separados por proposta: 60 de treino, 13 de validação, 13 de teste. Verificar direitos de textos de terceiros antes de distribuir dados/pesos no produto.

Encoder MiniLM Q8 congelado, já usado no laboratório local, com representações integrais em blocos de 126 tokens. Foram treinadas regressões para C1–C5 sobre representações congeladas e características estruturais; também existem controles estrutural e lexical. Não houve ajuste fino dos pesos do encoder.

O protótipo semântico tem MAE total de 119,51/1000 nos 654 textos de teste; maior erro absoluto 680. C3 ficou pior que a mediana do treino. Os intervalos por tema não sustentam melhoria consistente nas cinco competências. Não está liberado para pontuação de alunos.

O avaliador complementar JSON tem 166.691 bytes; isso não inclui os pesos do encoder. Foi reproduzido e conferido em JavaScript. Não houve teste completo em celular físico.

## Arquivos e comandos

Ambiente Python isolado existente: `tmp/essay-grading-lab/.venv/Scripts/python.exe`.

Cache privado ignorado pelo Git: `tmp/essay-own-grader`. Contém corpus, representações, `semantic-head.json` e fixtures. Não versionar nem copiar para `public/`.

1. `node scripts/prepare-own-essay-corpus.mjs`
2. Python do laboratório: `scripts/prepare_own_essay_data.py`
3. `node scripts/cache-own-essay-encoder.mjs`
4. `node scripts/encode-own-essay-corpus.mjs`
5. `node scripts/encode-own-essay-corpus.mjs --prompts`
6. Python do laboratório: `scripts/train_own_essay_grader.py`
7. `node scripts/probe-own-essay-head.mjs`
8. `node scripts/check-own-essay-grader.mjs`

Representações já estão disponíveis no cache; conferir hashes e índices antes de reutilizar. Dependências isoladas: `scripts/data/essay-own-lab-requirements.txt`. Não adicionar bibliotecas de treinamento ao bundle do app.

Testes Python: `scripts/test_prepare_own_essay_data.py` e `scripts/test_train_own_essay_grader.py`. Oito testes passaram, além de ESLint, formatação e conferência independente dos relatórios. Não confundir isso com aprovação pedagógica.

## Próximo trabalho

Definir a próxima experiência antes de observar seus resultados. Investigar representações/ajuste fino que capturem sintaxe, argumentação e intervenção. Escolher parâmetros pela validação, sem otimizar repetidamente os números do teste já visto. Avaliar por tema, faixa de nota, situações de zero/abstenção e redações em prosa real do app, além de revisão humana independente.

Não transformar similaridade temática em nota, não gerar justificativas pedagógicas a partir de coeficientes e não atribuir confiança calibrada onde ela não foi medida. Não ativar notas apenas porque um modelo retorna números válidos.

O orçamento global de JavaScript do app já estava acima do limite antes desta continuidade. Não aumentar o limite nem adicionar novos modelos ao carregamento inicial para contornar o gate. O treinamento atual não acrescentou dependências ao app.
