# Avatares sem moldura

Revisão de 16/10/2026, usando edição pelo gerador de imagens integrado.
Destino: `public/profile-avatars/`, preservando os 16 nomes de arquivos usados
pelos perfis existentes. WebP transparente de 512 px; os arquivos SVG legados
incorporam esse WebP sem círculo, clipPath ou borda. Nenhuma dependência nova.

Prompt-base utilizado individualmente para cada personagem:

> Use case: background-extraction. Image 1 is the official avatar edit target.
> Remove ONLY the circular frame, badge and surrounding background. Keep the
> exact original character. Preserve pose, expression, face, proportions,
> colors, accessories, papercut facets and silhouette. No redesign, new limbs,
> changed face, new frame, shadow or halo. Genuine transparent alpha, centered
> square canvas.

Cada prompt explicitou os acessórios do personagem, incluindo óculos/lápis da
Poliana, estrela/cauda da Helena, asas/coração da Soso e lupa da coruja Miau.
Os recortes foram inspecionados visualmente. A edição pode variar facetas finas,
mas mantém a identidade dos personagens. Não se trata de extração pixel a pixel.

Correção adicional solicitada para Miau:

> Remove ONLY the owl's two orange feet at the bottom. End the silhouette at
> the rounded brown lower body, with transparent space below. Preserve everything
> else exactly: owl face, large eyes, magnifying glass held in wing, yellow chest,
> brown body, pose, proportions, colors and papercut facets. Do not add legs,
> feet, frame, backdrop or shadow. Genuine transparent alpha.

As originais continuam recuperáveis no Git anterior a esta revisão. A conversão
para WebP apenas otimiza o arquivo gerado e preserva seu canal alfa.
