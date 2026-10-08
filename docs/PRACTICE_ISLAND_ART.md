# Artes das ilhas de Praticar

## Otimização posterior sem redesenho

Em 2026-10-08 os WebPs de 1000 px foram redimensionados para 800 px com qualidade
82, mantendo transparência. Conjunto principal: 981018 para 595114 bytes, 39,3%
menor. Variantes -small.webp de 480 px com qualidade 80 atendem previews/telas
menores via srcset e sizes. Conversão mecânica com Sharp do runtime disponível,
sem nova dependência do aplicativo. Originais aprovados permanecem no histórico
Git. Não converter para SVG com bitmap embutido.

## Direção visual e escopo

Cenários e navegação primeiro, conforme escolha do proprietário. Sem exercícios
novos nesta etapa. Idiomas mantém os minigames existentes.

A primeira rodada repetia a composição do bosque. A segunda tinha novos relevos,
mas acabamento realista demais. A prova vetorial simplificada também foi rejeitada.
Nenhuma dessas versões foi publicada. O SVG foi retirado dos assets do aplicativo,
com cópia do conceito preservada fora do repositório.

As seis imagens finais foram geradas pela ferramenta integrada de imagens usando
**as três ilhas existentes como referências diretas de estilo**:

- `public/solo-world-1.webp`
- `public/solo-world-2.webp`
- `public/solo-world-3.webp`

Os originais permanecem intactos. Mantiveram-se volumes, facetas, densidade de
detalhes e paleta das referências, sem fotografia de papel nem simplificação SVG.
As composições não repetem a praça circular: porto, cânion de livros, laboratório
em plataformas, floresta em folha, academia geométrica e oficina de código.

PNGs originais ficam no diretório de imagens geradas do Codex. Assets consumidos
pelo app são WebP de 1000 px, qualidade 86, com alpha preservado. Conversão por
Sharp já disponível no ambiente, sem dependência nova. Cada ilha possui uma
posição própria para o sprite da Helena em PRACTICE_ISLANDS, conferida visualmente.

## Prompt base final

Use case: stylized-concept. Asset type: transparent floating game island for the SAME GAME as all three attached references. Input images 1, 2, 3 are STRICT ART DIRECTION REFERENCES, not layout templates. Match their exact illustrated volumetric papercraft look: chunky medium-size polygon faces, gentle facet shading, crisp folded edges, sturdy toy-like architecture, simple readable objects, saturated purple and warm cream with graphite rocks, yellow accents, faceted foliage. Preserve their degree of detail and their softly shaded low-poly paper illustration, neither flat SVG nor realistic craft photography. Absolutely no paper grain, surface texture, ornate thin details, tiny clutter, realistic materials, aged books, or photorealism. View angle and object scale must match references. Single complete floating landmass, transparent background, entire silhouette visible with clear margins, no characters, text, logos or frame. ORIGINAL geography and arrangement, do not simply swap the landmark on the reference's circular clearing and frontal stairs. A small natural standing surface for the separate Helena sprite is okay, not a large central circular plaza.

## Complementos por ilha

### languages

IDIOMAS: a PURPLE AND CREAM LANGUAGE HARBOR formed by two broad irregular floating rocky terraces, bridged diagonally across a turquoise canal. A chunky cream book-shaped lighthouse with purple roof at rear-left, two big folded speech-bubble sails near the harbor, one polygon globe on the smaller right terrace. Broad folded cream dock at foreground. Asymmetrical wide silhouette, same chunky paper scenery and purple rocky underside as references, no detailed town and no central round plaza.

### portuguese

PORTUGUÊS: a TERRACED BOOK CANYON, irregular elevated purple rocky island with two big cream book cliffs and a broad curled-page path winding diagonally between them. Simple purple-roof reading alcove at left, two large folded quills, warm green and purple faceted trees, yellow paper lanterns. Cream page landing at front-left. Canyon gap to right, robust few book layers, NOT a pile of realistically textured books, no central circular clearing or frontal staircase.

### chemistry

QUÍMICA: an ASYMMETRICAL MOLECULAR LAB ISLAND shaped as three joined hexagonal rocky terraces at different heights. A big purple/cream laboratory pavilion with a simple faceted cyan flask roof at rear-right, two chunky faceted glass vessels, one large molecule sculpture of yellow and violet polygon balls. Mint channels cross the terraces, broad cream work deck at front-left. Purple mineral underside, cream paths, green folded bushes. Original branching silhouette, no ornamental lab architecture, no central circle or front stairs.

### biology

BIOLOGIA: a LEAF-SHAPED FLOATING FOREST with two levels, high purple/cream leafy tree at rear-left and a lower vivid green garden terrace on right. A simple cream/purple cellular greenhouse pod, a large folded leaf canopy, one chunky cream DNA vine sculpture with yellow joints. Tiny turquoise waterfall through a side gap, broad pale-green leaf path across front. Faceted purple rocks below, large recognizable folded leaves, no intricate photoreal foliage. Original crescent silhouette, no central circle or front stairs.

### mathematics

MATEMÁTICA: a GEOMETRIC FLOATING ACADEMY built across an angular triangle of rocky platforms. Large cream cube pavilion with violet pyramid roof off-center right, chunky purple polyhedron sculpture on left, broad yellow protractor bridge across a notch, a folded compass sculpture and simple geometric tiles. Front standing ledge is triangular, terrain is diagonally stepped, underside consists of purple and graphite faceted geometric masses. Some simple green polygon shrubs like references. No circular clearing, symmetrical facade or central frontal stairs.

### programming

PROGRAMAÇÃO: a FLOATING CODE WORKSHOP with an asymmetrical stepped RECTANGULAR purple/graphite rock terrain. Chunky cream laptop-shaped pavilion at back-left with violet screen and big simple keys. Separate raised right terrace connected by a broad turquoise cable bridge; orange angle-bracket portal for HTML, two big blue layered panels for CSS, blue/yellow intertwined polygon snake symbol for Python and one gold circuit sculpture for JavaScript. Broad cream keyboard-shaped small front deck, vivid green faceted bushes. Same chunky scenic diorama as references, not a realistic motherboard, no text or logos, no central round plaza or front stairs.

## Cores e nomes próprios, após aprovação dos visuais

O proprietário aprovou as seis composições e pediu remover os tons roxos das ilhas.
A edição integrada de imagens alterou somente a paleta dos seis assets aprovados,
preservando geometria, enquadramento, facetas e posições da Helena.

| Disciplina  | Nome da ilha        | Paleta                                                |
| ----------- | ------------------- | ----------------------------------------------------- |
| Idiomas     | Porto das Vozes     | Turquesa, azul-marinho, creme e coral                 |
| Português   | Vale das Histórias  | Terracota, vermelho-vinho, creme e dourado            |
| Química     | Ilhas dos Elementos | Ciano, cobre, grafite e creme                         |
| Biologia    | Jardim da Vida      | Verde, terra, coral e ciano                           |
| Matemática  | Picos dos Padrões   | Azul, dourado, creme e ardósia                        |
| Programação | Oficina do Código   | Grafite, azul-petróleo, ciano e cores das tecnologias |

subject identifica a matéria em navegação e acessibilidade; title apresenta o nome
criativo no cabeçalho da ilha. A identidade dos controles do aplicativo não mudou.

### Prompt base da edição de cores

Use case: precise-object-edit. The attached image is the APPROVED edit target, not a loose inspiration. Change ONLY its color palette. Keep EXACTLY the same island, geography, buildings, objects, silhouettes, perspective, shape of every facet, soft papercraft shading, amount of detail, light direction, empty standing areas and overall framing. Do not redesign, simplify or add anything. Preserve the transparent alpha background and full uncut silhouette. No text, labels, watermark or characters. Remove ALL purple, violet and lavender tones from rocks, vegetation, roofs, trim, banners and objects using the discipline palette specified below. Keep the richly illustrated volumetric folded-paper style unchanged.

### Edição: languages

Porto das Vozes, IDIOMAS: purple stone underside becomes deep navy blue and petrol teal; roof, lighthouse trim and sails accents use ocean teal/turquoise and navy. Keep warm cream books and paths, bright gold lanterns, natural vivid greens, cyan water, brown wooden dock. Globe remains recognizably blue and green. Small coral flags instead of violet ones. Inviting coastal language harbor, NO purple anywhere.

### Edição: portuguese

Vale das Histórias, PORTUGUÊS: purple book bindings and architecture become rich burgundy red, terracotta and warm brick red. Purple cliffs become warm reddish-brown sandstone with deep wine shadows. Purple tree crowns become warm coral/orange with a few pale cream faces; keep vivid green foliage. Preserve cream pages and bridges, warm golden quills and lanterns. Literary autumn canyon, NO purple anywhere, burgundy must be RED not violet.

### Edição: chemistry

Ilhas dos Elementos, QUÍMICA: purple lab roofs and trims become cyan/teal with copper-orange structural accents. Purple rocks become charcoal graphite and teal mineral stone. Purple molecule balls become copper-orange and teal, keep golden balls. Keep warm cream architecture and paths, turquoise reaction vessels and cyan waterways, natural vivid green bushes. Scientific cyan/copper palette, NO purple anywhere.

### Edição: biology

Jardim da Vida, BIOLOGIA: purple tree crowns become layered emerald and leafy lime green with a few warm cream faces. Purple rocky base becomes warm earthy brown and mossy deep green. Purple greenhouse panels become soft cyan/teal glass-paper with forest-green trims. Purple crystal leaves become green or coral folded flowers. Preserve bright greens in leaf path, warm cream architecture and DNA vine, golden joints, cyan waterfall. Lush green/coral biology palette, NO purple anywhere.

### Edição: mathematics

Picos dos Padrões, MATEMÁTICA: purple architecture, polyhedron and rocky facets become cobalt/royal blue, deep navy and slate-blue. Retain cream geometrical tiles and pavilion, golden-yellow protractor and compass, green polygon shrubs. Purple decorative crystals become blue with golden tips, preserve charcoal facets. Clear blue/gold mathematical academy, NO purple anywhere.

### Edição: programming

Oficina do Código, PROGRAMAÇÃO: purple rock base and roof/architectural trim become graphite/slate and petrol blue. Purple laptop screen becomes deep blue with bright cyan code bracket symbol; purple keyboard keys and panels become cyan/teal or slate. Preserve Python blue-and-yellow symbol, orange HTML bracket portal, blue CSS panels, golden circuit sculpture, warm cream architecture, green foliage and turquoise connecting cables. Graphite/petrol/cyan digital workshop palette, NO purple anywhere.

## Assets consumidos pelo aplicativo

- `public/practice-islands/languages.webp`
- `public/practice-islands/portuguese.webp`
- `public/practice-islands/chemistry.webp`
- `public/practice-islands/biology.webp`
- `public/practice-islands/mathematics.webp`
- `public/practice-islands/programming.webp`
