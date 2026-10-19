# Tomate do Pomodoro em Rive

Gera a animação do tomate da aba Foco: ele é comido por oito mordidas de verdade, uma a cada
oitavo do tempo escolhido, com pedaço que salta, partículas e brotar de novo no fim.

## Comandos

- `node scripts/tomato-rive/art.cjs`: desenha as camadas em papel recortado (`layers/*.png`,
  `layers.json`) e os quadros estáticos `public/pomodoro-tomato/estagio-0..8.webp`.
- `node scripts/tomato-rive/worm.cjs`: gera `public/pomodoro-tomato/minhoca.svg`, o quadro estático da minhoca. `art.cjs` usa as mesmas formas para recortar os gomos, os olhos e a boca em camadas.
- `node scripts/tomato-rive/sound.cjs`: sintetiza `public/pomodoro-tomato/mordida.wav` (sem amostras de terceiros), o som de cada mordida. O estalo principal cai em 0,22 s, o instante da troca de estágio na animação (`T_SWAP`).
- `node scripts/tomato-rive/generate.cjs`: monta `public/pomodoro-tomato/tomato.riv`.
  `TOMATO_OUT` troca o destino, útil para depuração.

## Rig

- Máquina "Tomate", entradas `etapa` (número de 0 a 8) e `instante` (bool, salto sem animar).
- Camada "Estagio": estágios S_0..S_8, mordidas B_0..B_7 e brotar R. Subir um estágio toca a
  mordida; voltar a 0 toca o brotar; saltos maiores usam `instante`.
- Camada "Ambiente" (parado): o tomate respira, sobe e desce e balança, a folha acompanha, e a minhoca ondula da cauda para a cabeça, pisca e mastiga. Ciclo de 12 s, sem emenda. Quando o Rive carrega, a minhoca do canvas substitui o quadro estático (`:has` no CSS).
- A etapa vem de `tomatoStage` em `src/domain/pomodoro-tomato.ts`, igual para 25 ou 50 minutos.

## Verificação

- `src/domain/pomodoro-tomato.test.ts` confere o mapa de etapas e a geometria do canvas.
- `e2e/pomodoro-tomato.spec.ts` avança o relógio e confere mordidas, reinício e movimento reduzido.
- Com movimento reduzido nada de Rive é baixado: só o quadro estático da etapa.
