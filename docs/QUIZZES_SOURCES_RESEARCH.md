# Quizzes por fontes — implementação e pesquisa

- Geração local usa PDF.js/OCR e fatos extraídos pela mesma base dos flashcards. Questões de completar, 3 alternativas no Fácil e 4 no Médio/Difícil, limites de 5/10/15. Fonte insuficiente é recusada. Não equivale a geração semântica por IA; a dificuldade é heurística (quantidade/proximidade das alternativas).
- JSON versionado guardado como material da pasta, com gabarito e página/fonte. Fluxo verificar, correção, continuar, resultado, repetir e registro de quiz na estrutura existente.
- SurveyJS Form Library (MIT): https://surveyjs.io/form-library/documentation/overview ; https://github.com/surveyjs/survey-library . Útil para questionários configuráveis, não necessário para este fluxo próprio.
- H5P Multiple Choice: https://github.com/h5p/h5p-multi-choice . Referência de execução de múltipla escolha e feedback; não integrado.
- Open Trivia DB: https://opentdb.com/api_config.php . API JSON sem chave, conteúdo CC BY-SA 4.0, limite uma chamada a cada 5 segundos por IP. Banco de trivia não gera a partir dos PDFs do usuário; não integrado.
- PDF.js: https://github.com/mozilla/pdf.js . Já usado pelo projeto; reutilizado. Nenhuma dependência ou serviço pago novo.

Validação: geração a partir do PDF ENIAC na prévia, seleção, erro/correção com página, avanço e persistência após recarregar. Largura 390 px sem transbordamento horizontal. Testes de geração, conteúdo inválido e conclusão/pontuação. Visual claro e escuta do áudio pendentes.
