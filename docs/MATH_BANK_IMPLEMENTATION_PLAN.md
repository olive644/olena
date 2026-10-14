# Banco misto de Matemática, preparação (2026-10-13)

Estado: expansão do minigame e progressão v4. Banco fechado com oito formatos por etapa e seis variantes fixas, 1728 entradas ao todo. Três são adaptações identificadas de Thompson, as demais são autorais. Isso não equivale a 1728 raciocínios independentes, a um banco de provas recentes ou a uma validação pedagógica profissional. Revisão humana, ampliação de curadoria e calibração continuam pendentes. v3 permanece congelado para compatibilidade e migração preservadora; ver CURRENT_STATE_AUDIT.md e SECOND_BRAIN.md.

## Requisito confirmado

Substituir os modelos numéricos repetitivos por questões autorais e questões de fontes reais identificadas. O aplicativo poderá ter assinatura ou uso comercial. Não declarar domínio após seis acertos. Preservar papel recortado, acesso offline, correção imediata e progresso da conta.

## Auditoria inicial das fontes

- OpenStax, páginas atuais consultadas: licença CC BY-NC-SA, portanto não incorporar ao produto que poderá ter uso comercial. Não presumir que uma edição antiga tem outra licença sem verificar aquela edição.
  - https://help.openstax.org/s/article/Licensing-information-of-OpenStax-textbooks
  - https://openstax.org/books/prealgebra-2e/pages/preface
- ENEM, cadernos publicados pelo Inep: acesso oficial confirmado, mas a pesquisa não confirmou permissão específica de incorporação comercial do conjunto de questões. A publicação na internet, isoladamente, não é autorização. Não importar enunciados, figuras ou gabaritos para um banco de produção antes de resolver a permissão.
  - https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2023
- Eureka!, edição especial de 2007, página 2: a nota permite reprodução de artigos com citação da fonte. Não generalizar essa nota para todas as provas OBM/OBMEP ou questões de competições internacionais incluídas na edição. Conferir o alcance da autorização antes de escolher itens.
  - https://www.obmep.org.br/docs/Eureka.pdf
- Alternativa identificada: exercícios de obras históricas em domínio público, combinados com questões autorais. Isso não equivale a questões reais do ENEM/OBMEP. Precisa da escolha do proprietário antes de substituir a origem de provas inicialmente discutida.
  - Calculus Made Easy, Silvanus P. Thompson (1851-1916): https://www.gutenberg.org/ebooks/33283
  - A First Book in Algebra, Wallace C. Boyden (1858-1937): https://www.gutenberg.org/ebooks/13309
  - The First Steps in Algebra, George Albert Wentworth (1835-1906): https://www.gutenberg.org/ebooks/36670
  - Conferir edição, autoria, eventuais contribuições modernas e território de distribuição. Não copiar traduções recentes ou conteúdo de uma editora diferente só porque a obra original é antiga.
  - Referência de duração dos direitos no Brasil: https://www.planalto.gov.br/ccivil_03/leis/l9610.htm

## Banco e revisão

Cada item deve ter ID estável, revisão, enunciado, alternativas significativas, resposta, resolução comentada, justificativas de erros, habilidade, dificuldade editorial e procedência. Itens externos precisam de instituição/autor, edição/ano, número ou localização original, URL e evidência de permissão comercial. Distinguir original, tradução e adaptação. Não apresentar itens autorais como prova real, dificuldade editorial como dificuldade estatisticamente calibrada, nem revisão automática como avaliação por um professor.

Para Fundamental e Médio, mapear habilidades específicas da BNCC. Pré-cálculo e Cálculos I/II/III precisam de objetivos próprios, não de códigos BNCC inventados. Questões devem variar o raciocínio e a representação, não só o valor dos números.

## Critério implementado e limites

O proprietário definiu ilhas como minigames, separadas da futura aba de ensinamentos. Só o Pátio inicia liberado. Cada etapa tem 48 IDs estáveis em oito formatos; a seleção intercala formatos e três faixas editoriais de dificuldade, além de retomar erros com intervalo. Vinte acertos distintos superam a etapa. Seis etapas concluídas liberam o lugar seguinte. A porcentagem indica conclusão do jogo, não domínio científico de uma disciplina. Avanço sobrevive a erros, repetição não conta duas vezes e acertos de aparelhos diferentes são unidos por ID. Pontos/baús antigos continuam intactos; acertos v3 preservam crédito, sem fingir que são respostas aos itens extras.

As regras abaixo são objetivos de qualidade para ampliar o banco, não recursos todos já entregues:

- Uma resposta correta rápida não prova compreensão ou retenção.
- Contar questões distintas e cobertura das habilidades, não repetir o mesmo modelo com números diferentes para inflar progresso.
- Política inicial a calibrar: pelo menos 24 questões distintas por tema, cobertura das habilidades/dificuldades previstas e desempenho sustentado, com revisão posterior. A quantidade e os limites são decisões de produto, não critérios científicos já validados.
- Separar progresso de prática, prontidão para avançar e revisão pendente. Não anunciar certificação de domínio absoluto de uma disciplina.
- Não oferecer a conclusão de um tema se o banco não tiver conteúdo suficiente para satisfazer seus critérios. Repetições para revisão não contam como conteúdo novo.
- Questões contextualizadas precisam de tempo de leitura adequado; não reutilizar automaticamente o prazo de 14 segundos das contas rápidas. Velocidade não define domínio.

## Compatibilidade e verificação

Introduzir contrato próprio para o banco e progresso por evidências, mantendo consumidores v1/v2. Preservar conquistas/pontos antigos como histórico, sem convertê-los automaticamente em domínio pelo novo critério. Armazenar IDs e revisões dos itens, tentativas e revisões por conta; mesclar evidências sem duplicar respostas replicadas nem perder registros em outra aba/aparelho. Não aumentar o bundle inicial com o banco inteiro.

Exigir testes de integridade do banco e resolução, não repetição, fonte/licença, progressão, insuficiência de conteúdo, revisão posterior, migração, sincronização e isolamento entre contas. Validar enunciados/alternativas longos, teclado, toque, claro/escuro, movimento reduzido e funcionamento offline no navegador. Validação matemática automatizada não substitui revisão pedagógica humana.

## Decisão confirmada pelo proprietário

Questões autorais e exercícios de obras em domínio público aprovados como primeira combinação. O aplicativo poderá ter assinatura. Não apresentar esses exercícios como questões de provas recentes. Não há autorização para incorporar fontes NC, contornar licença por treinamento ou copiar bancos comerciais.

## Regra sobre API, estudo e licença

- API não aprende automaticamente por consultar material. Armazenamento, busca contextual e treinamento de modelo são processos diferentes e precisam de procedência própria.
- Remover uma URL, biblioteca ou arquivo não remove necessariamente enunciados, imagens, adaptações, índices, cópias ou modelos derivados existentes no produto. Não tratar essa remoção como autorização comercial.
- Conteúdo matemático factual, conceitos e métodos não se confundem com a expressão protegida de uma obra. Criar exercícios efetivamente independentes é diferente de traduzir ou parafrasear enunciados e apenas mudar números.
- A condição NC não depende só de cobrar do usuário: a definição considera finalidade e vantagem comercial. Não considerar uma fase gratuita automaticamente não comercial.
- Usos de IA e exceções de direito autoral dependem dos fatos e da jurisdição. Não afirmar que todos os modelos treinados são obras derivadas, nem que treinar elimina obrigações. Uma estratégia comercial com fontes restritas exigiria avaliação jurídica específica ou autorização do titular.
- O caminho adotado para o banco é conteúdo autoral, domínio público verificado ou licença comercial compatível documentada. Nunca apagar créditos para disfarçar a origem.
- Referências: https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.pt e https://creativecommons.org/faq/ (seções NonCommercial, inteligência artificial, fatos e ideias).
