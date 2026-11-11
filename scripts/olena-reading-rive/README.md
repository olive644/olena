# Olena lendo em Rive

A arte do passo 1 do onboarding (`public/helena-onboarding-step-1-cutout.webp`, 640 x 640) é
cortada em 24 peças de papel e montada em `public/olena-reading/olena.riv`. O arquivo ainda não
está ligado ao onboarding.

## Arquivos

- `slice.cjs`: fatia a arte em `layers/` (`layers.json` guarda posição e pivô). Usa
  `../oliver-rive/image-tools.cjs` e `@napi-rs/canvas` (dependência transitiva). Confere a
  recomposição das camadas contra a arte e falha se ela mudar.
- `generate.cjs`: monta o `.riv` (formato binário do runtime oficial, versão 7). Não usa o editor
  do Rive. A saída é determinística. `OLENA_STRESS=1 OLENA_OUT=<arquivo>` acrescenta a animação
  `estresse` (poses extremas, só para verificar frestas); o arquivo publicado nunca a inclui.

Refazer: `node scripts/olena-reading-rive/slice.cjs` e depois
`node scripts/olena-reading-rive/generate.cjs`.

## Máquina de estados `Olena`

- Camada Base: sequência automática lendo, curiosa, lendo, cochilo, lendo, feliz, lendo, estrela.
- Camada Reacao: `alegria` (pulinho) quando `clique` vale 1.
- Entradas: `clique` (1 dispara; voltar a 0 depois) e `variacao` (1 a 5 pula para lendo, curiosa,
  cochilo, feliz ou estrela; voltar a 0 depois).
- O quadro tem 720 x 720: a arte fica a 40 px da borda, porque a cauda, as orelhas e a estrela
  saem do quadro da imagem quando se mexem.

## Verificação

Renderize com o runtime (`rive.scrub` com a animação listada na criação da instância) num
Chromium: compare o repouso com a arte, confira que cada espera começa e termina no repouso e
varra todos os quadros procurando fresta estreita, buraco fechado, costura translúcida e pixel
tocando a borda do quadro. Confira com zoom as juntas das orelhas, da cauda, do livro, das patas e
dos pés, e a estrela no meio do giro.
