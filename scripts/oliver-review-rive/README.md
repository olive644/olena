# Oliver explicando em Rive

Arte nova: `artifacts/math-oliver-review/oliver-tutor-v1.png`, 1254x1254.
Referência preservada. `slice.cjs` extrai corpo, dois braços, dois pés, boca e dois olhos;
preenche o rosto sob as peças e cria abas internas nos encaixes.
Resíduos desconectados não pertencem ao personagem exportado. A imagem de
fallback está em `public/oliver-math-review/oliver.png`.

Refazer, sem editor externo ou dependência nova:

```sh
node scripts/oliver-review-rive/slice.cjs
node scripts/oliver-review-rive/generate.cjs
```

O gerador deriva do serializer Rive versão7 já usado no projeto, com cena e
curvas próprias desta pose. Saída: `public/oliver-math-review/oliver.riv`,
874051 bytes na versão v5. Oito imagens, dezoito animações e máquina Oliver.
Entrada clique: 2 sustentado para fala, pulso1 para salto, 3 para tristeza/retomada,
4 saudação, 5 pensando, 6 passinhos e 7 atenção. Entrada boca recebe poses discretas
de0a5, com transições de140ms; repouso usa o recorte original, reações têm curvas
temporais e retornam ao original. Olhar permanece central. Corpo e membros
preservam escala. Nenhum áudio de voz é embutido no arquivo.

`OliverReviewArt` usa o runtime existente do próprio site. Pausa com aba oculta,
libera o player ao desmontar e mantém imagem acessível
enquanto carrega ou se falhar. Movimento reduzido impede download de runtime
e rig. Não reaproveita a montagem da pose antiga nem sobrepõe uma pose diferente.

Provas atuais: `artifacts/math-oliver-review/motion-v5/index.html`, vídeos em
PC/mobile simulado claro/escuro, quadros de reações e resultados por frame.
Interrupção fala/tristeza/acerto/fala/repouso:162quadros,109áreas distintas da boca,
retorno dos inputs a zero. A pausa por viewport foi retirada porque congelava
reações ao rolar para as alternativas. Provas anteriores permanecem históricas.
Safari, aparelho físico e comparação pixel a pixel de todo o repouso continuam
não realizados. Não declarar esses itens como validados.
