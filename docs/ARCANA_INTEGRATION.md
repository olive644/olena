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

Fonte: https://github.com/ekelen/tarot-api e https://tarotapi.dev, textos de A. E. Waite, The Pictorial Key to the Tarot (1910). O README permite usar static/card_data.json como fonte local. public/arcana/tarot-api.json guarda a cópia original em inglês dos campos nome, significado normal/invertido e descrição, obtida em 28/10/2026. Ela é só registro da fonte e não é lida pelo app.

O que a pessoa lê é public/arcana/tarot-ptbr.json: tradução integral para português do Brasil das 78 cartas (nome, significado, invertida e simbolismo completo, com os mesmos parágrafos da fonte, sem resumo no lugar do texto). Os nomes são os títulos do catálogo, e a terminologia segue o baralho do app: Paus, Copas, Espadas, Ouros, Pajem, Cavaleiro, Rainha, Rei, consulente. A atribuição a Waite e à tarot-api continua visível, agora dizendo que o texto é tradução. Resumos em português do catálogo Olena (campo meaning) seguem separados do texto de Waite. Trechos incompletos da fonte são sinalizados por notas editoriais em português, sem reconstrução inventada: Cinco de Paus termina no meio da frase, e a Torre traz o fragmento corrompido House of We.

Ao inspecionar, useTarotMeaning carrega somente /arcana/tarot-ptbr.json, com cancelamento e prazo de oito segundos, validação dos campos e identidade. O app não consulta mais https://tarotapi.dev: a API só devolve inglês, e texto externo nunca pode sobrescrever o português. Não há envio de perfil, progresso, UID ou favoritos, nem tráfego externo para esta função. Respostas são texto React, nunca HTML. Falha ao ler a cópia mostra "Texto indisponível no momento". Troca de seleção cancela a leitura e não aplica resposta de outra carta. O cache em memória tem no máximo as 78 identidades permitidas. Nenhuma API paga, chave, tradutor automático ou modelo de IA foi adicionado.

## Provas

Testes de catálogo, migração, sorteio, merge, favoritos, integridade da tradução das 78 cartas (src/data/tarot-ptbr.test.ts), leitura somente da cópia em português e cancelamento; modos claro/escuro, PC/celular no navegador. Resultados finais registrados no CURRENT_STATE_AUDIT.

### Privacidade e disponibilidade

Histórico: a consulta de ar17 a tarotapi.dev respondeu HTTP 200 com objeto card e CORS liberado, e a política passou para a versão 2026-10-29 para descrever essa conexão. Desde a tradução (2026-10-29) a conexão não é feita. A origem tarotapi.dev ainda consta na CSP (vercel.json) e na política de privacidade, e os testes e2e ainda a interceptam; remover essas referências é uma decisão separada, fora desta correção.
