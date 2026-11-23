# Estimativa TRI local do OlenaStudy

Modelo 3PL + EAP, priori normal padrão, 40 pontos igualmente espaçados de -4 a 4.
Escala empírica por área, adaptada da referência MIT de Pedro Mantovani, commit 2970bd3dbe7f11c7987ca67cb1a5494c9677b73e.
Licença e atribuições: /third-party/enem-tri.txt.

## Cobertura e correspondência

O índice contém 52 combinações de caderno/área dos cadernos padrão de 2011–2025.
Cada sequência de gabarito, incluindo idioma, foi comparada integralmente com o PDF oficial do Inep antes de liberar os parâmetros.
Não se infere o código do caderno somente pela cor. Candidatos com a mesma sequência mas parâmetros divergentes são rejeitados.
Edições sem parâmetros, provas excluídas pela referência por inconsistências, sequências incompletas e outras versões não verificadas mostram indisponibilidade, sem cálculo proporcional como alternativa.
2026 não tem parâmetros nesta base. 2010 não teve gabarito textual conferido. Detalhes por área em audit.json.

## Reprodução

1. Clone a referência no commit indicado.
2. Use scripts/fetch-enem-catalog.py e scripts/fetch-enem-covers.py para manter os documentos oficiais.
3. Extraia o texto dos gabaritos com parseOfficialAnswerKey (src/data/enem-answer-key.ts). Formato esperado: lista de {year,day,key}, com chaves q:46, english:1 e spanish:1.
4. Execute scripts/build-enem-tri.py --reference CAMINHO --keys ARQUIVO_JSON.
5. Execute os testes de enem-tri e enem-tri-loader.

## Validação independente

scripts/validate-enem-tri-reference.py executa as funções originais da referência com NumPy e cria 398 fixtures, incluindo 200 casos com notas oficiais de 2022 (40 por área e por idioma em LC).
Dados de validação: INEP / Pedro Mantovani, https://doi.org/10.5281/zenodo.20130840, CC BY 4.0. Sem identificadores pessoais.
A amostra apresentou erro zero após arredondamento a uma casa decimal; isso não certifica todas as edições nem reproduz integralmente o sistema interno do Inep.
Relatório: docs/research/enem-tri-validation.json.

Nenhum serviço pago ou IA generativa é chamado. O cálculo roda no navegador; somente o arquivo pequeno da área selecionada é carregado.
