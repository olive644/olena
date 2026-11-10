# Inglês e Teco no perfil

## Escolhas e requisitos

| Categoria | Nome                   | Requisito                                       |
| --------- | ---------------------- | ----------------------------------------------- |
| Avatar    | Teco                   | Livre                                           |
| Moldura   | Guardião das palavras  | Concluir todas as oito partes da ilha de Inglês |
| Header    | Horizonte das palavras | Cem acertos em Inglês                           |
| Fundo     | Guardião das palavras  | Cem acertos em Inglês                           |

Os requisitos seguem a escala de Matemática, mas são calculados exclusivamente com Inglês.
A moldura usa english-parts-8 e header/fundo usam english-correct-100. O livro sincronizado
preserva os desbloqueios quando atividades antigas deixam a lista. O histórico de conquistas
registradas na conta continua válido. Selecionar decoração não concede progresso, pontos ou XP.
O salvamento relê o livro e o perfil para conferir os requisitos novamente.

## Artes aprovadas

Avatar gerado pela ferramenta integrada de imagens, usando os avatares Oliver e Anonha como
referências visuais. Prompt: guaxinim cinza de papel facetado, máscara escura, boina preta com
estrela vermelha, camisa verde, pose compacta e fundo transparente. A proprietária aprovou a
imagem e escolheu Teco como nome. Exportação WebP 512x512, sem recorte da silhueta.

Os cosméticos foram apresentados pela ferramenta de imagens com base nas três artes nativas de
Matemática. A revisão aprovada retirou os raios e substituiu turquesa/amarelo por azul, vermelho e
branco da bandeira britânica. Implementação SVG nativa preserva essa composição: livro, lápis,
conversa, bandeira, anel octogonal e fundo pastel. Header 1200x320, moldura viewBox 180x180 com
abertura circular de raio 66, fundo 900x1200 com base opaca e preserveAspectRatio=none.

Não usar a arte de Teco como tema dos cosméticos ingleses. O avatar é uma escolha independente.
As cores fortes ficam no header e na moldura; o fundo usa azul/vermelho muito claros para leitura.
Perfil, visita e exportação usam os mesmos SVGs e os mecanismos existentes de tema e canvas.

## Validação

Checks locais de sintaxe, limites de desbloqueio, separação entre cursos e rasterização passaram.
Foram conferidos os quatro cantos transparentes do avatar, a abertura da moldura e a opacidade
integral do fundo. Esses checks não comprovam React, sincronização real ou navegação no produto.

Executar npm run verify e os testes profile-customization, profile-cover-dialog e english-cosmetics.
O E2E english-cosmetics.spec.ts cobre bloqueios, seleção do Teco, desbloqueios pelo livro, salvamento,
recarga e screenshots nos dois temas. Rodar em desktop e mobile, junto das regressões de avatares,
personalização e streaks. Nenhum segredo, regra Firebase ou dependência nova foi adicionado.
