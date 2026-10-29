# Produção das variantes count-v3

Ferramenta: imagegen integrada, edição de assets existentes, sem API ou dependência nova no aplicativo. Originais e variantes antigas preservados. Cada saída foi conferida pelo coordenador e pelo validador; a preservação de identidade é uma avaliação visual, não uma garantia de igualdade pixel a pixel.

Todos os prompts pediram proporção 2:3, fundo preto de papel, paleta restrita amarelo/roxos/preto, preservação do personagem, anatomia, pose e composição, sem texto, números, moldura, corte ou nova direção artística. Os prompts específicos foram:

- Cinco: editar somente o arranjo de bastões de wands-05-anatomy-v2.webp. Tornar cinco hastes retas individualmente rastreáveis, cada uma com uma cabeça vazada e outra extremidade plana. Preservar Nicolas e seus pontos de contato. Manter quatro posições gerais anteriores e acrescentar uma quinta cabeça separada à direita. Retirar a cabeça extra da extremidade direita do bastão horizontal e os segmentos órfãos. Não acrescentar mãos ou dedos.
- Seis: editar somente wands-06.webp. Remover o bastão inferior central direito (perto de x540, y1050 a1275 no original900x1350) e sua fita, recompondo o fundo. O original tinha um erguido e seis inferiores; o resultado pedido foi um erguido e cinco inferiores, seis ao todo. Personagem, louros e plataforma preservados.
- Oito: editar somente wands-08.webp. Remover o bastão isolado mais baixo à direita, cabeça perto de x770,y769, sua haste até a borda direita e sua fita. Recompor fundo preto. Preservar a pata erguida do Ninho e os outros oito bastões.
- Nove: editar somente wands-09-detail-v2.webp. Acrescentar exatamente um bastão ao fundo no intervalo entre o bastão segurado e o primeiro bastão da direita, perto de x465. Ponta em y335, folhas roxas no padrão existente e haste ocluída pelo personagem. Preservar os oito bastões anteriores, total nove.
- Dez: editar somente wands-10.webp. Remover o bastão central estreito cuja cabeça está perto de x410,y280, entre as cabeças altas x351 e x463, e sua haste até a oclusão pela orelha. Recompor fundo preto; manter os outros dez bastões e Andreyna.

Saídas completas em public/arcana/ink/wands-{05,06,08,09,10}-count-v3.webp, 1024x1536. Miniaturas com o mesmo nome e sufixo -small.webp, 180x270. Conversão para WebP com Pillow, qualidade90 para completas e85 para pequenas. A conversão não foi usada para retocar ou montar arte.

A amostra do Seis foi aprovada pela proprietária em 29/10/2026. As demais saídas foram produzidas após autorização para continuar e estão apresentadas na revisão final, sem presumir aceite ou autorização de merge. Screenshots são capturas do componente real após integrar as artes, não imagens de interface geradas por IA.
