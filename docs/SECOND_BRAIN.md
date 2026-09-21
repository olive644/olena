# HelenaStudy: Second Brain

Editor manuscrito: PaperEditorIcon centraliza os símbolos de papel. Tela cheia em NoteCaptureTools usa a API nativa e fallback CSS, com estado sincronizado no fullscreenchange. Rótulos móveis expandem via foco ou aria-pressed, sem depender de hover.

Entrada de cadernos mostra preview persistente, com Anterior/Próxima e clique direto na folha. A galeria abre somente por Ver todas as folhas. Rotação CSS na lombada adapta o exemplo fornecido de anand_4957, sem loop automático. pageText em HandwritingDocument representa escrita por teclado na página inteira. A área escala com o zoom e mantém quebras de linha na exportação. O limite visual de uma página exibe aviso para continuar em outra folha. Revisar texto usa regras locais conservadoras em domain/text-review.ts com histórico para desfazer; sugestões ortográficas e autocapitalização nativas dependem do navegador/teclado. Nenhum texto é enviado a um serviço de IA.

Pastas são guardadas por arraste sobre cadernos na vitrine, ou por espaço e Enter com teclado. Removido o seletor Guardar em dentro da pasta. Devolver à vitrine fica junto à pasta no caderno. O código FolderComponent fornecido orienta a aba inclinável e as três folhas animadas, adaptadas à paleta sólida. HandwritingSticky aceita kind text e ink para caixas de texto sem fundo no editor manual; reutiliza histórico e persistência dos objetos posicionáveis.

Crie abre a escolha Cadernos ou Anotações. Anotações são pastas (StudyNotebook.kind = folder), com parentId opcional para guardar dentro de um caderno. Guardar em também permite devolver à vitrine. O reducer valida o destino e preserva pastas ao excluir seu caderno. Notas antigas diretamente em cadernos continuam acessíveis na aba Anotações. Testes de vitrine verificam criação, edição, movimentação e persistência de pastas no desktop e celular.

Cadernos: vitrine de capas, nome livre, folhas internas e anotações gerais. O campo legado subjectId aceita string vazia para novos cadernos, preservando os dados existentes. HandwritingStudio oferece Régua para segmentos retos integrados ao histórico e à persistência de traços.

Perfil também é acessível pela navegação principal no desktop, com o mesmo componente de configurações do celular. Os ícones de captura nos Cadernos são SVGs de papel em `PaperActionIcon`, com tamanho explícito de 32px.

## Preferências de estudo

O onboarding coleta modalidades, organização, ritmo e interesse em programação. Esses dados vivem
no workspace local e podem ser corrigidos no Perfil. Eles são preferências editáveis, não um
diagnóstico. A evolução planejada está em `STUDY_PREFERENCES_ROADMAP.md`.

O rail desktop usa papel creme e texto grafite no claro, papel grafite e texto creme no escuro. O Espaço do aluno não renderiza a antiga mascote do cartão inicial.

No celular, Mais fica no cabeçalho ao lado do seletor de aparência e da foto circular. `MobileMenuContext` conecta esse acionador à gaveta; o quinto item inferior, Perfil, usa ícone próprio e fica desabilitado, reservado para configurações futuras de perfil, conta e aplicativo. O seletor de aparência é compartilhado com o desktop. Regressões de recorte e navegação são verificadas em `e2e/responsive-navigation.spec.ts`.

Configuração e modelo de ameaça do login Google: GOOGLE_LOGIN.md. O resumo abre uma etapa de autenticação com preparação antecipada do SDK.

## Onboarding de prévia e padrão visual

Consultar DESIGN_SYSTEM.md para papel recortado, marca e loading compartilhado. /?onboarding=1 abre a experiência aprovada; ainda não é uma barreira de entrada automática. Google Auth é independente da integração com Google Agenda. Estado atual, riscos e requisitos de configuração em CURRENT_STATE_AUDIT.md.

## Ícones de navegação, 14/09/2026

`NavigationIcon` carrega SVGs autorais de papel recortado em `public/navigation-icons/paper/{claro,roxo,escuro}/`.
Preservar as três variantes: roxo é um estado contextual real, não um terceiro tema.
Novos ícones devem ter viewBox 0 0 48 48, margem interna, fundo transparente e formas reconhecíveis em 24px.
Os SVGs de utilidades e a iconografia aprovada da sala são independentes desta família.

## Decisões do Modo Sala, 12/09/2026

A limpeza passou a processar múltiplos lotes com prazo de 45 segundos, timeout de
rede e indicação explícita de backlog. O CI da PR #98 validou Chromium/WebKit;
isso não substitui a validação física nem ativa App Check/cron em produção.

- Firebase REST usa ETags/CAS, revisões públicas monotônicas e recibos para operações repetidas; não há bloqueio apenas em memória no servidor de produção.
- Sessão temporária possui credencial privada distinta do ID exibido. Presença usa heartbeat e encerra após 2 minutos sem anfitrião; sala tem prazo absoluto de 4 horas.
- Quiz e bingo compartilham rodada, equipes, prévia e seleção de material. Flashcards pessoais selecionados são compartilhados temporariamente, com aviso na interface.
- O lobby flat mantém a arte aprovada da Helena no convite, usa os ícones existentes e apresenta atividades futuras desabilitadas. Somente Escuta coletiva e Bingo iniciam rodadas.
- O Quiz de Escuta prioriza uma lista personalizada de até 30 pares, aceita separadores comuns, explica erros por linha e não expõe a palavra na tela projetada. A resposta privada inclui correção, par esperado e XP por três segundos. A sala sincroniza limite de repetições, velocidade e reprodução automática.
- O Modelo pronto contém somente cinco palavras. A base local de 10 mil frequências e seu gerador Python foram removidos; classificação fora da sala usa cache, Datamuse e estimativa offline.
- SDK Firebase App Check é importado dinamicamente apenas se configurado. JWT é verificado com jose no servidor; configuração externa ainda pendente, sem enforcement ativo declarado.
- Limpeza autenticada diária em `api/room-cleanup.ts` depende de CRON_SECRET e regras/índices em `firebase-room.rules.json`. Não publicar as regras sem considerar salas legadas sem expiresAt.
- `npm run verify` reúne lint, formatação, testes, build e orçamento. `PLAYWRIGHT_SYSTEM_EDGE=1` permite validar com Edge local quando os browsers Playwright não estão disponíveis; CI mantém Chromium/WebKit. E2E multiplayer usa transportes de teste, não produção.
- Estado e pendências detalhados em `CURRENT_STATE_AUDIT.md` e procedimento em `ROOM_SETUP.md`.

## Proposta

O HelenaStudy é o segundo aplicativo da marca Oli. Ele reúne organização, foco, rotina e
aprendizado em um único espaço, preservando o planejador de aulas de inglês como uma ferramenta do
produto.

**Promessa:** Estude, organize e avance com a Helena.

## Público inicial

- estudantes que desejam organizar rotina e matérias;
- professores de inglês e professores particulares;
- pessoas que precisam reunir tarefas, foco, hábitos e anotações.

## Fluxo atual

1. Consultar tarefas, agenda, hábitos e minutos de foco no Espaço do aluno.
2. Criar matérias, tarefas e compromissos na Agenda.
3. Registrar sessões no cronômetro de Foco.
4. Criar e marcar Hábitos diários.
5. Escrever, desenhar ou anexar uma digitalização nos Cadernos.
6. Guardar links, textos e flashcards por matéria na Biblioteca.
7. Revisar flashcards, responder Quizzes, completar Bingos e acompanhar metas em Praticar.
8. Praticar escuta em rodadas curtas com voz natural (Cloudflare Workers AI) e fallback do dispositivo.
9. Criar uma Sala online e sincronizar lobby e rodada entre dispositivos.
10. Montar planos de aula pelo fluxo determinístico existente.

Os dados pessoais compartilham um workspace local versionado e não exigem conta. O Modo Sala usa
Firebase Realtime Database para estado temporário compartilhado; o texto da pergunta de escuta é
enviado ao Cloudflare Workers AI apenas quando a voz neural é usada, tanto no Quiz de Escuta
individual quanto no Modo Sala.

## Arquitetura atual

- React 19 e TypeScript estrito;
- Vite para desenvolvimento e build;
- CSS próprio, mobile-first e Manrope carregada pelo Google Fonts;
- interface com hierarquia de próxima ação, cartões de progresso, ícones ilustrados preenchidos e
  movimentos curtos compatíveis com `prefers-reduced-motion`;
- Vitest e Testing Library para unidade/componente;
- Playwright para fluxos desktop e mobile;
- GitHub Actions para qualidade, auditoria, segredos, análise estática e CodeQL.
- Cloudflare Workers AI (modelo MeloTTS) chamado por função same-origin, sem expor o token no
  navegador; serviço próprio Kokoro+Piper (`services/tts`) implementado e testado, mas fora de uso
  em produção por falta de hospedagem grátis viável;
- cache de áudio por texto e velocidade durante a sessão, com fallback imediato para a voz do
  dispositivo se o Cloudflare Workers AI falhar;
- Firebase Realtime Database como armazenamento temporário da Sala e Server-Sent Events para o
  estado público realtime;
- credenciais temporárias da Sala ficam em `sessionStorage`, permitindo retomar a atividade após
  recarregar a aba sem duplicar participantes.

## Mapa mental vivo

Este diagrama funciona como a rede de navegação do repositório: parte da experiência HelenaStudy e
liga cada área do produto à sua base técnica e às garantias de qualidade.

```mermaid
flowchart LR
  HS[HelenaStudy] --> UX[Experiência]
  HS --> DATA[Workspace local]
  HS --> STUDY[Estudo]
  HS --> ORG[Organização]
  HS --> QUALITY[Qualidade]
  HS -. evolução segura .-> INTEL[Helena inteligente]

  UX --> TODAY[Espaço do aluno]
  UX --> NAV[Navegação responsiva]
  UX --> BRAND[Helena e identidade visual]

  DATA --> DOMAIN[Domínio e reducer]
  DATA --> STORAGE[Persistência versionada]
  DATA --> ROOM[Sala online via Firebase]

  STUDY --> FOCUS[Foco]
  STUDY --> LIB[Biblioteca e flashcards]
  STUDY --> PRACTICE[Praticar]
  PRACTICE --> WORLDS[Mundos Solo com níveis progressivos]
  WORLDS --> MOTION[Um mundo por vez, artes aprovadas como cenário imersivo de trilha e Helena sobre o nível atual]
  PRACTICE --> LISTEN[Escuta com Cloudflare Workers AI e fallback do dispositivo]
  LISTEN --> CUSTOM[Lista personalizada com validação por linha]
  LISTEN --> FEEDBACK[Feedback individual antes da próxima pergunta]
  ROOM --> PROJECTOR[Projetor protegido sem controles administrativos]
  LISTEN --> ALIASES[Respostas equivalentes definidas pelo professor]

  ORG --> PLAN[Agenda e tarefas]
  ORG --> HABITS[Hábitos]
  ORG --> NOTES[Cadernos]
  ORG --> LESSON[Planos de aula]

  QUALITY --> UNIT[Vitest e Testing Library]
  QUALITY --> E2E[Playwright desktop e mobile]
  QUALITY --> CI[GitHub Actions e CodeQL]

  INTEL --> CONSENT[Consentimento por solicitação]
  INTEL --> BACKEND[Backend sem chave no navegador]
  INTEL --> SOURCES[Somente fontes escolhidas]
```

Ao alterar uma área, atualize o nó correspondente e os fluxos ligados a ele. Detalhes de produto
continuam em [`PRODUCT_MIND_MAP.md`](PRODUCT_MIND_MAP.md); este mapa serve como visão executiva do
sistema completo.

## Decisão de produto: rodada de escuta e projeção

A duração exibida soma o tempo de resposta e três segundos de feedback por pergunta. Quando todas
as pessoas conectadas respondem, o resultado fica visível por esse intervalo e uma barra mostra o
avanço. Respostas enviadas ficam bloqueadas até a confirmação do servidor e usam o loading compacto
da Helena. A reprodução automática aguarda o fim de “3, 2, 1, Vai!”. A repetição manual do áudio tem
cooldown de cinco segundos, comunicado no próprio botão.

O professor pode cadastrar equivalências com `|`. A normalização ignora caixa, acentos, pontuação e
espaços excedentes. Uma opção desligada por padrão permite aceitar uma inserção, remoção ou troca de
caractere em respostas com pelo menos quatro caracteres. Assim, a aproximação só entra por decisão
explícita do professor.

O backend conserva as alternativas no baralho privado. O fim do baralho entra no estado de resultados,
sem encerrar a sala. O anfitrião pode repetir a atividade, voltar ao lobby para trocar a configuração ou
encerrar a sala; participantes permanecem na mesma sessão enquanto aguardam a escolha.

O modo projetor vive em `/sala/<código>/projetor`, reutiliza a sessão temporária do anfitrião e não
expõe ações de revelar, avançar ou encerrar. O QR code continua usando a composição aprovada da Helena.

## Etapas do produto

1. **Núcleo local concluído:** Espaço do aluno, Agenda, Foco, Hábitos, Cadernos e planos de aula.
2. **Sistema de estudos em evolução:** biblioteca, flashcards, revisão programada, quizzes, bingo,
   metas, digitalização local e escrita à mão estão funcionais. OCR e banco de questões ainda não.
3. **Helena inteligente com fundação definida:** contrato, consentimento e fronteira segura do
   backend estão prontos; provedor e interface ainda não estão ativados. Depois entram tutor,
   explicações, resumos e planos personalizados.
4. **Aplicativo mobile:** notificações, sincronização e controle nativo de tempo de tela.

As etapas 2 a 4 entram em mudanças próprias. IA e armazenamento remoto exigem consentimento,
modelo de ameaça e documentação do fluxo de dados. O bloqueio de outros aplicativos não deve ser
simulado em uma aplicação web.

A definição do backend de IA está em [`AI_BACKEND.md`](AI_BACKEND.md). O contrato envia somente
fontes escolhidas pela pessoa e exige consentimento a cada solicitação. Nenhuma chave pode existir
no bundle do navegador.

## Identidade

- preto: `#17151C`;
- amarelo: `#FFC94A`;
- violeta: `#7257E8`;
- lavanda: `#E9E2FF`;
- creme: `#FFF8ED`.

Helena é a gata preta de olhos amarelos que orienta o fluxo. O aplicativo usa a silhueta
assimétrica original em `public/helena.svg`, sem redesenhar a personagem como um gato genérico. O
nome exibido na interface é somente HelenaStudy. A navegação usa uma família própria de ícones SVG
lineares, com selos amarelos e traços pretos para manter contraste e consistência sem carregar um
pacote de ícones adicional.

## Fora do escopo desta fase

- login e cadastro;
- banco de dados e colaboração;
- geração por IA;
- upload e leitura automática de PDF/livros;
- pagamentos;
- exportação final em PDF ou slides;
- acompanhamento de alunos;
- bloqueio de outros aplicativos;
- notificações nativas.

Cada item entra apenas quando o fluxo local básico estiver validado.

O mapa completo do produto está em [`PRODUCT_MIND_MAP.md`](PRODUCT_MIND_MAP.md), e a ordem de
implementação com critérios técnicos está em [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md).

# Decisão de interface: navegação lateral

O menu lateral concentra a troca de módulos no desktop. O Espaço do aluno não repete essa lista:
mantém apenas ações contextuais e o resumo do dia. Em telas móveis, a barra inferior e a gaveta
esquerda “Mais ferramentas” preservam o acesso completo. A barra inferior usa grafite no tema claro
e branco no tema escuro. Itens ativos e o menu aberto usam papel roxo facetado com ícones creme,
transições curtas entre módulos e respeito à preferência de movimento reduzido do sistema.

# Entrada do aplicativo

App verifica helena.onboarding.v1 para apresentar o onboarding na primeira visita. GoogleLogin registra a conclusão após login bem-sucedido e guarda nome e foto Google em helena.profile.v1 para o perfil do cabeçalho. A mesma chave guarda a escolha entre os avatares oficiais Poliana, Oliver, Andreyna, Jairo e Helena. O parâmetro onboarding permite revisar o fluxo. Links de sala preservam acesso direto.

# Organização dos Cadernos

Cadernos são a unidade de organização e folhas são o conteúdo editável. `WorkspaceState.notebooks`
guarda `id`, `title`, `subjectId`, `createdAt` e `pageIds`; as folhas continuam em
`WorkspaceState.notes` para reutilizar captura de imagem, desenho e atualização automática. A criação
de folha deve sempre adicionar o novo identificador em `pageIds` do caderno correspondente.

O fluxo da interface tem três níveis: vitrine de cadernos, vitrine de folhas e editor. Trocas de nível
retornam a rolagem ao topo. Dados v6 são migrados criando um caderno por anotação antiga, portanto
qualquer evolução futura deve preservar a relação entre `notebooks.pageIds` e `notes.id`.

## Estúdio de escrita à mão

`HandwritingStudio` substitui o canvas básico da captura manuscrita. Os traços permanecem vetoriais
somente durante a edição aberta, o que permite desfazer, refazer, apagar por traço, aplicar pressão e
trocar o tipo de papel sem degradar o conteúdo. Ao salvar, o estúdio compõe papel e tinta em PNG, com
fallback JPEG progressivo quando necessário, e entrega o resultado ao fluxo existente de
`NoteAsset`. Fechar com alterações mostra uma confirmação e preserva um rascunho local. O
rascunho usa a chave da folha ou do anexo e é removido após salvar. Se o dispositivo não tiver
espaço, o fechamento avisa que o rascunho não pôde ser guardado.

A estabilização fica em `stabilizeHandwriting`: uma média móvel reduz oscilações entre pontos e uma
correção parcial atua apenas em traços longos com inclinação de até sete graus. Essa regra preserva
diagonais intencionais e pode evoluir de forma isolada, com testes puros, sem enviar escrita a um
serviço externo.

O modal de captura usa um portal em `document.body`, garantindo que o estúdio em tela cheia fique
acima da barra móvel mesmo durante as animações do conteúdo. Os testes E2E incluem escrita e
salvamento em desktop e mobile. Para testar uma prévia já aberta em outra porta, defina
`PLAYWRIGHT_PORT`; o padrão continua sendo 4173.

O campo opcional `NoteAsset.handwriting` guarda a versão 1 do documento com papel e traços. A
imagem raster continua sendo miniatura e fallback de visualização. A ação `note/asset-updated`
substitui imagem e traços do mesmo anexo, preservando seu identificador. A validação local aceita
somente coordenadas, pressão, cores, largura e limites de tamanho conhecidos. Imagens anteriores
sem documento vetorial abrem somente para consulta.

Nos modos Lupa, tocar no canvas muda o zoom em passos de 15%, ancorado no local do toque. No modo
Mover, arrastar altera a rolagem do viewport sem criar traços. Só caneta usa o mesmo movimento
para toques e mantém a escrita com ponteiros do tipo caneta ou mouse. `getCoalescedEvents` é usado
com fallback para o evento comum. A renderização usa curvas quadráticas por ponto e a
estabilização mantém curvas e diagonais intencionais.

`HandwritingDocument.stickies` é opcional para continuar lendo documentos anteriores. Cada
post-it tem posição fixa no papel, cor e texto limitado; sua camada HTML permite editar e mover,
enquanto a rasterização em canvas o inclui na miniatura, no PNG e na impressão. A seleção
retangular trabalha apenas com traços, não com post-its. A janela ampliada usa um segundo canvas
que mapeia toques para as mesmas coordenadas da folha. `notebook/page-moved` altera somente
`pageIds`, preservando o conteúdo de cada folha. A impressão abre uma janela local e depende do
diálogo de impressão do navegador para gerar PDF.
