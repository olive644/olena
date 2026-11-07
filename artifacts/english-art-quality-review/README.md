# Revisão das artes inglesas, 07/11/2026

As 74 artes foram refeitas: recortes antigos de 157 ou 256 px foram substituídos por células nativas de 627 px, reduzidas para WebP 512 px e miniaturas 256 px. Nenhuma ampliação. Fontes PNG originais preservadas em /workspace/generated_images; prompts, dimensões, recortes e hashes constam em docs/achievement-english-art-sources.json.

As oito poses máximas incluem barco, chá e relógio, cartões, telescópio, apresentação, caminhada com lanterna, mala e leitura sentada. IDs e progressão permanecem iguais.

Comparação no componente real AchievementArt, com Matemática e Inglês no mesmo tamanho CSS; poses exibidas com o efeito raro compartilhado. Fixtures locais, sem dados de conta. Desktop 1280 × 900 e mobile 320 × 568, temas claro e escuro, movimento reduzido, verificação de ausência de overflow horizontal.

- [Comparação desktop clara](desktop-comparison-light.png)
- [Comparação desktop escura](desktop-comparison-dark.png)
- [Poses desktop](desktop-poses-light.png)
- [Comparação mobile](mobile-comparison-light.png)
- [Poses mobile escuras](mobile-poses-dark.png)

Reproduzir com `npm run dev -- --host 127.0.0.1 --port 4174` e `node artifacts/english-art-quality-review/capture.mjs`. O roteiro usa Chromium instalado em /usr/bin/chromium. Exportar com `python scripts/achievement-art/english_art.py --plan docs/achievement-english-art-sources.json`.

## Ajuste aprovado em 06/11, Recife

Removidos os grupos de três raios amarelos de oito artes: acertos globais 50/100/250, quatro níveis de objetos da parte 4 e a confirmação dessa parte com Olena. As outras células dos atlas editados mantêm as fontes anteriores. Bordas turquesa conferidas nas 74 conquistas; folha azul descartada permanece fora da entrega.

- [Oito correções no desktop](desktop-cleanup-light.png)
- [Oito correções no celular escuro](mobile-cleanup-dark.png)
