# Interiores das trilhas de Praticar

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
