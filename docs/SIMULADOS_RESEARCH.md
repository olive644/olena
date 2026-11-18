# Simulados — pesquisa e implementação

- SurveyJS: temporização, pontuação e feedback de avaliações. https://surveyjs.io/form-library/examples/make-quiz-javascript/documentation
- H5P Question Set: referência de conjuntos de questões, projeto MIT. https://github.com/h5p/h5p-question-set
- Open Trivia DB API: perguntas genéricas; não transforma PDFs do usuário em avaliações. Não integrado. https://opentdb.com/api_config.php

Reutilizados PDF.js/OCR, gerador local de lacunas e materiais persistidos da biblioteca. Sem novas dependências nem envio de fontes a terceiros. A geração é heurística, não cria perguntas interpretativas com IA.

Prova: um ponto por questão, dois minutos por questão, entrega automática ao esgotar o tempo, confirmação manual, branco vale zero sobre o total. Correção só após entrega; pode refazer explicitamente. PDF baixa diretamente, paginado em A4, usando o exportador já existente.
