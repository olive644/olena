# Oliver espiando em Rive

A arte do widget de Matemática do Espaço do aluno (`public/oliver-peeking-widget.webp`, 900 x 600) é
animada por `public/oliver-peeking-widget/oliver.riv`, montado em camadas de papel recortado. O
componente `src/components/oliver-hero-art.tsx` só toca o arquivo e passa o estado. A imagem segue
como primeiro quadro e elemento acessível; o canvas entra por cima quando o arquivo carrega.

## Arquivos

- `slice.cjs`: fatia a arte em 14 camadas em `layers/` (`layers.json` guarda posição e pivô). Usa
  `../oliver-rive/image-tools.cjs` (utilitários de pixel sobre `@napi-rs/canvas`, que chega como
  dependência transitiva).
- `generate.cjs`: monta o `.riv` (formato binário do runtime oficial, versão 7). Não usa o editor
  do Rive. A saída é determinística. `PEEK_STRESS=1 PEEK_OUT=/tmp/x.riv` acrescenta uma animação só
  de verificação com poses extremas; ela nunca vai para o arquivo publicado.

Refazer: `node scripts/oliver-peek-rive/slice.cjs` (só se a arte mudar) e depois
`node scripts/oliver-peek-rive/generate.cjs`.

## Como a arte é cortada

A arte é uma imagem só. Corpo e mãos são o mesmo componente opaco; o corte entre eles é um polígono
medido na arte que segue a aresta escura entre as peças, onde uma sobreposição de 1 a 3 px parece a
sombra natural. Regras que evitam defeitos quando uma peça se mexe:

1. O que uma peça de cima escondia é refeito na de baixo: o rosto sob olhos e boca (difusão) e uma
   aba de 8 px do corpo sob cada mão, escurecida (sombra de contato), sem gradientes à mostra.
2. A borda suavizada (alfa parcial) vai para a peça dona da borda. A do sinal de mais e a da
   divisão ficam com o próprio sinal (não com o halo), porque o Rive filtra cada camada em separado
   quando o grupo flutua em fração de pixel, e uma borda noutra camada ficaria pontilhada.
3. O halo original é preso ao sinal. Ele respira por uma cópia sem a borda do sinal, por trás
   (`pulsePlus`, `pulseDiv`), que nasce invisível e infla e acende de leve.

No repouso a soma das camadas é a arte original (diferença máxima de 3/255 no Rive).

## Máquina de estados `Oliver`

| Camada | Estados                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| Base   | `ambiente`: ciclo de 12 s (respiração, piscadas, batimentos, mãos, símbolos) |
| Reacao | `repouso`, `pulo` (1), `balanco` (2), `coracao` (3), disparados por `clique` |
| Olhar  | mistura 1D por `olharX` (-1 a 1): inclina corpo, olhos, boca e símbolos      |

Entradas: `olharX` (número, -1 a 1) e `clique` (número; 1 a 3 disparam reações e voltam a 0 logo em
seguida). Todos os períodos do ambiente dividem 12 s, então o laço fecha sem salto.

## Verificação

`slice.cjs` confere a recomposição das camadas. Para o arquivo final, renderize com o runtime
(`rive.scrub` com as animações listadas na criação da instância) num Chromium: compare o repouso
com a arte, varra quadros de cada animação procurando frestas novas na silhueta e confira com zoom
as juntas entre corpo e mãos e as bordas dos sinais. Os testes
`src/components/oliver-hero-art.test.tsx` e `e2e/oliver-hero.spec.ts` cobrem o componente.
