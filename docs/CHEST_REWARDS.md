# Baús de Matemática

## Política compartilhada

- Uma partida com pelo menos 100 pontos pode entregar um baú, se houver espaço.
- Há três espaços compartilhados por lugar. Comum e arcano usam a mesma fila.
  Baús abertos com cartas ainda não reveladas continuam ocupando espaço.
- O sorteio ocorre uma única vez por recibo: 95% comum e 5% arcano. O arcano
  substitui o comum, não é uma segunda recompensa. Rodadas sem elegibilidade
  não sorteiam. Todos os lugares de Matemática usam essa regra; outras matérias
  ainda não têm este minigame ativo.
- Tocar no baú inicia um prazo absoluto de 60 segundos, preservado ao sair ou
  sincronizar. O tempo não reinicia. Durante a espera há relógio, salto e barra
  separada do desenho. A barra desaparece quando o baú fica pronto.
- Tocar no baú pronto persiste a abertura antes da animação de 500 ms. O booster
  começa de costas; clique, teclado ou arraste com mouse/dedo revela a carta.
  É possível inspecionar em 360 graus imediatamente, antes de guardar.
- Revelações incrementais e coleção derivada do histórico evitam crédito duplo.
  Guardar leva as cartas à coleção. Fechar antes permite retomar sem novo sorteio.
- Registros históricos não são descartados. Se dispositivos offline somarem mais
  de três pendentes, a fila conserva todos e mostra lotes de três. Novas partidas
  não acrescentam baús até liberar espaço.

## Conteúdo por tipo

| Tipo   | Chance por partida elegível | Conteúdo                                                              | Acabamento                                                               |
| ------ | --------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Comum  | 95%                         | 80% de uma carta comum, 20% de duas                                   | Madeira discreta, grafite e prata                                        |
| Arcano | 5%                          | Uma carta de tarot, atualmente XVII, A Estrela, 100% dentro do arcano | Papel roxo, fecho de estrela dourada, brilho e sequência sonora próprios |

As dez cartas comuns mantêm seus pesos individuais em `oliver-cards.ts`.
Nenhum baú entrega mais de duas cartas. O tarot não entra no sorteio comum.
Consultar a vitrine de tarot não concede posse. A arte de tarot tem moldura
própria, área sem recorte e reflexo de película que acompanha a inspeção.
Movimento reduzido mantém o brilho estático e elimina animações de viagem.

## Persistência, compatibilidade e próximos tipos

`helena.mathPlaceRewards.v1` continua sendo a chave sincronizada existente.
`kind` e `arcana` são aditivos. Sem `kind`, o baú é comum. `cards` continua
restrito aos IDs comuns, preservando leitores anteriores. `arcana` guarda o
tarot escolhido na entrega; abrir não sorteia novamente. Baús antigos abertos
sem cartas não recebem recompensas retroativas.

Clientes antigos não conhecem o arcano e podem apresentá-lo ou abri-lo como
comum. Seus campos de tarot são preservados; o leitor atual prioriza `arcana`
e não credita cartas comuns indevidas do mesmo baú. Atualizar todos os aparelhos
antes de abrir novos tipos. Diferenças de tipo ou sorteio para o mesmo ID geram
o backup de conflito existente, não um novo sorteio ou descarte.

Para adicionar outro tipo: definir ID estável, chance explícita, conteúdo
permitido e apresentação própria. Reutilizar elegibilidade, limite, prazo,
recibo e revelação. Estender validação e união de snapshots antes de ativar a
chance. Acrescentar provas de leitura antiga, conflito, limite compartilhado,
abertura antecipada e retomada. Não renomear IDs publicados nem apagar chaves
em rollback. Novas cartas de tarot exigem ampliar a whitelist de `arcana`.

Esta é uma coleção pessoal, não uma economia competitiva: sorteio, relógio e
pontuação do cliente não são protegidos contra adulteração. Autenticação e envio
reutilizam Firebase; limites estão em `MATH_REWARDS_SYNC.md`.

## Áudio e latência

A busca de plugins disponíveis não retornou integração FX Studio. Sons são
sintetizados pelo WebAudio do app, desbloqueados por gesto e respeitando silêncio.
Arcano usa timbre e sequência diferentes para destrancamento, abertura e revelação.
Não há novo serviço ou dependência.

As respostas continuam sendo validadas pela API Olena. O áudio começa no gesto;
a pontuação só muda após validação. A pausa mínima de feedback, 260 ms ao acertar
e 600 ms ao errar, se sobrepõe ao tempo da requisição em vez de ser somada a ele.
Não há loading de página entre questões. Rede lenta ainda pode exigir espera;
respostas duplicadas permanecem bloqueadas e erros permitem tentar novamente.
