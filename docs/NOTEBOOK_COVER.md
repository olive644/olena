# Capas e encadernação dos cadernos

Céu de papel é a capa original gratuita, preservada. No modo de edição da prateleira,
a inspeção inclui Caderno e Capas. A nova escolha permanece em rascunho até Salvar prateleira;
a seta descarta a alteração, assim como nome e remoções.

## Duas capas conquistadas

- Matemática: 100 acertos, conquista `correct-100`, mesma regra do header matemático.
  Composição original de geometria, planos de papel, sólidos facetados, arcos de construção,
  régua e detalhes dourados, nas cores da ilha. Não utiliza uma imagem da ilha colada na capa.
- Inglês: 100 acertos, `english-correct-100`, mesma regra do header de Inglês.
  Composição original do cais, arco creme, telhas turquesa, lanternas e fita de água com um
  barquinho de papel. Sem personagens e sem reaplicar a miniatura da ilha.
- Bloqueadas: requisito legível; não mudam a seleção. Não há gasto de pontos ou poeira.
- O cálculo das conquistas foi extraído do perfil para `cosmetic-achievements.ts`, sem mudar
  suas regras. Progresso matemático, livro de Inglês e conquistas retidas seguem as fontes atuais.

## Um único caderno 2D

O renderizador experimental WebGL foi removido por pedido do proprietário em 13/11/2026:
sem opção nas configurações, sem prefetch, cena, Three.js, sons exclusivos ou chunk separado.
Preferências antigas são ignoradas; as demais preferências permanecem intactas.
As animações 2D aprovadas de inspeção, abertura, folhas, fechamento e retorno continuam.

`StudyNotebook.coverStyle` usa `mathematics` e `english`. Os IDs antigos `helena-estrelas` e
`oliver-estrelas` continuam válidos e representam a capa original. A validação do workspace
aceita somente esses IDs conhecidos. O fluxo atual sincroniza a escolha junto ao caderno;
nenhuma regra de Firebase, serviço ou migração de conteúdo é necessária.

NotebookCover, NotebookBackCover, pasta, inspeção e abertura usam o mesmo estilo. A lombada é
recortada da própria arte de encadernação, sem uma faixa genérica independente. A volta à
prateleira recebe o mesmo estilo. O papel e o conteúdo das folhas não são recoloridos.

## Fontes e regeneração

- `scripts/notebook-cover-art/sources/english.png` e `mathematics.png`: artes originais feitas
  com a ferramenta integrada image_gen, inspiradas na paleta e nos materiais das ilhas.
- `src/components/notebook-cover-paint.ts`: fonte editável preservada da capa original e versos.
- `node scripts/notebook-cover-art/generate.mjs`: exporta capas e contracapas WebP de 1200 por
  1624 pixels e lombadas de 96 por 1624. Usa @napi-rs/canvas já instalado, sem dependência nova.
- `notebookCoverArt` resolve os caminhos. Cada capa conserva a etiqueta com o título vivo.

Direção dos prompts: capa gráfica frontal em papel recortado, azul/creme/amarelo em Matemática,
teal/creme/amarelo em Inglês; costura e dobras originais; lombada coordenada, sem personagens,
sem miniaturas de ilhas, sem mockup em perspectiva, sem texto embutido. Base inferior livre
para o título. A primeira proposta matemática com portal foi descartada; somente a composição
geométrica final integra os arquivos.

## Validação

Domínio: desbloqueios, legado, serialização, validação e merge independente preservando folhas.
E2E: bloqueadas/obtidas, teclado das categorias, cancelamento, salvar/recarga, lombada e
abertura 2D, PC/mobile nos temas claro/escuro. Preferência antiga de 3D não reativa a cena.
As provas e limitações da execução ficam em CURRENT_STATE_AUDIT.md. OAuth e sincronização
em contas reais não foram validados por esses testes.

## 13/11/2026, fechamento direto e lacre integrado

A capa fechada deixa de ser uma parada intermediária no fluxo da prateleira. Fechar pela seta Capa, pelo arraste da primeira folha ou pelo fim do caderno chama o retorno existente à posição original da prateleira. Removidos o título ao lado da seta, o total de folhas guardadas e os controles superiores Ver folhas. O índice da barra inferior continua disponível.

O lacre permanece preso à borda direita. O recorte visual fica em sua própria face, enquanto o suporte preserva a transformação espacial dos filhos. O medalhão amarelo é filho do lacre, acompanha seu giro e não aparece através do verso aberto. Não há animação independente do medalhão. PC e celular, temas claro e escuro, são cobertos nos testes de capas; o teste celeste cobre abertura, fechamento, arraste e retorno com foco restaurado.

## 13/11/2026, Todas as cores e fases do lacre

A capa LGBT Todas as cores é livre para todas as contas, sem conquista. Usa seis faixas da bandeira em papel facetado, costura creme, cantoneiras amarelas e a encadernação original. Fonte nativa paintPrideArt em notebook-cover-paint.ts, exportada pelo mesmo gerador para capa, verso e lombada WebP. O ID pride é validado e sincronizado no coverStyle existente, sem mudar páginas ou requisitos das capas de disciplinas.

O lacre permanece à direita com o medalhão preso à própria peça. Seu giro dura 420 ms com a curva de suavização do caderno. Na abertura, destrava após o transporte e antes de virar a capa. No fechamento, a capa encosta primeiro, depois o lacre trava e só então o caderno vira de lado e desliza para a prateleira. Movimento reduzido continua sem viagem animada.

## 13/11/2026, inspeção das ferramentas e marcações

As cinco ferramentas da barra inferior mostram a legenda de papel por hover ou foco visível, usando as cores e transição do rail desktop sem deslocar os botões. O nome acessível continua em aria-label. Lua e Sol usam o botão creme original e confere explícito.

Divisória e marcador agora abrem o modal original antes da colocação. A peça real é usada na prévia, em dimensões contidas, sem os transformadores exclusivos de folheamento. Cor e motivo atualizam o rascunho da prévia; confirmar fecha com animação e só então permite posicionar na folha. X/Escape cancelam a configuração nova. Campos, paleta e confere usam os elementos existentes do editor. O nome da divisória permanece horizontal.

Retirados os títulos sobre as folhas e o contador visível entre setas, preservados os dados e os rótulos de leitura de tela. PaperDigits renderiza os números com 11 px, como os antigos. Folheamento em 680 ms com dobra reduzida e sem balanço forçado de pouso das marcações.

O teste de encaixe reproduziu diferença de 2,88 px entre lacre animado e parado. A geometria final agora é medida no elemento real. O giro foi invertido para sair da capa, em vez de atravessá-la, com medalhão e aresta no componente NotebookClasp compartilhado. A aresta preserva a espessura na passagem de perfil.

Prova local: quatro E2E Edge passaram, PC/mobile e claro/escuro, incluindo tolerância de encaixe de 2 px, modal contido no viewport, dimensões das duas prévias, texto reto, troca de cor/motivo antes da colocação, fechamento animado, duas marcações na folha em movimento e retorno à prateleira. Capturas dos dois modais e do fechamento conferidas. TypeScript passou. CI completo não executado nesta etapa.

## Conexão física do lacre e das marcações, 13/11/2026

A correia da capa tem uma ponte lateral que cobre o corte das folhas e alcança a contracapa. A mesma ponte acompanha o transporte do caderno. Divisórias e marcadores pertencem ao miolo, em uma camada contínua fora do recorte de revelação das folhas, não à capa que gira. A dobra acompanha a abertura e o fechamento e entrega as marcações ao miolo real na mesma posição. A cópia da folha na capa não duplica as marcações. Preservados dados, posições, cores e páginas associadas.
