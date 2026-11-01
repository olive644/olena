# Soluções offline da revisão de Matemática

Base: `665e3adfa76a061433f62baf4030501eef8d6e14`.
Branch: `feat/math-review-solutions`, worktree `math-review-solutions`.

Interface: `mathReviewExplanation(course: MathCourseId, q: MasteryQuestion): string[]`.
Recebe o snapshot original do banco revisão 3. Retorna passos autorais em português,
fonte original da questão e conclusão `Resposta: valor.`. Não reembaralha nem regenera
alternativas, não usa `review` como solução e não importa o banco em runtime.

Cobertura: seis cursos, seis etapas, oito famílias por etapa, seis variantes de
prática e quatro famílias reservadas do final com seis variantes adicionais.
São 1.728 questões de prática, também utilizáveis como recovery, e 864 finais.
As três adaptações de Thompson têm tratamento explícito dos expoentes 13, -3/2
e 2,4, mantendo integralmente o crédito do snapshot. Nenhuma fonte externa foi
consultada ou incorporada nesta implementação.

As contas são derivadas por família e parâmetro editorial, com resultado numérico
independente comparado ao gabarito do snapshot. Arredondamento de conclusão segue
as duas casas do banco; frações nas etapas mantêm a expressão exata e usam `≈`
quando o valor exibido foi arredondado. Estimativa por tangente é identificada.
Área geométrica e integral assinada permanecem distintas.

Erros explícitos: revisão, ID, seed, formato ou fase final incompatíveis, formato
sem solução ou conclusão divergente. O consumidor deve tratar o erro sem inventar
uma solução substituta. O contrato espera snapshot imutável do banco desta revisão;
não autentica texto ou fonte alterados mantendo o mesmo ID/gabarito. Uma mudança
editorial do banco exige revisão das tabelas e dos testes, mesmo se conservar o ID.

A função não avalia tentativas e não altera vidas, tempo, pontos, domínio, recovery,
eventos de prática, recibos ou estado sincronizado. A integração com tela, captura
de erros da rodada e transição de resultado é responsabilidade da tarefa de UI.
Não chamar os motores de progressão para responder à revisão gratuita.

Validação: 13 testes focados, incluindo varredura de todas as variantes com duas
ordens de alternativas, fase recovery, snapshots congelados, fontes, casos Thompson,
intermediários selecionados e arredondamento; typecheck do projeto e ESLint dos dois
arquivos aprovados. Sem execução do app, teste em navegador ou validação pedagógica
humana integral. Verificação completa e orçamento de bundle ficam para a integração,
antes de publicação. Nenhuma publicação ou merge nesta entrega.
