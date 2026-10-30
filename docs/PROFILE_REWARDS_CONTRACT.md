# Contrato de cartas e conquistas no perfil público e no feed

Branch `feat/profile-rewards-data`. Somente dados e contrato: nenhuma mudança visual, de chances de sorteio, de regras do Firebase, de autenticação ou de segredos.

## Perfil público (`SocialProfile`)

Campos opcionais, devolvidos só quando a conta tem perfil compartilhado, não há bloqueio em nenhum sentido e a pessoa já publicou seus destaques de cartas:

- `cardFavorites`: até 3 IDs únicos do catálogo (`ARCANA_IDS`), obtidos, na ordem escolhida.
- `cards`: os mesmos IDs públicos dos destaques. Nunca o inventário.
- `cardDates`: data ISO real de revelação, só para os destaques e só quando conhecida. Nunca a data atual inventada.

`[]` removido de propósito continua vazio. Ausência dos campos significa que nada foi publicado. O visitante usa esses campos como dados públicos e não lê a coleção local da pessoa visitada. Raridade vem do catálogo no cliente (`oliverRarity`); não trafegam imagem, título, texto livre nem UID.

## Ação `share`

Aceita `cards`, `cardDates` e `cardFavorites` (campos extras seguem rejeitados). Aqui `cards` e `cardDates` são o inventário sanitizado da própria conta e ficam privados no servidor, apenas para validar os destaques (um favorito não obtido é descartado). Validações: IDs do catálogo, únicos, no máximo 78; favoritos no máximo 3; datas no formato ISO `Z`. Qualquer violação responde 400 "Cartas inválidas.". A mesma confiança das conquistas: o cliente autenticado afirma, o servidor valida formato e vínculo. Isto não é anticheat e a publicação não concede recompensa.

O hook `useProfilePresentation` publica os destaques efetivos que o próprio perfil mostra: sem escolha, sugere os 3 primeiros obtidos (ordem do catálogo); `[]` explícito segue vazio; IDs não obtidos são descartados. O mesmo vale para os destaques de conquistas.

## Atividades

`SocialActivitySummary.kind` ganha `card` e `achievement`, com `ref` (ID da carta ou da conquista), `value` 1 e `at` real. O ID da atividade é um hash estável por primeira obtenção (`card:<id>`, `achievement:<id>`): cópias extras nunca geram novo evento e republicar não duplica nem reabre avisos lidos.

- Cartas: derivadas no servidor do ledger `helena.mathPlaceRewards.v1` da conta, só cartas reveladas com `revealedAt` comprovado, não futuro, data mais antiga por carta. A Estrela antiga é mapeada para `major-17`; cartas retiradas não geram evento.
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
- Cartas obtidas antes de ativar o compartilhamento não viram atividade.
- Datas ausentes ficam sem evento e sem `cardDates`.
- Teste e2e e build não foram executados nesta etapa.

## Rollback

Reverter o commit. Os campos novos ficam no armazenamento do servidor (`cards`, `cardDates`, `cardFavorites`, `cardsUpdatedAt`, `cardFavoritesUpdatedAt`) e são ignorados pelo código anterior; nenhuma migração nem apagamento de ledger. Atenção: atividades `card` e `achievement` já gravadas duram até 48 horas e o código anterior não tem o filtro `rewards`, então um cliente antigo recebendo uma delas perderia o feed. Antes de reverter o servidor, pare de publicar (reverta primeiro o cliente) e espere 48 horas, ou reverta só o cliente e mantenha o servidor filtrando.
