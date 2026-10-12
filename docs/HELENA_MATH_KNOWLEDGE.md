# Referências matemáticas da Helena

## Escopo

A Helena recebe referências matemáticas locais e resultados de uma ferramenta de cálculo no contexto da resposta. O fluxo funciona tanto no professor Cloudflare quanto em um futuro modelo próprio aprovado, em geração e streaming. Não modifica treinamento, promoção de candidatos, provedor, autorização, quotas ou destino das mensagens.

O conteúdo é original da OlenaStudy, escrito para este projeto e versionado em `src/backend/math/knowledge.ts`. Não copia livros, sites ou APIs e não adiciona dependências, contas ou um índice externo. A busca lexical consulta somente o pedido atual e seleciona até três referências, sem analisar histórico privado ou materiais do aluno para indexação. Esta é uma primeira base consultável, não uma biblioteca completa nem um sistema de busca semântica.

São 17 tópicos: operações, sinais, frações, decimais, porcentagens, proporções, potências e raízes, equações de primeiro e segundo grau, funções, progressões, geometria plana, Pitágoras, probabilidade, estatística, logaritmos e trigonometria. Condições de domínio e exemplos acompanham os textos. Cada exemplo numérico declaradamente verificável passa pela ferramenta em testes; isso não substitui revisão pedagógica humana ampla.

## Cálculos

`src/backend/math/calculator.ts` implementa um parser limitado, sem `eval`, compilação de código, acesso à rede ou leitura de variáveis do aplicativo. Usa frações com BigInt para evitar que 0,1 + 0,2 receba erro de ponto flutuante. A fração é preservada como resultado exato; a representação decimal de frações é identificada como aproximação.

Suporta adição, subtração, multiplicação, divisão, parênteses, potências com expoentes inteiros entre -12 e 12, porcentagens, comparação de igualdades e equações lineares em x. Exemplos aceitos no chat:

- `Quanto é 1/3 + 1/6?`
- `Calcule 20% de 150`
- `Explique -2²`
- `Resolva a equação 2x + 3 = 11`
- `Verifique 2 + 3 = 4`

Não resolve raízes, funções trigonométricas/logarítmicas, derivadas, integrais, equações não lineares ou divisores com variável. Ter a explicação de Bhaskara na base não significa ter uma ferramenta que confira qualquer equação quadrática. Texto livre e problemas com unidades não são convertidos automaticamente em contas, para evitar conferir uma expressão diferente daquela que o aluno pretendia.

Limites: expressão de 240 caracteres, até 96 tokens, aninhamento máximo de 16, números de até 32 caracteres por token e resultados/intermediários limitados a 10^80. Números separados por espaços e pontos ambíguos de milhar são recusados. Use vírgula para decimais e escreva números sem separadores de milhar. Multiplicação implícita é limitada a formas inequívocas como 2x e 3(x-2). Resultado indefinido e sintaxe inválida retornam `invalid`; operações fora do escopo retornam `unsupported`.

## Integração e limites da resposta

`helenaModelInput` monta o contexto no servidor. O contrato público não aceita o campo `math`; fontes do aluno ficam separadas e não podem passar por referência interna ou cálculo confiável. O contexto interno registra versão, origem, tópicos e, quando cabível, estado da calculadora. Planejamento e resumo não disparam cálculo automático. Cada resposta continua fazendo uma única chamada ao provedor existente.

A política pede explicação por etapas, identificação do tópico usado, respeito ao resultado exato e declaração honesta de limites. Apenas `status=checked` permite afirmar que a ferramenta conferiu aquela expressão. O modelo ainda pode errar ao explicar ou desobedecer ao contexto; esta mudança não certifica toda resposta textual e não remove o aviso de IA do chat. Não há execução automática de ferramentas escolhidas pelo modelo.

Não são guardadas conversas, perguntas ou resultados para aprendizado. As referências próprias não entram automaticamente no corpus de treinamento candidato. Autenticação e consentimento existentes continuam obrigatórios. Nenhum exemplo de teste é enviado a um provedor real.

## Validação e manutenção

`npm run verify` cobre os testes do parser, exemplos didáticos, seleção de referências, separação de fontes, contrato e os dois provedores. Testes de geração e streaming capturam a requisição enviada ao provedor simulado para provar que recebem o mesmo contexto. Alterações nos textos devem incrementar `MATH_KNOWLEDGE_VERSION`, manter condições de domínio e incluir provas numéricas quando o parser suporta a operação.
