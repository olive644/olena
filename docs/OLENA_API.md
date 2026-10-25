# API oficial da Olena, versão 1

## Preparação do onboarding (2026-10-25)

POST `/api/olena?action=onboarding&version=1` recebe somente `{ answers }`, com as nove respostas canônicas em português na ordem de ONBOARDING_OPTIONS. A quinta resposta é a lista de modalidades, sem duplicatas; as demais são escolhas únicas. Interface e validação compartilham esse catálogo tipado em domain/onboarding-configuration. Não aceita texto livre, workspace, identidade ou campos extras.

A preparação é determinística, sem chamada a modelo, fornecedor ou treinamento. Meta diária corresponde aos 5, 15 ou 30 minutos escolhidos; decidir a cada dia não cria meta. O bloco de Foco fica limitado ao tempo escolhido e a 25 minutos quando há pausas, ou 30 quando o foco é contínuo. Sem tempo fixo, conserva o padrão de 25 minutos. Modalidades, organização, ritmo e programação seguem as escolhas explícitas, sem diagnosticar estilos de aprendizagem. A matéria inicial acompanha a escolha; em Idiomas, os cinco idiomas explícitos viram a disciplina correspondente. Ainda estou descobrindo não inventa uma matéria.

Retorna versão, ID estável derivado das escolhas, study preferences, focus preferences e uma disciplina opcional. Não cria tarefas, horários, progresso ou XP. As seis ilhas usam IDs estáveis; campos gerais sem ilha correspondente conservam somente a disciplina. Ilhas futuras continuam em prévia. Papel de professor no questionário não concede permissão.

Proteções: somente POST com JSON; origem da mesma implantação (ou o par localhost/127.0.0.1 no preview local), versão e parâmetros únicos, corpo limitado a 4096 bytes durante leitura, enumeração estrita de respostas, no-store, nosniff e sem CORS. Não há escrita no servidor, registro de respostas em log ou chamada paga de geração. O endpoint é público porque só calcula preferências a partir de escolhas limitadas, sem ler contas ou conceder acesso. A hospedagem continua responsável pelo tráfego público.

O cliente mostra o resumo antes do acesso e informa o uso das respostas no onboarding. Timeout de dez segundos permite tentar novamente ou continuar sem configuração automática, sem inventar uma resposta bem-sucedida da API. Login/redirect e convidado conservam a configuração no registro já existente de onboarding; objetos antigos que guardam somente respostas continuam válidos. Aplicação atômica no workspace cria/reutiliza a disciplina e marca onboardingSetupId, para não desfazer edições posteriores ao recarregar. Se a conta substituir o workspace durante o login, a configuração pendente é aplicada após cloud.ready. Nenhuma nova chave sincronizada ou regra Firebase.

configurationOwner identifica a conta escolhida no Google (ou guest), e configurationPending permanece true até a aplicação ao workspace pronto. Um GET anterior não substitui essa preparação quando o dono é a própria conta; preparações de outra conta nunca recebem essa prioridade. Depois de persistir o ID no workspace, o cliente marca a preparação como concluída. Voltar a entrar sem responder ao questionário não redefine preferências. A API recebe somente as escolhas, nunca o identificador do dono. Ajustes existentes de pausas e sessões em andamento são preservados.

Meta e matéria inicial são editáveis em Estudo e foco; a duração usa o controle original do Pomodoro. O Espaço compara os minutos reais concluídos com a meta. Foco respeita sessão recuperada e modo escolhido anteriormente, sem iniciar contagem. Praticar abre a ilha preferida, enquanto a ação explícita Explorar Matemática conserva prioridade.

## Matemática v5 (2026-10-14)

POST `/api/olena?action=math&version=5` aceita `action: question | answer`,
`course` e `progress: MasteryProgress`. Resposta usa `X-Olena-API-Version: 5`.
Em `answer`, enviar a questão integral retornada, `choice`, `elapsed`, `streak`
e, opcionalmente, `timedOut`. A seleção esperada, alternativas, prazo e progresso
são validados; entrada adulterada retorna 400. Limite do corpo: 4096 bytes.

O motor `requestMastery` compartilha a correção local com o minigame, incluindo
retomadas por família de erro, final de cinco questões reservadas e resultado
`finalOutcome: passed | retry | null`. `confirmed` registra etapas com final
concluída; `final` permite continuar uma final parcial. Quatro acertos aprovam;
reprovação conserva treino e exige quatro tentativas de reforço. Não há chamada
HTTP por resposta na interface, geração por IA, persistência nesta rota ou
certificação pedagógica. O cliente sincroniza o progresso privado pela conta.
Contratos Matemática v1/v2/v3/v4 e catálogo versão 1 permanecem disponíveis.
As regras de catálogo GET abaixo não substituem o contrato POST de Matemática.

## Escopo desta etapa

A API é independente de fornecedor e prepara o catálogo de metodologias para as ilhas
de Praticar. A Olena responderá somente por texto. Não há voz nesta API,
modelo conectado, geração por IA ou envio de materiais a terceiros.
O áudio existente dos minigames permanece em `/api/speech`, sem alterações.

O minigame de Matemática usa POST `/api/olena?action=math&version=1`: desafios
calculados e avaliação determinística, sem fornecedor de IA. Acertos e rapidez
promovem assuntos; dois erros consecutivos recuam um assunto, sem perder pontos
ou recorde. Um acerto limpa o contador. `MathProgress.errors` é opcional, inteiro
entre 0 e 2, compatível com progresso antigo sem esse campo. A conta enviada é
validada pela semente e pelo assunto de origem antes de preparar a próxima.

A função real está em `api/olena.ts`, na mesma implantação Vercel do aplicativo.
O handler usa Request/Response web e não depende do runtime Vercel. Sem dependências novas,
segredos, banco paralelo ou configuração adicional para estas consultas.

## Consultas disponíveis

| Consulta                 | URL                                                            | Resultado                                                                |
| ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Catálogo completo        | `GET /api/olena?version=1&action=catalog`                      | Capacidades, ilhas e metodologias                                        |
| Ilhas                    | `GET /api/olena?version=1&action=islands`                      | Seis ilhas com ID, nome, disciplina, descrição, temas e estado da trilha |
| Metodologias             | `GET /api/olena?version=1&action=methodologies`                | Lista e estado da base                                                   |
| Metodologias de uma ilha | `GET /api/olena?version=1&action=methodologies&island=biology` | Lista filtrada por ilha                                                  |

`GET /api/olena` equivale ao catálogo da versão 1. Para integrações, informar versão
explicitamente. IDs estáveis: `languages`, `portuguese`, `chemistry`, `biology`,
`mathematics` e `programming`. Não usar índice do carrossel, nome traduzido ou progresso
do usuário como identificação da ilha.

O catálogo deriva de `PRACTICE_ISLANDS`, a mesma fonte da interface, sem copiar títulos ou temas
para outro cadastro. Idiomas tem trilha jogável (`trail: available`). As outras cinco têm
trilhas visuais exploráveis (`trail: preview`), ainda sem exercícios, metodologias ou XP.
Todas as listas de metodologias são vazias nesta etapa. Isso é resposta válida,
não um erro nem uma afirmação de que já há atividades nas ilhas.

Exemplo:

```json
{
  "version": 1,
  "status": "foundation",
  "methodologies": []
}
```

Capacidades no catálogo:

```json
{
  "catalog": "available",
  "methodologies": "foundation",
  "textGeneration": "not_configured",
  "voice": "not_supported"
}
```

## Contrato e segurança

- Somente GET para o catálogo. As rotas POST de Matemática e preparação de onboarding seguem os contratos específicos acima; outros envios retornam 405 com `Allow: GET`.
- Parâmetros desconhecidos, repetidos ou filtro usado fora da consulta de metodologias retornam 400.
- Versões não suportadas retornam 400. Capacidades inexistentes, inclusive `speech` e `generate`, retornam 404.
- Erros JSON têm `version` e `error: { code, message }`, sem ecoar dados do pedido.
- Todas as respostas usam `X-Olena-API-Version: 1`, JSON UTF-8, `no-store` e `nosniff`.
- Catálogo público, somente metadados do produto. Não recebe nem retorna fotos, contas,
  progresso, respostas de alunos, workspace ou credenciais. Não exige login por não acessar dados privados.
- Não há CORS habilitado, chamadas externas, logs de materiais, persistência ou rate limit de geração:
  esta versão não executa modelos nem aceita conteúdo para gerar custo. A infraestrutura de hospedagem
  continua responsável por proteção de tráfego público.
- Vite dev/preview serve apenas o frontend. Para consultar a função HTTP de verdade,
  usar a implantação Vercel ou seu emulador de funções. Não confundir uma página HTML do preview com esta API.

Modelo de ameaça atual: abuso de verbos e parâmetros é rejeitado; consultas não podem modificar
estado; o catálogo tem saída fixa, limitada às seis ilhas; nenhum segredo integra sua construção.
Serviços de voz, autenticação, salas e armazenamento mantêm suas próprias proteções existentes.

## Próxima etapa, sem ativação automática

1. Definir as metodologias pedagógicas, seus IDs, objetivos e vínculo com as ilhas.
2. Alimentar o registro tipado em `src/domain/olena.ts`, com testes de conteúdo e consistência.
3. Definir o contrato de atividades, avaliação e progressão antes de integrar exercícios em Praticar.
4. Se houver geração por modelo, escolher fornecedor, consentimento, retenção real, autenticação,
   limites distribuídos, timeout e orçamento em uma mudança própria. O contrato da futura tutora em
   `src/ai/helena-contract.ts` pode ser reaproveitado, mas não está ativo nesta API.

Não conceder XP nem desbloquear níveis por uma resposta de catálogo. A API não substitui
os minigames atuais nem retira a navegação local das ilhas.

## Verificação

`npx vitest run src/domain/olena.test.ts src/backend/olena-handler.test.ts`
valida domínio, filtros, erros e entrada real da função Vercel com Request/Response.
`npm run api:check` valida os imports emitidos com o resolvedor ESM real do Node,
incluindo `api/olena.js`. `npm run verify` cobre o restante do projeto.
