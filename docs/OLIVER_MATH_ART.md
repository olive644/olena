# Oliver nas ilhas de Matemática

Arquivo: `public/oliver-math-islands.png`, PNG transparente otimizado, 720 x 791,
77.633 bytes (92% menor que o original de 992.701 bytes). Carregamento prioritário,
dimensões explícitas e resolução adequada ao recorte exibido, sem dependência nova no app.
Gerado com image_gen, nova ilustração baseada nas referências de Oliver e onboarding,
sem reutilizar uma pose existente. Modo de saída: fundo transparente.

## Prompt final

Use case: stylized-concept. Asset type: transparent PNG character illustration for OlenaStudy student dashboard math-islands carousel. Images are references only, not edit targets: image 1 is Oliver's exact identity, image 2 is the approved faceted paper-cut illustration style. Create a NEW full-body encouraging pose of Oliver, the rounded turquoise faceted gemstone mascot with black heart-shaped eyes, wide black smiling mouth, little faceted arms and feet. Preserve his unmistakable silhouette, cyan/turquoise polygon planes and face. Oliver is adventurously stepping forward on a small floating geometric island fragment while inviting the student with an outstretched arm toward a few floating mathematical paper symbols (plus, division, small triangular ruler) and one small blue faceted flame. Friendly confident concept illustration, crisp large low-poly paper facets, matte flat colors, minimal restrained paper shadows, same hand-crafted visual language as reference 2, NOT glossy 3D. Full character and props entirely inside image, composition optimized for a 300px tall hero cutout protruding above its card. Genuinely transparent background with alpha, no background rectangle or scene, no text, no lettering, no logo, no watermark. Transparent padding around silhouette. PNG output.

## Animação em Rive

A arte é animada por `public/oliver-math-islands/oliver.riv` (323 KiB), gerado por `scripts/oliver-rive` a partir de 25 camadas recortadas da própria imagem, sem redesenho. O PNG continua sendo o primeiro quadro e o único elemento acessível; o canvas o substitui só quando o arquivo carrega, e a pose de repouso do arquivo é a mesma do PNG (diferença máxima de 3/255 ao renderizar), então a troca não tem salto. Movimento reduzido (sistema ou preferência do app) mantém só o PNG e não baixa runtime nem arquivo. Detalhes do corte, do rig e da verificação em `scripts/oliver-rive/README.md`.
