# Design aprovado das cartas de arcano

Padrão vigente aprovado pelo proprietário em 28/10/2026. Este documento substitui as direções anteriores dos estudos de cartas. Não recuperar uma direção antiga por ter sido aprovada numa etapa anterior.

## Referência principal

O Mago: `public/arcana/mago-ink-v1.webp`, montado em `ArcanaCardPrototype`. Preview real: `/previews/arcana.html`. A aprovação combina a nova arte restrita com a moldura sólida de papel recuperada do modelo anterior. Não confundir com a moldura fina de fios, que foi substituída.

## Paleta

| Função                                      | Cor     |
| ------------------------------------------- | ------- |
| Preto de fundo e letras do título           | #17151c |
| Amarelo original, moldura, olhos e símbolos | #facc15 |
| Roxo original, facetas e base deslocada     | #6d28d9 |
| Roxo claro, planos secundários              | #8b5cf6 |

Somente preto, amarelo e roxos nas faces. Não usar branco, creme, azul, ciano, vermelho, verde, marrom ou dourado metálico. Os personagens são reinterpretados nessa paleta mantendo rosto, silhueta e acessórios reconhecíveis; a cor original do avatar não se sobrepõe a esta regra. Rasters podem conter pequenas variações tonais e antialiasing, não são arquivos literais de quatro tintas.

## Arte

- Ilustração nova por carta, com pose e interação próprias. Não colar avatares, recolorir um avatar para simular arte nova nem reutilizar a mesma pose em todas.
- Composição gráfica de tarô: fundo preto predominante, personagem ou emblema central, poucos símbolos relevantes e espaço negativo. Usar a referência de composição fornecida pelo proprietário, sem copiar os crânios ou personagens dela.
- Papel recortado do app: formas angulares deliberadas e facetas amplas. Não usar boneco 3D, anatomia humana com cabeça animal, triangulação excessiva, textura ruidosa, brilho plástico ou cenário de fantasia carregado.
- Identidade vem dos arquivos oficiais de onboarding e personagens. Conferir orelhas, olhos, focinho, proporções, patas e acessórios. Nenhum figurante inventado. Qualquer segundo personagem deve existir no catálogo oficial e ter função clara na cena.
- Símbolos representam o arcano, sem ataque, vida, poderes, custo ou estatísticas de TCG. Não transformar cada imagem em cópia do mesmo céu, rio, plantas ou templo.
- Não desenhar letras, número, título, logotipo ou moldura no raster. Reservar a área superior central para o índice em código.

## Frente em código

- Proporção 348:598, largura máxima de referência 348 px, escala uniforme no celular.
- Moldura sólida amarela de 10 px, sem contorno de fios duplos na frente. Cantos discretamente assimétricos: 3/11/3/8 px na referência.
- Arte preta encaixada com cantos superiores discretos, sem deformação da proporção.
- Faixa inferior amarela com 49 px de referência. Título preto no alfabeto original `PaperCardTitle`, dois pequenos sinais roxos laterais. Títulos longos diminuem proporcionalmente, sem cortar ou estourar a faixa.
- Base deslocada roxa, sombra externa discreta e pequeno recorte roxo no canto inferior direito. Não adicionar joias, placas ou ornamentos desnecessários.
- Índice amarelo no topo da arte, com pequeno traço roxo abaixo. Usar `PaperCardTitle` para romanos e `PaperDigits` para algarismos, nunca uma imagem gerada de texto.
- Maiores: Louco 0, demais I a XXI. Convenção editorial: Força VIII e Justiça XI. Menores: A, 2 a 10, P/C/Q/K para Pajem/Cavaleiro/Rainha/Rei, acompanhados pelo nome completo acessível. O catálogo planejado está em [ARCANA_CATALOG.md](ARCANA_CATALOG.md).

## Verso

Mesmo verso para todas as cartas, sem revelar personagem, elemento ou raridade. Mesma moldura amarela de papel. Interior preto, luas roxas opostas, estrela amarela e losango roxo, desenho simétrico sob giro de 180 graus. Sem título, logotipo direcional ou número. Construção SVG nativa, sem raster ou nova dependência.

## Produção e revisão

1. Conferir esta regra e a identidade oficial do personagem.
2. Desenhar uma cena nova usando a arte vigente de O Mago como referência de acabamento, não os estudos multicoloridos antigos.
3. Inspecionar identidade, quantidade de membros, interação com objetos, símbolos e paleta antes de exibir.
4. Montar no componente real com número e título. Não apresentar só a ilustração solta como se fosse a carta final.
5. Conferir PC e celular, claro e escuro, carregamento, frente/verso, foco amarelo e ausência de corte ou overflow horizontal. Respeitar movimento reduzido. Não adicionar som ao preview estático.
6. Registrar qual carta está pronta e qual foi aprovada. Uma imagem gerada não é aprovação automática. Não expandir um defeito conhecido para todo o baralho.

WebP completo para inspeção e versão pequena para a galeria. Preservar originais e variantes anteriores como histórico, sem usá-las no manifesto atual. Moldura e letras ficam em React/CSS/SVG. Não adicionar dependências.

## Estado atual do preview

O preview reúne 78 propostas de arte na direção vigente: 22 maiores e 56 menores. Quatro naipes de 14, com elementos vinculados aos naipes: Paus/Fogo, Copas/Água, Espadas/Ar e Ouros/Terra. Verso comum em código. Cada carta possui WebP completo e miniatura; número, título e moldura continuam nativos. Disponibilidade no preview não equivale à aprovação artística individual.

Os Enamorados usa Alice e Leo, versão major-06-v4 explicitamente aprovada pelo proprietário. Não recuperar Soso nessa carta ou as versões deformadas anteriores. Julgamento usa a proposta major-20-v3 da Soso. O Enforcado usa Leo. A geração inicial dos menores foi revisada para remover mãos extras de Alice/Soso e definir membros de Nicolas; o catálogo deve preferir as variantes anatomy-v2 quando existentes. Correções de contagem e apoio de patas usam detail-v2, que prevalecem sobre a imagem inicial.

O manifesto previews/arcana-ready.json lista somente os arquivos existentes na direção atual; previews/arcana-catalog.json é a fonte dos caminhos ativos. Nunca escolher uma variante pelo nome-base se o catálogo aponta para uma correção. Versões rejeitadas permanecem históricas, não são novas referências de estilo.

Preview isolado: não substitui a coleção, as cartas obtidas, as datas, os favoritos ou as recompensas do app em produção. Sem publicação ou migração nesta etapa. Verificação técnica de carregamento, texto e layout é separada da avaliação artística e não detecta anatomia nem conta símbolos de uma ilustração.

## Histórico de revisão (não substitui o estado atual)

## Continuidade: II, A Sacerdotisa na paleta vigente

Criada priestess-ink-v1.webp, nova pose com pergaminho, lua, duas marcas verticais e lótus discretos. Referências: Mago restrito e identidade original do onboarding. Mesma moldura amarela e verso compartilhado, sem restaurar a cena multicolorida. Dois estudos agora disponíveis nesta direção. Oito renders PC/celular claro/escuro frente/verso sem erro ou overflow, TypeScript do preview aprovado. A inclusão não implica aprovação automática desta nova arte.

## VI: Alice e Leo, identidade corrigida

Direção explícita do proprietário: Os Enamorados representa Alice e Leo, não Soso. Primeira versão do Leo foi rejeitada por corpo alongado. Nova proposta major-06-v2.webp preserva corpo baixo e arredondado, cabeça grande, antenas curvas e patas curtas, sem pescoço/cintura humanoides. Alice, coração, paleta e moldura preservados. Nova ilustração, sem colagem de avatar. Não reutilizar major-06.webp anterior. Atualizar scripts de manifesto sem sobrescrever o caminho v2.

Validação: frente/verso em PC/celular claro/escuro, TypeScript do preview. A correção ainda depende da avaliação visual, não confundir disponibilidade com aprovação.

## XX: reconstrução da Soso após rejeições

O proprietário rejeitou a primeira Soso por deformação e a segunda por se afastar do acabamento das cartas aprovadas. As duas versões não são referências válidas. A proposta major-20-v3.webp redesenha a personagem com face preta dominante, recortes roxos, olhos amarelos, asas vazadas com seis lóbulos, flor e antenas; trombeta separada acima evita torcer braços/rosto. Mantém a mesma moldura. Esta nova proposta está em avaliação, não aprovada automaticamente. Referência visual direta: Sacerdotisa restrita, identidade oficial Soso e Mago restrito. Não recuperar a aparência de avatar lavender renderizado da tentativa anterior.

Oito renders de frente/verso em PC/celular claro/escuro, sem erros de navegador ou overflow, e TypeScript do preview passaram. A anatomia é avaliada visualmente pelo proprietário, esses checks não provam aprovação artística. A continuação dos menores ainda não foi produzida.

## VI: nova composição sem deformar a interação

major-06-v3 foi rejeitada: Leo ainda não correspondia à referência. Reconstruída a cena em major-06-v4.webp usando diretamente as identidades oficiais de Leo e Alice e a linguagem do Mago restrito. Leo com rosto preto, recortes roxos, silhueta compacta, antenas originais e antebraços junto ao corpo; sem abdômen de abelha, pernas longas ou tronco humanoide. Alice com as mãos próximas das bochechas. Coração suspenso entre os dois, sem obrigar anatomia a segurá-lo. Arco angular roxo e pequeno losango substituem as fitas antigas. Mesma moldura e paleta.

Somente v4 no catálogo visível; versões anteriores preservadas como tentativas rejeitadas. Proposta aguarda avaliação artística. Oito renders frente/verso PC/celular claro/escuro sem erro de navegador ou overflow; TypeScript do preview aprovado. Não recuperar v2/v3 em atualizações do manifesto.

## Regra anatômica após falhas no lote de menores

Validar individualmente: dois braços conectados ao tronco, duas mãos claramente identificáveis e dois pés distintos. Não usar mão no queixo quando as outras duas já seguram um objeto. Não pedir dois braços segurando o companheiro e um terceiro erguendo cálice: o companheiro pode ser um símbolo separado. Não deixar pata desaparecer em área preta ou confundir laço/cabo/cauda com mão. A forma recortada não justifica erro de anatomia.

Correções em revisão: Cinco de Copas de Alice (remover mão central extra); Três/Sete de Copas de Soso (somente duas mãos); Ás/Cinco de Paus de Nicolas (patas definidas e dois pés). Assets com sufixo anatomy-v2, versões antigas preservadas. Antes de voltar à galeria, conferir em resolução suficiente e no componente real. Validação automatizada de título/carregamento não detecta nem prova anatomia correta.

## Correções finais de identidade e publicação do preview

O baralho tem 78 propostas visuais no catálogo. Prioridade de variantes: style-v3, detail-v2, anatomy-v2, versões específicas aprovadas e base. Miau em Três, Sete e Rainha de Espadas usa corpo compacto de coruja e duas asas, sem braços humanos ou terceira mão. A espada da Rainha permanece separada. Oliver no Dez de Copas usa face preta, recortes roxos e olhos de coração amarelos, preservando a linguagem das demais cartas.

Para aves, conferir duas asas e a anatomia oficial, sem impor mãos e pernas humanas. A regra de dois braços e duas mãos aplica-se somente aos personagens que possuem esses membros.

Conferência automatizada: 312 inspeções, 78 cartas, PC e celular, claro e escuro, sem erro de navegador ou overflow. O catálogo verifica a divisão 22/56 e os arquivos. Esses testes não substituem revisão artística. A entrega permanece um preview isolado, sem migrar cartas conquistadas ou recompensas.
