# Biblioteca pessoal

## Design

Acervo pessoal ligado aos cadernos e ao Foco, não feed público ou loja. Reutilizar Manrope, PaperDigits, PaperChoice, PaperEditorIcon, PaperObjectIcon, PaperCloseIcon e NotebookSpread. Superfícies e tinta seguem o tema; seleção amarela, primários roxos e secundários de papel. X colorido sem placa, alvos de 44 px e foco amarelo. Capas próprias em library-collections.svg: livro violeta, noite azul e sol coral. Títulos escritos pela pessoa não são traduzidos.

Tela principal: retomada, revisão, coleções e acervo pesquisável. Formulários em dialog nativo, com Escape e retorno de foco. Flashcards ocultam a resposta até revelar. Movimento curto e desativado pela preferência de movimento reduzido. Leitura e caderno ficam lado a lado no desktop e empilhados no celular. Validar ambos os temas e ausência de rolagem horizontal.

## Dados

StudyMaterial conserva os campos antigos e acrescenta metadados opcionais: etiquetas, coleção, favorito, arquivo, abertura, página, posição, marcadores e anotações. libraryCollections também é opcional. Workspaces anteriores continuam válidos sem migração destrutiva. Validar dados importados e persistir pela infraestrutura existente do workspace. Excluir coleção conserva os materiais; excluir material exige confirmação. Não gerar contagens fictícias.

Flashcards conservam materialId e sourcePage, usando o agendamento existente. Cada cartão aparece no máximo uma vez por rodada, inclusive ao marcar Errei. Trechos enviados criam folhas reais no caderno escolhido, com título, página e endereço interno da fonte. A prévia é NotebookSpread original; editar continua em Cadernos. Somente links HTTP e HTTPS podem abrir, com isolamento de opener e sem iframe de sites arbitrários.

## PDF e privacidade

PDF.js e worker já instalados são carregados somente ao abrir um PDF. Documentos de até 20 MB ficam como Blob no IndexedDB olena-library-files, com chave composta por conta e material. O workspace guarda hash SHA-256 e metadados, não o binário. Em outro dispositivo, selecionar novamente o mesmo arquivo original, conferido pelo hash, conserva as anotações. Limpar dados do navegador remove arquivos. A limpeza de dados pessoais ao sair ou trocar de conta também remove o banco de PDFs do dispositivo. Não prometer backup do PDF ou disponibilidade offline sem os recursos do leitor carregados.

Canvas e texto extraído selecionável, busca por página, marcadores e anotações usam páginas reais. Escaneamentos sem texto recebem mensagem honesta. PDFs com senha exigem cópia desbloqueada. Desmontagem cancela renderização e encerra o worker; falhas de leitura, espaço e reanexação são recuperáveis. Não executar HTML ou links extraídos do documento, nem enviar arquivos a terceiros.

## Foco

Estudar com Pomodoro abre o Foco com matéria e material associados, sem iniciar o contador. Sessão recuperada tem prioridade e não é substituída. Snapshot e histórico mantêm materialId. Voltar ao material retoma a leitura. Outro aparelho nunca inicia o contador automaticamente.

## Provas

domain/library.test.ts cobre filtros, URLs, compatibilidade, validação e vínculos. views/library-view.test.tsx cobre resposta oculta, rodada sem repetição, arquivo e exclusão confirmada. e2e/library.spec.ts e e2e/library-study.spec.ts cobrem temas, persistência, PDF real de duas páginas, busca, marcador, fontes em cadernos/flashcards, Pomodoro parado e Discord nas Configurações.
