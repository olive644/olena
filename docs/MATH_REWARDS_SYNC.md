# Sincronização de recompensas da Matemática

Pontos por lugar, recibos de partidas, baús, prazo absoluto, sorteios e cartas
reveladas usam `helena.mathPlaceRewards.v1`, na lista da sincronização Firebase
existente. Escritas locais disparam a fila de envio; sem rede continuam locais
e o mecanismo existente tenta novamente. Não foi adicionado outro login ou serviço.

## Migração e conflitos

- `kind` e `arcana` são opcionais e aditivos. Baús sem tipo continuam comuns.
  Tarot é definido na entrega e unido pelo mesmo ID; diferenças de tipo geram
  conflito recuperável. Clientes antigos não têm interface de arcano: atualizar
  todos antes de abrir novos tipos. Regras completas em `CHEST_REWARDS.md`.

- Conta antiga sem a chave importa os dados locais da mesma pessoa no primeiro
  login. A política existente de dono do dispositivo apaga os dados ao trocar
  de conta. Sair ou excluir a conta também limpa as recompensas locais.
- `rounds` é um campo opcional, mantendo a leitura dos registros antigos.
  Partidas novas guardam pontos por recibo: unir dois dispositivos conta cada
  recibo uma única vez. Totais legados são preservados; se dois clientes antigos
  alteram o mesmo total, sem valores por partida, não é possível somá-los com
  certeza. O conflito é sinalizado e os snapshots ficam no backup existente.
- Baús são unidos por ID. Destrancamento conserva o primeiro prazo; abertura e
  revelação não retrocedem. A coleção deriva das revelações, sem crédito separado.
- Sorteios diferentes do mesmo baú aberto offline em dois dispositivos são um
  conflito: o sorteio local permanece, sem rerrolagem, e o remoto fica no backup
  `helenastudy.sync-conflict.v1`. Não há promessa de duas recompensas para um baú.
- Até três espaços visíveis. Se dispositivos offline entregam mais de três baús
  simultaneamente, os extras ficam preservados na fila, não são descartados.
  Novas partidas não concedem baús enquanto há três ou mais pendentes.
- Receber dados remotos fecha um booster aberto para não revelar um snapshot
  antigo. Trocar de conta encerra o minigame; a liquidação também verifica o dono.

## Segurança e limites

Reutiliza autenticação, caminho privado `users/{uid}/state` e regras de acesso
da sincronização existente. Não envia dados a terceiros adicionais nem grava
credenciais em cartas. Testes usam Firebase e rede simulados, sem dados reais.

Esta é uma coleção pessoal sincronizada, não uma economia competitiva validada
no servidor. Relógio, resultados e armazenamento do cliente podem ser adulterados.
O transporte existente não oferece uma transação de economia entre dispositivos;
conflitos simultâneos podem exigir recuperar o backup. Não usar para compras,
trocas, prêmios financeiros ou ranking sem validação autoritativa adicional.

## Reversão

Não há exclusão ou conversão destrutiva. Remover a integração de envio deixa o
schema local legível e preserva os dados remotos. Clientes anteriores ignoram
`rounds`; podem sobrescrevê-lo ao jogar, portanto convém atualizar todos os
dispositivos. A união mantém recibos e histórico para recuperação. Não apagar
a chave ou o backup como parte de uma reversão.

## Provas

Testes cobrem upload no login com snapshot antigo, envio de novas partidas,
deduplicação entre aparelhos, atualização visual remota, retomada do prazo e
cartas, migração de recibos legados, conflito de sorteio, dados inválidos e limpeza
por conta. Teste real com duas contas/dispositivos autenticados ainda não executado.
