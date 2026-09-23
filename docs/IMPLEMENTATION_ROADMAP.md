# Roadmap de implementação

## Direção

O OlenaStudy evolui como um workspace de estudos conectado. O início é o **Espaço do aluno**. Cada
entrega deve preservar os dados existentes, funcionar no celular e entrar por uma pull request
pequena o bastante para revisão.

## Fases

| Fase | Entrega principal                           | Dependências prováveis                              | Critério de saída                                           |
| ---- | ------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| 1    | Espaço do aluno e catálogo de módulos       | React e TypeScript atuais                           | início claro, navegação consistente e estados honestos      |
| 2    | Planner semanal, checklist e cronograma     | sem dependência obrigatória                         | tarefas ligadas a matérias e blocos semanais persistidos    |
| 3    | Banco de questões e vestibulares            | parser próprio; importação só após análise jurídica | filtros, respostas, correção e caderno de erros testados    |
| 4    | Documentos e notas rápidas                  | avaliar TipTap ou Lexical                           | edição acessível, salvamento e histórico local              |
| 5    | Digitalização local entregue; OCR pendente  | avaliar serviço isolado ou OCR em worker            | captura e desenho locais; OCR exige revisão humana          |
| 6    | Mapas de conteúdo                           | avaliar React Flow                                  | blocos conectáveis, teclado, toque e exportação estruturada |
| 7    | Relógio flip e foco avançado                | CSS e Web Workers antes de novas libs               | cronômetro resiliente e sem falsa promessa de bloqueio web  |
| 8    | Helena inteligente                          | backend aprovado e contrato existente               | fontes citadas, consentimento, limites e observabilidade    |
| 9    | Bingo entregue; cultura e trilhas pendentes | domínio próprio                                     | conteúdo autoral, acessível e ligado ao progresso           |
| 10   | Conta, sincronização e comunidade           | backend, autenticação e moderação                   | ameaça revisada, privacidade e recuperação de dados         |

## Decisões de tecnologia

Adicionar uma linguagem ou biblioteca é permitido quando ela reduz risco ou complexidade total.
Antes de adotar, a PR deve registrar necessidade, alternativas, licença, manutenção, impacto no
bundle e superfície de segurança.

| Necessidade                  | Primeira opção                    | Alternativa quando justificada                                          |
| ---------------------------- | --------------------------------- | ----------------------------------------------------------------------- |
| Interface e domínio web      | React + TypeScript                | manter, evitando outro framework sem ganho comprovado                   |
| Persistência local maior     | IndexedDB com adaptador pequeno   | Dexie após medir a complexidade das consultas                           |
| Editor de documentos         | APIs nativas para protótipo       | TipTap ou Lexical após teste de acessibilidade                          |
| Mapa conectado               | SVG e domínio próprio             | React Flow se teclado e toque forem satisfatórios                       |
| OCR                          | processamento isolado no servidor | Tesseract em worker para modo local, com custo de bundle medido         |
| Processamento documental     | TypeScript no backend             | Python em serviço isolado quando bibliotecas de OCR/PDF forem decisivas |
| Tarefas intensivas e seguras | Web Worker                        | Rust/WASM somente com benchmark e manutenção definida                   |

Nenhuma dessas alternativas está aprovada antecipadamente. A escolha acontece na fase que precisa
dela, com teste de desempenho e ameaça correspondente.

## Contrato por pull request

1. Atualizar o catálogo e a documentação de estado.
2. Evoluir o domínio antes da interface quando houver dados novos.
3. Criar migração de workspace sem apagar dados anteriores.
4. Testar reducer, persistência, acessibilidade e fluxo principal.
5. Executar `npm run verify` e `npm run test:e2e`.
6. Abrir PR sem merge automático e aguardar autorização explícita.
