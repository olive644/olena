# Acervo Enem

Fonte: https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos
Consulta: 21/11/2026. Cadernos de 2010 a 2026, primeiro e segundo dias.

`catalog.json` reúne os links de prova e gabarito divulgados nas páginas anuais do Inep. As variantes incluem cores, aplicações e versões acessíveis. Um gabarito ausente no índice é representado por null, nunca inferido por URL. As capas são a primeira página do primeiro caderno listado para cada ano e dia, extraída do PDF oficial com Poppler, sem alterar seu conteúdo. Os PDFs completos permanecem no Inep, carregados ao abrir uma prova. O cache usado para gerar capas fica em tmp e não deve ser publicado.

Atualização: `py -3.12 scripts/fetch-enem-catalog.py` e `py -3.12 scripts/fetch-enem-covers.py` (Python/Pillow e Poppler).
