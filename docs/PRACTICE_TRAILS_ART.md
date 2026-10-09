# Interiores das trilhas de Praticar

## Revisão com caminho limpo e composições móveis (2026-10-08)

Modo: ferramenta integrada image_gen, edição das referências locais inspecionadas. Os interiores anteriores foram preservados; dez arquivos finais foram salvos em public/practice-trails, cinco *-clean.webp (desktop) e cinco *-mobile.webp (mobile). Conversão WebP mecânica com Sharp, qualidade 90, sem redesenho por código. Versões verticais nativas 1024 × 1536, horizontais 1672 × 941. O layout conserva a proporção de cada arte; coordenadas foram ajustadas após inspeção dos patamares.

Conjunto final de prompts:

> Edit the referenced approved Olena learning island interior. Preserve exactly the distinctive handcrafted matte cut-paper low-poly cartoon style, richly faceted objects, folded edges, original material language and discipline palette. Reconstruct composition only. Output a high-resolution portrait 1024x1536 mobile game environment, crisp fine edges, no blur, not a screenshot. A single clean continuous path runs vertically from bottom to top in the central corridor, roughly x=46%-54%, with four clear flat open landings centered at x=50%, y=85%,63%,41%,19%. Keep connecting path obvious and unbroken, restrained gentle bends, steps only where terrain changes elevation. No branching paths, scattered tiles, zigzag stairs, intersections or unrelated paths. Keep buildings, monuments, trees, crystals and decoration in left and right strips x<32% and x>68%. Central corridor uncluttered natural themed terrain, not a blank white stripe. Elevated orthographic view, uniform scale. Preserve original identity. No characters, UI, labels, numerals, buttons, text or white square placeholders.

Temas específicos acrescentados a cada prompt:

- Português: vermilion terracotta canyon, cream folded-paper path, red-leaf trees, little book libraries, quill monuments, amber lanterns.
- Química: aqua and teal mineral canyon, cream hexagonal stone trail, cyan waterfalls, amber crystals, molecule sculpture, flask laboratory.
- Biologia: lush green forest, warm earth footpath with sparse cream stepping stones, streams, greenhouse, DNA monument, roots and leafy trees.
- Matemática: royal blue geometric canyon, cream geometric paving, gold accents, compass monument, protractor arch and faceted solids.
- Programação: petrol blue circuit valley, dark teal paving with a single subtle gold center circuit trace, keyboard buildings, Python sculpture, code bracket monuments, turquoise bridges.

Segundo prompt, uma edição por disciplina, usando sua versão vertical como referência:

> Image 1 is the approved Olena portrait trail, edit target. Change framing into landscape 1920x1080 desktop game environment. Preserve exactly original matte cut-paper cartoon, folded edges, beautiful faceted architecture, materials and palette. A single restrained vertically continuous main path in central x=46%-54% from bottom to top with four empty flat roomy landings. Every landing physically connected, no forks, maze, intersections or scattered stairs. Scenery and monuments only at left x<32% and right x>68%, never across middle. Middle quiet natural themed trail, no empty white rectangle. Overhead orthographic composition, uniform scale, no horizon. Crisp edges, no blur. No UI, numerals, text, characters, white square placeholders, buttons or painted level markers. Change only composition, keep approved original papercraft identity.

Todos os resultados foram inspecionados antes da integração. A imagem gerada não define o estado dos níveis: marcadores SVG, avatar, seleção, movimento e iluminação continuam sendo interface acessível.

## Produção

Gerados com a ferramenta integrada image_gen, sem CLI/API externa. Referências: as ilhas aprovadas em public/practice-islands e os primeiros interiores avaliados pelo proprietário. Os primeiros cenários com corredor gramado repetido foram descartados. Os interiores finais têm piso e composição próprios, não só paletas ou objetos diferentes.

Saídas finais: public/practice-trails/{portuguese,chemistry,biology,mathematics,programming}.webp e variantes -small.webp. Conversão WebP com Sharp do runtime local, 1536 px qualidade 82 e 960 px qualidade 80; nenhuma dependência adicionada ao aplicativo. PNGs originais preservados no diretório de imagens geradas do Codex.

As faixas centrais ficam livres para níveis, ordenados de baixo para cima. Botões, números, foto e trilha são elementos reais da interface, não texto desenhado na imagem. As quatro paradas atuais representam temas exploráveis, não limite de níveis, conteúdo didático aprovado, progresso ou XP.

## Prompt comum

Substituir <scene> pelo trecho da disciplina abaixo. Image 1 é o primeiro interior; Image 2 é a ilha aprovada da disciplina.

```text
Use case: precise-object-edit. Asset type: production learning-trail game background. Image 1 is the previous map to reconstruct; Image 2 is the approved island style anchor. The previous map was rejected for repeating the same grassy-floor template. REBUILD THE FLOOR, LANDSCAPE SILHOUETTE, BUILDING PLACEMENT, TERRACES AND COMPOSITION so this discipline has a genuinely unique environment. Primary scene: <scene>. Preserve ONLY the original app's high-quality matte cut-paper craft style, solid-colored low-poly faceted rocks, layered cream stone, chunky recognizable object silhouettes and sharp cheerful lighting. Landscape 16:9, high tilted overhead view, fill every edge. Reserve a clear navigable band roughly the middle 30% from bottom to top, but integrate it into this specific terrain, not a generic grassy avenue. No text, labels, numbers, UI, mascots, characters, watermark, plastic, gradient, blur, neon or smooth 3D. Do not just recolor grass or place new props onto the old map: the ground and architecture must change materially.
```

## portuguese

```text
a red terracotta canyon village of stories. NO GREEN GRASS FLOOR. Broad winding ivory paper-scroll terraces crossing clay and terracotta canyon shelves. Giant open book stairways at different elevations. Offset libraries rather than symmetrical copies, warm clay plazas with scattered letter-like decorative cut-paper forms (no readable text), dark red earth facets, coral foliage only in small edge clusters. A continuous navigable central area of open cream page terraces and red-earth plazas. Distinct irregular long ribbon/page layered terrain.
```

## chemistry

```text
a turquoise mineral laboratory archipelago. NO GREEN GRASS FLOOR. Staggered large hexagonal cream and pale-cyan stone platforms, mineral-blue canyon seams, faceted orange mineral deposits, small cyan liquid channels connecting flask-shaped research towers. Central walkable hexagonal laboratory terrace with connecting short cream bridges over blue fissures. Change building placement: one large flask tower upper-right, molecule pavilion lower-left and crystal gardens behind. Vegetation only sparse small edge plants, not forest borders. Distinct honeycomb/polygonal terrain.
```

## biology

```text
a living botanical valley. Do not retain the repeated open green lawn corridor. Make rich brown earth and root-network paths under sprawling trees, stepping stones crossing a meandering turquoise stream diagonally from upper-left to lower-right, fern-shaped emerald foliage terraces and little leaf-shaped clearings. A large greenhouse off-center upper-left, huge DNA sculpture lower-right. Clear central stepping-stone/root trail suitable for UI nodes, irregular organic terrain, different from geometric paved maps. Moss occurs in small patches, not uniform grass floor.
```

## mathematics

```text
a royal-blue geometric mountain citadel. NO GREEN GRASS FLOOR. Sweeping cream triangular tiled terraces, stepped cobalt rock cliffs, ochre and yellow inset triangles and squares, polygonal stair bridges crossing deep geometric canyons. Central open cream geometric plaza connected into a vertical path by short stair terraces, a giant protractor crossing mid-right, compass tower upper-left, platonic-solid garden lower-right. Irregular stepped horizontal platforms, not a green corridor or cloned island arrangement. Plants only tiny accents at rock edges. Distinct geometric tessellated terrain.
```

## programming

```text
a petrol-blue code workshop and circuit city. NO GREEN GRASS FLOOR. Large matte petrol-blue circuit-board slabs with thin golden angular tracks, pale cream keyboard-key stepping platforms, short cyan and orange cable-like bridges between workshop modules. Central navigable walkway of chunky cream keycap terraces over an angular navy circuit courtyard. Computer tower upper-right, Python monument mid-left, bracket arch near bottom, no symmetrical copied landscape. A few green cuboid shrubs only at edges. Distinct industrial cut-paper circuit terrain without neon glow.
```
