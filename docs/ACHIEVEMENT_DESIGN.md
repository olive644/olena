# Conquistas do Olena

## Contrato visual

As conquistas pertencem ao mesmo universo de papel recortado das ilhas, não a um sistema de ícones genérico. Reutilizar PaperCardTitle, PaperDigits, PaperEditorIcon, PaperArrow e PaperCloseIcon. Widgets têm dobras, recortes e profundidade estrutural. O X colorido nunca recebe placa. Foco de teclado usa destaque amarelo, sem outline roxo ou preto.

As 57 artes matemáticas aprovadas ficam em `public/achievement-badges/math/`. Preservar composição, transparência, personagem Oliver e proporções quadradas. Não substituir Oliver por uma interpretação nova. A placa usa dígitos de `paper-digits.svg`, sobrepostos, nunca números desenhados na imagem ou fonte comum.

Gerais usam ilustrações inéditas, nunca ícones de navegação reaproveitados. A Horta do Foco aprovada define o acabamento de papel facetado, não um cenário a copiar. Cada família precisa de moldura e história próprias: estufa-tomate, lanterna de ofensiva, flor-relógio, biblioteca, oficina de escrita, pontes de amizade e outras cenas. Não colocar essas artes na ilha matemática: sem pedras cobalto, pilares ou diamante no topo. Cada família evolui a composição em quatro materiais: bronze, prata, ouro e esmeralda, não apenas a cor. Objetivos especiais podem existir sem material.

Artes gerais ficam em `public/achievement-badges/general/{id}.webp`, quadradas, 512 px, com alpha real e placa vazia centralizada entre 67% e 80% da altura. O app coloca PaperDigits na placa, sem números gerados na imagem. Prompts e referência precisam acompanhar os assets. A moldura e o interior mantêm o assunto da família; esmeralda é a versão completa, não uma troca de personagem.

## Galeria e perfil

- Duas categorias: Matemática e Gerais. Uma peça por família na galeria, mostrando o maior nível obtido ou a primeira etapa bloqueada. Todas as etapas continuam acessíveis na inspeção.
- Celular usa três colunas. As peças ficam sem fundo individual. O perfil destaca até três conquistas obtidas escolhidas pelo usuário, na ordem escolhida.
- Preferência ausente usa três conquistas obtidas como sugestão. Lista vazia significa que o usuário removeu os destaques; não repopular silenciosamente.
- Insígnias têm inspeção estática. Não adicionar rotação, verso, arraste ou controles 3D. Cartas do Oliver continuam com sua inspeção própria.
- Avisos de desbloqueio são não modais: a área decorativa não intercepta cliques. Somente os controles de inspecionar, fechar e a coleção aberta recebem eventos. O aviso não pode bloquear a criação de folhas ou outras ações do app.
- Matemáticas raras obtidas mantêm seu brilho aprovado. Gerais com níveis recebem reflexo do respectivo material: bronze cobre discreto, prata frio, ouro dourado e esmeralda verde. Reflexo sempre recortado pelo alpha da própria arte, nunca por uma máscara genérica. Bloqueadas não brilham. Respeitar redução de movimento, com informação de nível legível sem animação.
- Raridade tem texto e cor, nunca somente cor: comum turquesa, incomum roxo, rara dourado, com variantes legíveis no escuro.
- Data da inspeção usa PaperDigits e um nome acessível completo. Data desconhecida mostra informação explícita, nunca a data atual inventada.

## Compartilhamento

PNG de 1080 por 1350, preparado no navegador, sem envio de dados a terceiros. Cada assunto usa sua paleta e motivos: matemática azul e amarelo, foco tomate e folha, cadernos roxo e papel, amigos turquesa, rotina dourado. A assinatura OlenaStudy usa o alfabeto facetado original, não texto comum. Arte, objetivo, dono e data precisam permanecer legíveis. Compartilhar, voltar e salvar usam somente ícones visíveis, com aria-label e title.

## Progresso e privacidade

Gerais derivam de registros reais do workspace e contagens públicas da própria conta. Tempo em aberto, suspensão e sessões inválidas não geram minutos. Ofensiva usa dias de estudo no fuso da conta. Contagens de seguir pessoas não podem ser chamadas de amizades mútuas. Metas já obtidas ficam no histórico sincronizado da conta, mesmo após excluir uma página ou deixar de seguir alguém.

O perfil público recebe apenas IDs conhecidos, datas comprovadas e até três favoritos únicos já publicados como obtidos. Bloqueio oculta esses metadados. Favoritos podem ser removidos; não mesclar listas antigas por união. Histórico de obtenção preserva a data mais antiga comprovada.

## Adicionar uma conquista

1. Definir objetivo observável e família no domínio correspondente. Manter IDs existentes estáveis.
2. Reutilizar motivo específico e material canônico. Não repetir a mesma peça na galeria para cada número.
3. Acrescentar nome e objetivo aos dois catálogos de idioma, mantendo índices append-only.
4. Testar limiar, ausência de progresso, datas e isolamento da conta. Testar favoritos públicos e bloqueio se alterar contrato social.
5. Conferir inspeção, PNG real, teclado e três colunas em celular, temas claro e escuro. Não baixar navegadores novamente se já houver limitação conhecida do ambiente.
6. Rodar verify e testes de navegador afetados sem aumentar limites de JavaScript ou enfraquecer CI.
