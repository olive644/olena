# Helena em Rive

A Helena do assistente flutuante é um arquivo Rive (`public/helena-assistant/helena.riv`) com a
estrela de papel do assistente antigo, em vetor, e a Helena do favicon, fatiada em camadas.
O componente `src/components/helena-mascot.tsx` só toca o arquivo e passa o estado visual.

## Arquivos

- `slice.cjs`: fatia `public/olena-favicon.png` (512 px) em cabeça, orelhas, íris, pupilas e
  estrelinha da orelha, e grava em `layers/` as camadas e `layers.json` (posições e pivôs).
  Precisa de `@napi-rs/canvas`, que chega como dependência transitiva; só é usado aqui.
- `generate.cjs`: monta o `.riv` (formato binário do runtime oficial, versão 7) a partir das
  camadas: hierarquia, 26 animações e a máquina de estados `Helena`. Não usa o editor do Rive;
  ajustes manuais no editor exigiriam remontar as camadas lá.

Refazer: `node scripts/helena-rive/slice.cjs` (só se o favicon mudar) e depois
`node scripts/helena-rive/generate.cjs`. A saída é determinística: as mesmas camadas geram o
mesmo arquivo, byte a byte.

## Máquina de estados `Helena`

Camada Corpo (forma, gestos e reações) e camada Olhar (só as pupilas).

| Entrada      | Tipo             | Uso                                                                     |
| ------------ | ---------------- | ----------------------------------------------------------------------- |
| `aberta`     | sim/não          | Helena (sim) ou estrela (não), com a transformação entre elas           |
| `arrastando` | sim/não          | pendurada enquanto o botão é arrastado; ao soltar, cai e assenta        |
| `lado`       | número de -1 a 1 | inclina para o lado do arrasto                                          |
| `atenta`     | sim/não          | ponteiro por perto: orelhas em pé e olhar seguindo                      |
| `olharX`     | número de -1 a 1 | para onde as pupilas olham quando atenta                                |
| `clique`     | número           | 1 a 5 disparam reações da Helena, 11 a 13 da estrela; voltar a 0 depois |

## Runtime

`public/helena-assistant/rive.js` e `rive.wasm` são o pacote `@rive-app/canvas` 2.43.0 (MIT,
`LICENSE-rive.txt`), copiados sem alterações de https://registry.npmjs.org/@rive-app/canvas.
Ficam fora do bundle: o script e o WebAssembly só são buscados quando a animação entra, sempre
do próprio site, dentro da CSP atual (`script-src 'self' 'wasm-unsafe-eval'`, `connect-src 'self'`).
Consulta OSV para npm/@rive-app/canvas 2.43.0 sem avisos em 2026-10-13.

SHA-256:

- rive.js: 5593e4cb39087ac30221c3c557640e22b1aa6605e84ed9a83641f9cc04f374bb
- rive.wasm: 1ae8a8c64fc6e6fc521d8eb101bb4f3c6f62ae0ee2b4e7277a532e7311821782

Orçamento próprio verificado por `npm run performance:check` (512 KiB de JS, 2,25 MiB de WASM e
1 MiB de `.riv`), separado do JavaScript da aplicação.
