# Contrato de cartas e conquistas no perfil público e no feed

Branch `feat/profile-rewards-data`. Somente dados e contrato: nenhuma mudança visual, de chances de sorteio, de regras do Firebase, de autenticação ou de segredos.

## Perfil público (`SocialProfile`)

Campos opcionais, devolvidos só quando a conta tem perfil compartilhado, não há bloqueio em nenhum sentido e a pessoa já publicou seus destaques de cartas:

- `cardFavorites`: até 3 IDs únicos do catálogo (`ARCANA_IDS`), obtidos, na ordem escolhida.
- `cards`: os mesmos IDs públicos dos destaques. Nunca o inventário.
- `cardDates`: data ISO real de revelação, só para os destaques e só quando conhecida. Nunca a data atual inventada.

`[]` removido de propósito continua vazio. Ausência dos campos significa que nada foi publicado. O visitante usa esses campos como dados públicos e não lê a coleção local da pessoa visitada. Raridade vem do catálogo no cliente (`oliverRarity`); não trafegam imagem, título, texto livre nem UID.

## Ação `share`

Aceita `cards`, `cardDates` e `cardFavorites` (campos extras seguem rejeitados). O limite de 4096 bytes do corpo não muda, então o inventário não é enviado: `cards` leva só os destaques efetivos obtidos (até 3, os mesmos de `cardFavorites`) e `cardDates` só as datas deles. O servidor guarda esse conjunto mínimo para validar os destaques e a resposta pública continua com até 3. Validações: IDs do catálogo, únicos, `cards` e `cardFavorites` com no máximo 3, `cardDates` com no máximo 3 datas ISO `Z`. Qualquer violação responde 400 "Cartas inválidas.". Um favorito fora de `cards` é descartado. A confiança é a mesma das conquistas: o cliente autenticado calcula os destaques obtidos, o servidor valida formato e vínculo. Isto não é anticheat e a publicação não concede recompensa. Um payload com 78 cartas obtidas continua pequeno (teste do hook).

O hook `useProfilePresentation` publica os destaques efetivos que o próprio perfil mostra: sem escolha, sugere os 3 primeiros obtidos na ordem de `ARCANA_IDS` (a UI deve usar a mesma ordem); `[]` explícito segue vazio; IDs não obtidos são descartados. O mesmo vale para os destaques de conquistas.

## Atividades

`SocialActivitySummary.kind` ganha `card` e `achievement`, com `ref` (ID da carta ou da conquista), `value` 1 e `at` real. O ID da atividade é um hash estável por primeira obtenção (`card:<id>`, `achievement:<id>`): cópias extras nunca geram novo evento e republicar não duplica nem reabre avisos lidos.

- Cartas: derivadas no servidor do ledger `helena.mathPlaceRewards.v1` da conta, só cartas reveladas com `revealedAt` comprovado e não futuro, usando a data mais antiga entre todas as cópias. O ledger inteiro é varrido, sem janela parcial. Limites explícitos: 5 000 000 de caracteres e 5000 baús; acima disso, ou diante de qualquer baú aberto incoerente (`revealed` fora de 0 até o tamanho, mistura de `arcana` e `cards`, `kind` divergente, carta fora do catálogo), nenhum evento de carta é gerado, em vez de inventar uma primeira data. Carta com qualquer cópia revelada sem data conhecida também fica sem evento, pois a primeira pode ser essa. A Estrela antiga é mapeada para `major-17`; cartas antigas aposentadas ocupam posição mas não geram evento. Nenhum registro do ledger é alterado.
- Conquistas: derivadas do que a própria conta já publicou no servidor (`achievements` com `achievementDates`), sem leitura extra.
- Valem consentimento (`activitySharing`), janela (`activitySince`, nada retroativo), retenção de 48 horas, limite de 12 atividades, bloqueio e curtidas já existentes.

## Compatibilidade

O cliente novo envia `rewards=1` na query de toda requisição. Sem esse parâmetro o servidor omite atividades e avisos (inclusive de curtida) `card` e `achievement`, então um cliente antigo, cujo validador rejeita `kind` desconhecido, não perde o feed. Campos novos de perfil são aditivos e ignorados por clientes antigos. Texto de atividade em `social-activity-card.tsx` é provisório, para manter o TypeScript fechado; a copy final é da direção visual.

## Leituras e custo

- `GET`: 0 leituras novas.
- `share`: 0 leituras novas.
- `publish-activities`: +1 leitura do Realtime Database (`users/<uid>/stateV2/items/<chave do ledger>`) em `completedActivities`, dentro das mesmas cotas (2 por minuto e 120 por dia por usuário, 10000 por dia global). No pior caso, +10000 leituras por dia no total. Falha nessa leitura é engolida: só as cartas ficam de fora e os resumos de estudo seguem.
- Custo real em produção: não medido. Para conferir, comparar as leituras do Realtime Database antes e depois do deploy.

## Modelo de ameaça

- Autoatribuição: um cliente adulterado pode afirmar cartas ou conquistas que não tem nos destaques públicos (mesma limitação das conquistas hoje). Os eventos de carta não sofrem isso, pois vêm do ledger sincronizado, mas esse ledger também é gravado pelo cliente autenticado; não há prova criptográfica de sorteio.
- Privacidade: o visitante vê no máximo 3 cartas e suas datas. Inventário, duplicatas, baús e recibos nunca saem do servidor. Bloqueio nos dois sentidos oculta os campos e as atividades.
- Isolamento: chaves por hash de UID, UID nunca no corpo nem na resposta, origem conferida, limite de 4096 bytes por corpo, taxa de 30 por minuto.
- Entrada: IDs só do catálogo, datas só no formato ISO, sem texto livre.
- Fonte do ledger: formato lido sem depender de código do navegador; entradas fora do formato são ignoradas.

## Limitações

- A sugestão de 3 cartas usa a ordem de `ARCANA_IDS`; se `public/arcana/catalog.json` ordenar diferente, a sugestão do perfil local pode divergir da publicada.
- Um ledger acima do teto ou com baú incoerente desliga os eventos de carta daquela conta (os de estudo e conquista seguem).
- Cartas obtidas antes de ativar o compartilhamento não viram atividade.
- Datas ausentes ficam sem evento e sem `cardDates`.
- Teste e2e e build não foram executados nesta etapa.

## Rollback

Reverter o commit. Os campos novos ficam no armazenamento do servidor (`cards`, `cardDates`, `cardFavorites`, `cardsUpdatedAt`, `cardFavoritesUpdatedAt`) e são ignorados pelo código anterior; nenhuma migração nem apagamento de ledger. Atenção: atividades `card` e `achievement` já gravadas duram até 48 horas e o código anterior não tem o filtro `rewards`, então um cliente antigo recebendo uma delas perderia o feed. Antes de reverter o servidor, pare de publicar (reverta primeiro o cliente) e espere 48 horas, ou reverta só o cliente e mantenha o servidor filtrando.
