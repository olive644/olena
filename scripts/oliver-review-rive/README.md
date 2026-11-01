# Oliver explicando em Rive

Arte nova: `artifacts/math-oliver-review/oliver-tutor-v1.png`, 1254x1254.
Referência preservada. `slice.cjs` extrai corpo, mão elevada, boca e dois olhos;
preenche o rosto sob as peças e cria uma aba interna no encaixe da mão.
Resíduos desconectados não pertencem ao personagem exportado. A imagem de
fallback está em `public/oliver-math-review/oliver.png`.

Refazer, sem editor externo ou dependência nova:

```sh
node scripts/oliver-review-rive/slice.cjs
node scripts/oliver-review-rive/generate.cjs
```

O gerador deriva do serializer Rive versão7 já usado no projeto, com cena e
curvas próprias desta pose. Saída: `public/oliver-math-review/oliver.riv`,
759563 bytes na rodada atual. Cinco imagens, oito animações e máquina Oliver.
Entrada clique: 2 sustentado para fala, pulso1 para acerto e pulso3 para
encorajamento. Olhar permanece central. A fala move boca e mão em ciclo de
seis segundos; repouso tem respiração e piscadas. Acerto e encorajamento podem
interromper a fala. Nenhum áudio de voz é embutido no arquivo.

`OliverReviewArt` usa o runtime existente do próprio site. Pausa com aba oculta
ou fora da viewport, libera o player ao desmontar e mantém imagem acessível
enquanto carrega ou se falhar. Movimento reduzido impede download de runtime
e rig. Não reaproveita a montagem da pose antiga nem sobrepõe uma pose diferente.

Provas: `artifacts/math-oliver-review/manifest.json`, com hashes do rig/player,
amostras de pixels da boca, contagem de áudio nativo/mute, movimento reduzido
e oito screenshots. Três testes unitários de ciclo de vida/fallback, TypeScript
e ESLint direcionado passaram. Comparação pixel a pixel do repouso Rive e PNG,
varredura de todas as poses extremas e teste Safari/aparelho físico continuam
não realizados. Não declarar esses itens como validados.
