# Integração do baralho Arcano

## Catálogo e apresentação

O baralho ativo tem 78 cartas: 22 maiores e quatro naipes de 14 menores. public/arcana/catalog.json é o manifesto servido sob demanda, validado antes de uso. ARCANA_IDS contém somente identidades para sorteio e validação sem incluir as artes/textos no JavaScript principal. A moldura aprovada continua ArcanaCardPrototype, com numeração, título e verso nativos. Não gerar outra arte durante esta integração.

A galeria Arcano abre pelo perfil e pelos baús. Categorias: todos, maior, menor e quatro naipes/elementos. Cartas ainda não obtidas podem ser conhecidas e inspecionadas, mas não destacadas. Exatamente três posições no topo, até três favoritas únicas e obtidas, com remoção e substituição por arraste da estrela. O botão de estrela também funciona por teclado e toque. A inspeção 3D reaproveita PaperArtInspection, com significados ao lado no PC e abaixo no celular. Numeração do total e datas usam PaperDigits. Sons e movimento respeitam as preferências existentes.

## Transição autorizada de dados

Chave existente helena.mathPlaceRewards.v1, sem nova coleção remota. Novos baús comuns sorteiam um ou dois dos 77 arcanos que não são A Estrela, sem reroll após abrir. O baú arcano mantém os 5% já existentes e concede A Estrela. Cada carta comum tem a mesma chance dentro desse sorteio. Retirados poder, vida e stamina.

Apenas a identidade antiga oliver-star-tarot é mapeada para major-17. first-star (A primeira estrela) não é A Estrela e não é convertida. A carta só conta se foi revelada. Preservar cópias e datas conhecidas, sem inventar datas antigas. As outras dez identidades antigas não são expostas nem contadas. As imagens antigas foram retiradas do runtime e do diretório de publicação; permanecem recuperáveis no histórico Git.

O ledger histórico bruto permanece para preservar pontos, recibos, provas de obtenção e compatibilidade de sincronização. A filtragem é idempotente em toda leitura, inclusive depois de receber dados de um aparelho antigo. O merge continua avançando revelações e preservando datas históricas mesmo quando as cartas antigas são retiradas da apresentação. Favoritos antigos são filtrados; a Estrela é remapeada. Sem nova chave sincronizada ou mudança de regra Firebase.

Rollback: reverter a PR recupera leitores/artes anteriores e o ledger original. Antes de rollback, preservar um export da conta com os IDs novos, pois clientes antigos não reconhecem o novo baralho e podem sinalizar conflito. Não apagar ou conceder cartas em massa no backend.

## Fonte dos significados e privacidade

Fonte: https://github.com/ekelen/tarot-api e https://tarotapi.dev, textos de A. E. Waite, The Pictorial Key to the Tarot (1910). O README permite usar static/card_data.json como fonte local. public/arcana/tarot-api.json contém a cópia dos campos nome, significado normal/invertido e descrição, obtida em 28/10/2026. Resumos em português do catálogo Olena são separados do texto original da fonte, exibido em inglês e identificado.

Ao inspecionar, carregar primeiro a cópia própria; tentar GET https://tarotapi.dev/api/v1/cards/{id}, sem credenciais ou referrer, com cancelamento, prazo de oito segundos e validação dos campos e identidade. Não enviar perfil, progresso, UID ou favoritos. O serviço externo recebe a conexão de rede e o identificador público da carta. Respostas são texto React, nunca HTML. Falha externa mantém a cópia local, troca de seleção cancela a requisição e não aplica resposta de outra carta. O cache em memória tem no máximo as 78 identidades permitidas. A CSP inclui apenas a origem pública usada. Nenhuma API paga, chave ou modelo de IA foi adicionado.

## Provas

Testes de catálogo, migração, sorteio, merge, favoritos, identidade dos significados e cancelamento; modos claro/escuro, PC/celular no navegador. Resultados finais registrados no CURRENT_STATE_AUDIT. Não confundir mock de API nos testes com disponibilidade garantida do serviço externo.

### Privacidade e disponibilidade

A consulta real de ar17 respondeu HTTP 200 com objeto card e CORS liberado. O leitor valida esse contrato, e não o formato cards usado pelo endpoint de listagem. Os testes de navegador de fallback interrompem a conexão externa deliberadamente. A política passou para versão 2026-10-29 para descrever a conexão pública sem dados da conta; o teste de cobertura de hosts do CSP falhou antes da inclusão e passou depois. Nenhum painel externo ou segredo foi alterado.
