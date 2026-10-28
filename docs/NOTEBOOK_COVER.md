# Capa do caderno

Existe uma única capa, igual na estante, na vitrine 2D e no caderno 3D. Não há mais
inventário de capas nem o botão Personalizar.

Arquivo de produção: `public/notebook-covers/olena-arco.webp`, 1200 por 1600
pixels. O arco, a bússola, o ticket e o carimbo são desenhados em papel recortado
sobre fundo roxo, sem texto fixo na imagem. O título do caderno é texto vivo sobre
a etiqueta (HTML na vitrine 2D, textura desenhada na cena 3D). A constante
`NOTEBOOK_COVER_ART` em `src/components/notebook-cover-art.ts` é a única fonte do
caminho.

A contracapa do 3D usa `public/notebook-covers/olena-mesa.webp`, recorte da arte da
Olena na mesa fornecida pelo proprietário.

As capas antigas Helena e Oliver (`helena-estrelas.webp`, `oliver-estrelas.webp`)
foram removidas do site. O campo `coverStyle` continua aceito nos dados salvos
(`src/domain/workspace.ts` e `src/data/local-workspace.ts`) só para não invalidar
cadernos já guardados; ele não muda mais o desenho.

## Como a arte foi feita

Desenhada por um script local de canvas (não versionado) e convertida para WebP.
Para trocar a arte, gerar outra imagem de 1200 por 1600 com a faixa da etiqueta
livre na parte de baixo e as quinas respeitando o recorte da vitrine.
