# Perfil, livro e atualização por gesto

- @bizzok conserva BETA TESTER e deixa de receber DEV e GALAXIA pela regra compartilhada.
- Livro da Olena sem borrão externo, mantendo pose, estrela, lenço, facetas e transparência. WebP 900x600, 49.232 bytes. Fonte e hashes em `art-source.json`.
- Atualização por gesto usa livro e estrela originais em papel, anúncio traduzido e movimento reduzido. Espaço, Perfil e Notificações recebem o gesto; telas de edição, prática, foco e sala preservam seus próprios gestos.
- Lápis anterior do HelenaLoading foi extraído para SVG com animação e crédito preservados. Sem dependência nova. JavaScript inicial 219,5 KiB; total 1741,8 KiB, dentro dos orçamentos existentes.

## Validação

33 testes focados passaram (selos, gesto, HelenaLoading, carrossel e entrada). Os 14 cenários de navegador passaram: oito do widget/prioridade e seis da atualização, incluindo toque enviado pelo protocolo do Chromium.

Capturas `desktop-light.png`, `desktop-dark.png`, `mobile-light.png` e `mobile-dark.png` cobrem os dois temas em 1280 e 320 px. Reprodução com servidor na porta 4176: `node artifacts/profile-refresh/capture.mjs`. SVG do lápis validado no Chromium com animação normal e movimento reduzido. Android físico e Safari não verificados. A página não controla indicadores externos do navegador ou do sistema.

`npm run verify` passou: lint sem erros (27 avisos existentes), formatação, API, idiomas, 413 arquivos e 2.676 testes, build e orçamento de desempenho. O benchmark do caderno passou nesta execução. Nenhum limite de teste ou de desempenho foi ampliado.
