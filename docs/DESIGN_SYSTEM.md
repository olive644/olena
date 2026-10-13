# Identidade visual oficial OlenaStudy

O padrão aprovado para a Helena, mundos, trilhas, ícones, botões e novos elementos visuais é **papel recortado**. Preservar silhuetas reconhecíveis, facetas geométricas, camadas de cores sólidas e pequenas sombras de sobreposição. Não substituir por ícones de contorno genéricos, plástico 3D, glassmorphism ou gradientes.

- Tipografia: Manrope.
- Marca: Helena em preto/grafite, Study em roxo.
- Paleta: creme #FFF9EF, roxo #7C3AED, amarelo #FACC15 e grafite #292432. Facetas usam #51465D, #51259B, #A779EF e #FFE88D.
- Mascote: gata compacta, olhos amarelos, pupilas verticais, estrela amarela na orelha. Manter anatomia clara e consistência entre poses.
- Ícones: usar os SVGs de public/navigation-icons/paper como referência. Criar símbolos semanticamente adequados, sem reutilizar desenhos aleatórios. Bandeiras conservam suas cores reconhecíveis em facetas de papel.
- Botões: camadas e facetas discretas, foco visível, área de toque mínima de 44px. Não depender só de sombra para comunicar o material.
- Foco e seleção: são proibidas molduras por outline e contornos automáticos roxos ou pretos. A regra compartilhada em paper-controls.css usa sublinhado e destaque amarelo de papel, inclusive no teclado. Seleção usa preenchimento/facetas, sem anel externo. Bordas estruturais de cartões e formas desenhadas pelo usuário permanecem.
- Navegação desktop: rail creme, texto grafite e ícones grafite no tema claro; rail grafite, texto e ícones creme no escuro. O item ativo e o menu aberto usam papel roxo facetado com ícone creme em ambos os temas. O cartão inicial do Espaço do aluno não apresenta mascote; as poses aprovadas seguem no onboarding e login.
- Cabeçalho móvel: Mais à esquerda, seletor de aparência e foto circular à direita. O seletor de aparência também é usado no desktop. A barra inferior apresenta Praticar com o mesmo tamanho, alinhamento e tratamento dos outros itens. A seleção usa o estado ativo compartilhado. Perfil usa silhueta autoral inteiramente em papel grafite, sem elementos decorativos e sem foto do usuário, reservada para configurações futuras de perfil, conta e aplicativo.
- O acabamento compartilhado está em src/paper-buttons.css: cantos assimétricos, facetas sólidas e base deslocada. Botões primários usam roxo e secundários usam creme. Setas de ação usam exclusivamente o SVG de papel da OlenaStudy. As transições do menu lateral e Mais usam três tiras de papel que formam um X, com movimento reduzido e estado acessível. No celular, Mais abre uma gaveta pela esquerda. O topo reserva o canto direito para o perfil do usuário, usando a foto Google quando disponível ou os avatares oficiais Poliana, Oliver, Andreyna, Jairo e Helena. A animação foi adaptada do exemplo de Ali-Tahmazi99 no Uiverse.io.
- Espaço do aluno: cabeçalho neutro, sem bloco roxo. Começar prática e Ver meu dia usam papel branco com texto e ícones grafite. Em tema escuro, campos de texto usam grafite elevado e contraste creme em vez de branco saturado.

## Controles da Agenda e fechamento

Paleta do evento usa seis cores existentes (roxo, amarelo, rosa, verde, azul e
grafite), em botões de papel com check original, nome acessível, dica por foco/hover
e movimento de vizinhos inspirado no exemplo Uiverse.io de Cobp fornecido pelo
proprietário. Sem seletor nativo; cores personalizadas anteriores continuam salvas
até escolha explícita. Movimento reduzido desativa escala/transição. Metadados
em hover/foco/abertos mantêm grafite sobre papel, sem pares de contraste transitórios.

PNG da Agenda e PNG/PDF/impressão de cadernos compartilham arte autoral desenhada
em canvas: facetas creme, marca OlenaStudy, marca d'água no rodapé e selo de Helena
do favicon original /olena-favicon.png, em alta resolução. Selo é identidade visual,
não certificação. Moldura fica fora do
conteúdo, sem apagar ou cobrir anotações. Somente cópias exportadas recebem arte;
miniaturas, documento editável e autosave permanecem originais. Não usar arte de
exportação em interfaces interativas nem enviar documentos a serviços externos.

Filtros matéria/tipo ficam em único botão creme facetado, ao lado de Pesquisar.
No celular, Exportar/Importar/Imprimir/Lembretes ocupam uma linha com quatro colunas.
Metadados abertos/focados usam texto grafite sobre papel creme, nos dois temas.
Relógio de duração reutiliza os símbolos de paper-digits.svg; exclusão reutiliza
a lixeira de PaperEditorIcon. Cores pessoais dos eventos aparecem nos marcadores
e bordas, sem recolorir o texto ou comprometer seu contraste. Seletor de cor
segue o controle nativo já utilizado na escrita à mão. Aviso de permissão usa
sino, X recortado e contagem de 6 segundos, como o aviso de XP.

Barra da Agenda usa AgendaToolbarIcon para Dia/Semana/Mês/Lista, importar/exportar,
imprimir e lembretes. Símbolos facetados em grafite/creme, acentos roxo/amarelo,
sem ícones genéricos de contorno. Placas permanecem creme nos dois temas; estado
ativo usa base amarela. Nome acessível, tooltip e texto visível identificam ações.
Importar/exportar reaproveitam cloudUpload/download de PaperEditorIcon, como na
escrita à mão. Imprimir usa nova silhueta facetada AgendaDetailIcon, com folhas
visíveis e indicador amarelo. Foco de teclado tem sublinhado amarelo, área mínima de 44px e movimento
reduzido preservado. Não acrescentar setas que dupliquem o seletor de datas.

Botões, summary, controles role=button e ícones decorativos não são selecionáveis
como texto. Aplicar a regra global de paper-controls.css, sem bloquear a seleção
da página inteira. Textos informativos, input, textarea e contenteditable continuam
selecionáveis e copiáveis. Não usar preventDefault global para impedir seleção.
O título informativo do dia mantém foco programático para acessibilidade, mas
não usa filtro/sublinhado amarelo de botão. A exceção é restrita ao título;
controles continuam com foco visível.

X colorido de fechamento usa agenda-close.svg sem placa roxa, fundo ou sombra
de botão, com área de 44px e sublinhado amarelo no teclado. A regra global em
paper-controls.css aplica-se a AgendaCloseIcon e PaperCloseIcon. Os SVGs
monocromáticos grafite/creme de PaperEditorIcon são exceção e permanecem intactos.

Agenda usa PaperChoice para menus, PaperDateField para calendário e PaperTimeField
para horas/minutos, com painéis de papel no top layer do navegador. Sem dropdowns
nativos azuis de tipo/matéria/repetição/data/hora. Entrada numérica manual aplica
máscaras dd/mm/aaaa e hh:mm. No celular, data/horário ficam em linhas separadas.
Matérias seguem PRACTICE_ISLANDS e os IDs existentes; não recriar matérias com
IDs aleatórios. Repetição usa dois ícones com rótulos acessíveis e estado amarelo.
Study, appointment, once e weekly são SVGs novos na pasta de ícones de papel,
carregados apenas na Agenda. Concluir usa PaperCheckIcon existente sobre papel
amarelo/grafite; animações de check, seleção, painéis e gráficos respeitam
prefers-reduced-motion.

Duração abre relógio de papel grande com ponteiros arrastáveis de horas/minutos,
setas do teclado e entrada numérica alternativa. A passagem por 12/60 leva ou
retira uma hora sem voltar arbitrariamente ao início; limites de estudo continuam.
Local, Links e Participantes abrem painéis por botão com ícone e mostram resumo
preenchido. Lembrar antes reaproveita RoomStepSlider da Escuta coletiva. Na hora é
padrão sem botão separado. Anexos usam área de papel para arrastar ou selecionar,
com prévias reais nas visualizações Dia/Semana/Mês/Lista. Transições e facetas
preservam movimento reduzido, X sem placa e foco amarelo.

## Cursor desktop

Navegação recolhida no desktop alarga a própria barra em hover sobre um ícone
ou foco de teclado, mostrando nomes dentro dela sem deslocar a página. Ao sair,
recolhe; não usar uma etiqueta separada do ícone. Item ativo mantém
roxo e texto creme; demais usam superfície e texto do tema. Movimento reduzido
desativa a transição. Tarefas usam a mesma paleta dos eventos, como marcador ou
borda, nunca como cor de texto. Faixas da grade reservam espaço para base dos
botões e toque de 44 px, com horários alinhados entre todos os dias.

Cursor nativo com SVG de 32px: seta facetada roxa/creme com dobra amarela,
mão de papel com estrela para ações. Arquivos em public/cursors, aplicação em
paper-cursor.css somente para mouse fino com hover. Creme delimita a silhueta
no tema escuro e grafite delimita no claro. Campos de texto, desenho, arraste e
controles desabilitados preservam seus cursores funcionais. Alto contraste e
toque não recebem a personalização. Sem camada que segue o mouse ou dependências.

## Tela de login

Login usa página creme, balão de papel e cartão branco com sombra em camadas. Helena espia por cima do cartão, com as patinhas apoiadas na borda, acima de Bem-vindo ao seu espaço. A placa incorporada na arte fica ocultada pelo recorte CSS. Preservar proporções compactas, Manrope, marca Helena preta e Study roxa, botão roxo facetado e seta de papel. Preview direto: /?onboarding=1&login=1.

## Componente de espera

Usar o componente HelenaLoading, com label contextual e compact quando necessário. O lápis animado é uma adaptação do SVG e CSS de gustavofusco no Uiverse.io, fornecidos pelo proprietário. Manter essa atribuição. Movimento de 3 segundos, cores e ponta/borracha no padrão de papel recortado. O status é anunciado uma vez pelo texto; o SVG é decorativo. Movimento reduzido apresenta desenho estático. Classes exclusivas evitam regras globais de ícones. Não há IDs de clipPath compartilhados entre instâncias.

O arquivo helena-loading.svg antigo permanece disponível para referências legadas: não substituí-lo pelo lápis. Em Praticar, a navegação pelas ilhas usa a foto do perfil em moldura de papel, não uma pose da Helena. Novos estados de espera devem usar o componente compartilhado, nunca reutilizar o personagem como spinner nem criar animações independentes.

## Assistente flutuante Helena (2026-10-12)

O proprietário aprovou a versão cartoon 3D da cabeça e a transformação entre
estrela e Helena para substituir a estrela do assistente virtual. Esta exceção
fica restrita ao assistente. Preservar o restante da interface em papel recortado.
O modelo é autoral, preparado no Blender, com olhos amarelos, pupilas verticais,
orelhas fundidas e estrela dourada. O botão conserva 64px no desktop e 56px no
celular. Movimento reduzido usa renders transparentes do mesmo modelo.
