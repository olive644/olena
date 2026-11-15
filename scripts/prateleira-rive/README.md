# Olena dormindo e hera da prateleira em Rive

A prateleira dos cadernos (`src/components/notebook-shelf.tsx`) tem a Olena dormindo
(`public/olena-shelf-sleeping.webp`, 480 x 240) e a hera que pende dos dois cantos (16 folhas de CSS
em `src/views/notebook-shelf.css`, `.notebook-shelf-vines`). Os dois são animados em Rive, sem o
editor do Rive: os geradores escrevem o binário (formato do runtime oficial, versão 7) e a saída é
determinística. Componentes: `src/components/olena-shelf-art.tsx` (`OlenaShelfCat`, `ShelfVines`) e
o gancho `src/hooks/use-rive-art.ts`. A imagem estática e as folhas de CSS ficam no lugar: são o
primeiro quadro, o que sobra com movimento reduzido e o que aparece se o Rive não carregar.

## Arquivos

- `rive-writer.cjs`: escritor do `.riv` (extraído de `scripts/olena-reading-rive/generate.cjs`).
- `slice-olena.cjs`: fatia a arte em `layers-olena/` e confere o repouso (falha acima de 2/255).
- `generate-olena.cjs`: monta `public/olena-prateleira/olena-dormindo.riv`.
- `slice-hera.cjs`: desenha as 3 folhas (uma por rotação do CSS) e a haste em `layers-hera/`.
- `generate-hera.cjs`: monta `public/olena-prateleira/hera.riv`.

Refazer: `node scripts/prateleira-rive/slice-olena.cjs`, `generate-olena.cjs`, `slice-hera.cjs` e
`generate-hera.cjs`, e depois `npx prettier --write scripts/prateleira-rive` (os `layers.json` saem sem formatação; o `.riv` não muda). `OLENA_STRESS=1 OLENA_OUT=<arquivo>` acrescenta a animação `estresse` (poses
extremas, só para verificar frestas); o arquivo publicado nunca a inclui.

## Olena dormindo (máquina `Olena`)

Peças: corpo, orelha esquerda, cauda, olhos (âmbar), estrela, três "z" e três brilhos. A orelha e a
cauda levam a região inteira e o corpo só perde a faixa de 7 px junto da silhueta (sem buraco e sem
contorno velho ao girar). A estrela é uma cópia por cima e o corpo fica com a original, por isso ela
só cresce e nunca gira (girar mostraria a original por baixo). Os olhos têm o fundo preenchido no
corpo. O quadro tem 16 unidades de folga em volta da arte.

Cada peça fica em quatro nós no mesmo pivô: `p` (posiciona), `r` (reação), `a` (respirar) e `v`
(variações). Camadas diferentes nunca animam a mesma propriedade do mesmo nó, e toda animação de uma
camada tem um valor para todos os trilhos dela (o que a anterior deixou fica onde está).

- Camada `Respirar` (8 s em laço): respiração, balanço lento da cauda e da estrela.
- Camada `Base`: sequência quieta, orelha, quieta, estrela, cauda, sonho, quieta, ressonar. A entrada
  `variacao` (1 a 5) pula para orelha, estrela, cauda, sonho ou ressonar (voltar a 0 depois).
- Camada `Reacao`: `clique` (1 dispara, voltar a 0 depois) assusta a Olena (pulinho, orelha, cauda,
  estrela cresce, olhos apertam). O componente liga o `clique` ao tocar na Olena.

## Hera (máquina `Hera`)

16 folhas presas à haste, cada uma balançando em volta do entalhe de cima, e a haste inteira junto.
Camada `Brisa` (6 s em laço, uma onda desce pela hera) e camada `Rajada` (calmo, rajada, calmo,
balanço). A entrada `vento` (1) dispara a rajada na hora; o app ainda não a liga a nada.

## Verificação

Renderize com o runtime (`rive.scrub`, com as animações listadas na criação da instância, sem a
máquina de estados) num Chromium. Resultado de 15/11/2026: Olena no repouso contra a arte, pior
diferença 2/255 e zero pixels acima de 4; hera no repouso contra o CSS original, diferença só no
contorno (88 de 75696 pixels acima de 40, em 2x). Olhe com zoom as juntas da orelha e da cauda, a
estrela no pico do pulso e os "z".
