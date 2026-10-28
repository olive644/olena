# Capa do caderno

Existe uma única capa, igual na estante, na vitrine 2D e no caderno 3D. Não há inventário de
capas nem o botão Personalizar, e a capa não tem personagens.

O desenho fica em `src/components/notebook-3d/notebook-cover-paint.ts`, em papel recortado:
couro roxo com grão, painel colado com costura tracejada creme, céu noturno com lua crescente,
constelação e estrelas amarelas, colinas de papel em três tons, cantoneiras amarelas com dobra
nos cantos de fora e a assinatura "OLENA STUDY". A faixa de baixo fica livre para a etiqueta do
título, que é texto vivo (HTML na vitrine 2D, textura desenhada na cena 3D).

- Cena 3D: a capa e a contracapa são desenhadas na hora pelo mesmo módulo, com os cantos de fora
  arredondados (a lombada fica reta). A contracapa traz o medalhão da lua e a etiqueta "Este
  caderno pertence a".
- Estante e vitrine 2D: `public/notebook-covers/capa-estrelas.webp` (1200 por 1624 pixels), gerada
  pelo mesmo desenho com `node scripts/notebook-cover-art/generate.mjs`. O script usa
  `@napi-rs/canvas`, que já vem instalado como dependência opcional do leitor PDF. A constante
  `NOTEBOOK_COVER_ART` em `src/components/notebook-cover-art.ts` é a única fonte do caminho.

Para mudar a arte, editar `notebook-cover-paint.ts`, rodar o script e conferir a capa nas duas
vitrines. O campo `coverStyle` continua aceito nos dados salvos só para não invalidar cadernos
antigos; ele não muda o desenho.
