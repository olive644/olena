# Tomate do Pomodoro em Rive

Gera a animação do tomate da aba Foco: ele é comido por oito mordidas de verdade, uma a cada
oitavo do tempo escolhido, com boca, partículas e brotar de novo no fim.

## Comandos

- `node scripts/tomato-rive/art.cjs`: desenha as camadas em papel recortado (`layers/*.png`,
  `layers.json`) e os quadros estáticos `public/pomodoro-tomato/estagio-0..8.webp`.
- `node scripts/tomato-rive/generate.cjs`: monta `public/pomodoro-tomato/tomato.riv`.
  `TOMATO_OUT` troca o destino, útil para depuração.

## Rig

- Máquina "Tomate", entradas `etapa` (número de 0 a 8) e `instante` (bool, salto sem animar).
- Camada "Estagio": estágios S_0..S_8, mordidas B_0..B_7 e brotar R. Subir um estágio toca a
  mordida; voltar a 0 toca o brotar; saltos maiores usam `instante`.
- Camada "Ambiente": respiração do tomate e balanço da folha em ciclo de 12 s.
- A etapa vem de `tomatoStage` em `src/domain/pomodoro-tomato.ts`, igual para 25 ou 50 minutos.

## Verificação

- `src/domain/pomodoro-tomato.test.ts` confere o mapa de etapas e a geometria do canvas.
- `e2e/pomodoro-tomato.spec.ts` avança o relógio e confere mordidas, reinício e movimento reduzido.
- Com movimento reduzido nada de Rive é baixado: só o quadro estático da etapa.
