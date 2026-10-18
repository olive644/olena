# Oliver em Rive

A arte do Oliver do Espaço do aluno (`public/oliver-math-islands.png`, 720 x 791) é animada por um
arquivo Rive, `public/oliver-math-islands/oliver.riv`, montado em camadas de papel recortado. O
componente `src/components/oliver-hero-art.tsx` só toca o arquivo e passa o estado.

## Arquivos

- `image-tools.cjs`: utilitários de pixel (máscaras, dilatação, componentes, preenchimento).
  Só usa `@napi-rs/canvas`, que chega como dependência transitiva.
- `slice.cjs`: fatia a arte em 25 camadas em `layers/` (`layers.json` guarda posição e pivô).
- `generate.cjs`: monta o `.riv` (formato binário do runtime oficial, versão 7). Não usa o editor
  do Rive. A saída é determinística. `OLIVER_STRESS=1 OLIVER_OUT=/tmp/x.riv` acrescenta uma
  animação só de verificação com poses extremas somadas, que nunca vai para o arquivo publicado.

Refazer: `node scripts/oliver-rive/slice.cjs` (só se a arte mudar) e depois
`node scripts/oliver-rive/generate.cjs`.

## Como a arte é cortada

A arte é uma imagem só, então cada peça sai por cor (Oliver, ilha, adereços) e por polígonos
(braços e pernas). Duas regras evitam defeitos quando uma peça se mexe:

1. Faixa de sobreposição: a peça de baixo (perna, braço) mantém uns pixels sob a de cima, então um
   giro pequeno não abre fresta. Só entram pixels opacos (alfa 250 ou mais: o interior da arte
   tem 252 a 254, nunca 255). Um limiar de 255 deixaria todas as faixas vazias e abriria frestas
   de 1 px nas juntas assim que o corpo girasse.
2. O que uma peça escondia é refeito na peça de baixo: o rosto sob olhos e boca (preenchimento por
   difusão) e a ilha sob os pés, com facetas chapadas no estilo de papel recortado, para quando
   o personagem pula e deixa o chão à mostra.

No repouso a soma das camadas é a arte original (diferença máxima de 4/255 na fatiagem e de 3/255
renderizada pelo Rive), então a troca da imagem pelo canvas não tem salto.

## Rig

Cada peça tem quatro nós aninhados no mesmo pivô: posição (nunca animado), reação, olhar e
ambiente. Cada camada da máquina de estados anima só o seu nível, então nada disputa a mesma
propriedade. O Rive pinta primeiro o que vem primeiro no arquivo: as imagens são criadas no fim,
da frente para trás, independentemente da hierarquia de nós.

## Máquina de estados `Oliver`

| Camada | Estados                                                                   |
| ------ | ------------------------------------------------------------------------- |
| Base   | `ambiente`: ciclo de 12 s (respiração, piscadas, aceno, chama, adereços)  |
| Reacao | `repouso`, `pulo` (1), `aceno` (2), `animo` (3), disparados por `clique`  |
| Olhar  | mistura 1D por `olharX` (-1 a 1): inclina corpo, olhos, boca, braços etc. |

Entradas: `olharX` (número, -1 a 1) e `clique` (número; 1 a 3 disparam reações e voltam a 0 logo
em seguida). Todos os períodos do ambiente dividem 12 s, então o laço fecha sem salto.

## Verificação

`slice.cjs` confere a recomposição das camadas. Para o arquivo final, renderize com o runtime
(`rive.scrub`) em um Chromium: compare o repouso com a arte original, varra quadros de cada
animação e procure frestas novas na silhueta (fechamento morfológico menos o repouso). Os testes
`src/components/oliver-hero-art.test.tsx` e `e2e/oliver-hero.spec.ts` cobrem o componente.
