# Biblioteca pessoal

## Design

Acervo pessoal ligado aos cadernos e ao Foco, não feed público ou loja. Reutilizar Manrope, PaperDigits, PaperChoice, PaperEditorIcon, PaperObjectIcon, PaperCloseIcon e NotebookSpread. Superfícies e tinta seguem o tema; seleção amarela, primários roxos e secundários de papel. X colorido sem placa, alvos de 44 px e foco amarelo. Capas próprias em library-collections.svg: livro violeta, noite azul e sol coral. Títulos escritos pela pessoa não são traduzidos.

Tela principal: retomada, revisão, coleções e acervo pesquisável. Formulários em dialog nativo, com Escape e retorno de foco. Flashcards ocultam a resposta até revelar. Movimento curto e desativado pela preferência de movimento reduzido. Leitura e caderno ficam lado a lado no desktop e empilhados no celular. Validar ambos os temas e ausência de rolagem horizontal.

## Dados

StudyMaterial conserva os campos antigos e acrescenta metadados opcionais: etiquetas, coleção, favorito, arquivo, abertura, página, posição, marcadores e anotações. libraryCollections também é opcional. Workspaces anteriores continuam válidos sem migração destrutiva. Validar dados importados e persistir pela infraestrutura existente do workspace. Excluir coleção conserva os materiais; excluir material exige confirmação. Não gerar contagens fictícias.

Flashcards conservam materialId e sourcePage e aceitam noteId para voltar à folha de origem. Editar frente, verso, matéria e baralho não redefine o agendamento. Exclusão pede confirmação. Baralhos são nomes opcionais por cartão, sem criar chave de sincronização. Busca por texto inclui frente, verso e baralho; filtros de matéria e baralho também limitam a revisão. Cada cartão aparece no máximo uma vez por rodada, inclusive ao marcar Errei. Trechos enviados criam folhas reais no caderno escolhido, com título, página e endereço interno da fonte. A prévia é NotebookSpread original; editar continua em Cadernos. Somente links HTTP e HTTPS podem abrir, com isolamento de opener e sem iframe de sites arbitrários. Prévia de link mostra apenas hostname, sem consultar o site.

Agendamento é uma adaptação explícita de SM-2 para três respostas, não implementação canônica: facilidade por cartão entre 1,3 e 3,5, primeira resposta fácil conserva três dias, segunda pelo menos seis e próximas multiplicam o intervalo pela facilidade, com teto de 36.500 dias. Difícil não reduz intervalo; Errei volta a um dia. Contadores de revisões, acertos e lapsos começam quando há registros reais, nunca estimar estatísticas antigas. Limite diário padrão de vinte novos pode ser ajustado de zero a cem e não bloqueia cartões já estudados; consumo diário é da conta inteira, inclusive ao trocar de baralho. dueFlashcards compartilha a preferência com Praticar e a rota de estudo. Metadados são opcionais, cartões antigos continuam válidos e cartões legados com intervalo positivo não são contados como novos na atualização.

TSV local usa frente, verso e baralho opcional, com aspas para tabulações/quebras e cabeçalhos Anki separator:Tab e html:false. Importação aceita até 500 linhas e 1 MB, mostra prévia, exige confirmação e ignora duplicatas exatas na mesma matéria/baralho. Exportação segue o filtro atual. Conteúdo é texto, nunca HTML executável. Não promete importar mídia, pacotes APKG ou o histórico de agendamento do Anki.

Notes e folhas oferecem criação de flashcard com trecho selecionado ou texto editável e fonte noteId. Notes, tarefas e eventos podem vincular materiais existentes, abrir seu endereço interno e desvincular sem apagar o acervo. Edição normal conserva materialIds. Busca do Espaço encontra materiais, notas, tarefas e eventos localmente, sem consulta externa. A tutora aceita explicitamente um material de texto por pergunta, com prévia dos primeiros 8.000 caracteres, checkbox de consentimento e desmarcação após envio. Não enviar hash de PDF/imagem como texto, extrair silenciosamente binários ou ativar provedores. O serviço existente e seus limites permanecem inalterados.

## PDF e privacidade

PDF.js e worker já instalados são carregados somente ao abrir um PDF. Documentos de até 20 MB ficam como ArrayBuffer no IndexedDB olena-library-files, com leitura compatível de Blob legado. Imagens PNG, JPEG e WebP até 5 MB usam bytes e MIME validado, sem SVG/HTML. Assinatura e SHA-256 são conferidos antes de salvar e ao reanexar. O workspace guarda hash SHA-256 e metadados, não o binário. Em outro dispositivo, selecionar novamente o mesmo arquivo original, conferido pelo hash, conserva as anotações. Limpar dados do navegador remove arquivos. A limpeza de dados pessoais ao sair ou trocar de conta também remove o banco de arquivos do dispositivo. Não prometer backup do arquivo ou disponibilidade offline sem os recursos do leitor carregados.

Canvas e texto extraído selecionável, busca por página, marcadores e anotações usam páginas reais. Escaneamentos sem texto recebem mensagem honesta. PDFs com senha exigem cópia desbloqueada. Desmontagem cancela renderização e encerra o worker; falhas de leitura, espaço e reanexação são recuperáveis. Não executar HTML ou links extraídos do documento, nem enviar arquivos a terceiros.

## Foco

Estudar com Pomodoro abre o Foco com matéria e material associados, sem iniciar o contador. Sessão recuperada tem prioridade e não é substituída. Snapshot e histórico mantêm materialId. Voltar ao material retoma a leitura. Outro aparelho nunca inicia o contador automaticamente.

## Provas

domain/library.test.ts cobre filtros, URLs, compatibilidade, validação e vínculos. views/library-view.test.tsx cobre resposta oculta, rodada sem repetição, arquivo e exclusão confirmada. e2e/library.spec.ts e e2e/library-study.spec.ts cobrem temas, persistência, PDF real de duas páginas, busca, marcador, fontes em cadernos/flashcards, Pomodoro parado e Discord nas Configurações.
