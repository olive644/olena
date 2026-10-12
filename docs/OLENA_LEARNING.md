# Olena: professor e modelo próprio

## Estado desta entrega

O aplicativo usa `/api/helena` para respostas reais, com Cloudflare como professor
inicial. O preview continua demonstrativo. Sem credenciais, a API falha de forma
honesta, sem substituir a resposta por texto simulado.

Há geração agendada de exemplos públicos e treinamento CPU de adaptadores
candidatos. O chat continua com o professor Cloudflare. A execução efetiva de
cada treino e sua avaliação ficam nos relatórios do GitHub Actions. Salvar
exemplos não altera pesos; somente um job de treino concluído faz isso.

## Ativação diária e orçamento zero

O proprietário confirmou Workers Free. `OLENA_LEARNING_FREE_CONFIRMED=true`
habilita `/api/olena-learning`, exclusivamente POST vazio autenticado com
`OLENA_LEARNING_SERVICE_TOKEN` (64 caracteres aleatórios). O mesmo segredo
fica no servidor Vercel e nos secrets do GitHub, nunca no cliente. Desabilitar
a flag ou pausar o workflow interrompe novas gerações. Nenhuma alteração de
plano pago é feita.

O workflow `Olena learning candidate` roda diariamente às 04:17 UTC, com no
máximo duas chamadas adicionais por dia, incluídas no limite global do chat.
O corpus inicial tem 40 exercícios públicos de adição e multiplicação. Não
é aprendizado ilimitado: ao completar o corpus, a geração para. Se seu hash
não mudar e o último candidato for recuperável, o treinamento também para;
o job apenas renova a retenção do adaptador pequeno para não perder os pesos.
Novos temas precisam de currículo e testes próprios.

O runner CPU padrão é gratuito neste repositório público. Não usa GPU paga,
runner ampliado ou serviço de treinamento externo. Os adaptadores pequenos
ficam por sete dias; não publicamos pesos base, caches ou conversas. Storage
e cotas do GitHub/Firebase/Vercel continuam sujeitos aos planos existentes.
Workers Free bloqueia chamadas após sua franquia, em vez de migrar para pago.

## Candidato experimental, não promoção automática

`scripts/olena-candidate-data.mjs` exporta somente o corpus sintético permitido.
Checagem automática confirma a equação e rejeita equações simples contraditórias.
Isso NÃO é revisão humana nem prova de qualidade pedagógica. O caminho antigo
`approve`/`export` permanece separado para dados efetivamente revisados.

`scripts/train-olena-candidate.py` treina de fato 16 passos LoRA em CPU sobre
Qwen2.5-0.5B-Instruct, revisão fixa, rank 4. Só tokens da resposta recebem
supervisão. Retoma o último adaptador sem regressão no smoke test quando
disponível; caso contrário inicia do base com corpus cumulativo. Quatro somas
reservadas medem apenas um smoke test, não competência geral, segurança ou
Português. `production_approved` permanece falso em todos os relatórios.
O aplicativo nunca muda de provedor sozinho. Ainda falta avaliação abrangente
e hospedagem de inferência antes de um modelo próprio assumir tarefas do chat.

O modelo base tem licença Apache-2.0. O professor atual é Llama 3.3; candidatos
se chamam `Llama-Olena-Qwen-Candidate`, incluem `Built with Llama`, NOTICE e as
licenças junto ao artefato. Uso e distribuição devem seguir a licença Llama 3.3
e sua política de uso aceitável, não são permissivos sem condições.

## Modelo de ameaça do job

- Endpoint sem token não lê corpus nem chama o professor; comparação constante.
- Não aceita prompts, IDs de conta, URLs, fontes ou material privado do chamador.
- Corpus em namespace Firebase privado (negação padrão), acesso só pelo servidor.
- CAS com lease impede geração simultânea; falhas fecham sem revelar segredos.
- Consome quota antes de gerar; erro não faz retries automáticos do professor.
- Currículo, quantidade, modelo, origem e revisão base são fixos, sem remote code.
- Artefatos são públicos: contêm apenas pesos candidatos e metadados sintéticos.
- O job não tem permissão de escrita no código, nem credenciais de alunos.
- Disparo manual exige permissão de escrita no GitHub e pode testar branches
  confiáveis; nunca roda automaticamente em pull requests ou forks. Agenda usa main.
- Ambiente de treinamento atualiza pip/setuptools antes da auditoria. Build CPU
  do Torch é verificado também pelo OSV com versão base, pois pip-audit não
  reconhece o sufixo local `+cpu` do índice oficial.
- Checagem aritmética limitada pode deixar erros textuais passarem; não promove.

## Configuração privada

Configurar no servidor, nunca com prefixo VITE para segredos:

- `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN`, com permissão Workers AI.
- `OLENA_TEACHER_MODEL`, padrão `@cf/meta/llama-3.1-8b-instruct-fp8-fast`.
- `HELENA_ALLOWED_ORIGINS`, lista exata separada por vírgulas. Produção padrão:
  `https://olenastudy.vercel.app`. Adicionar origem de preview explicitamente.
- Firebase existente: `VITE_FIREBASE_PROJECT_ID`, `FIREBASE_DATABASE_URL`,
  `FIREBASE_CLIENT_EMAIL` e `FIREBASE_PRIVATE_KEY`.

Manter Cloudflare no plano gratuito e acompanhar a franquia. Não há migração
automática para plano pago ou outro fornecedor. Limites compartilhados no
Firebase: 5 chamadas/minuto e 30/dia por conta, 300/dia no aplicativo. Estes
limites não equivalem à franquia em neurons e não garantem que ela seja suficiente.
Falha no armazenamento de limites bloqueia a geração. O namespace de limites
não armazena mensagens, somente identidade hash, janela e contador.

Para desenvolvimento, fornecer as variáveis ao processo antes de iniciar Vite.
A origem local também precisa estar em HELENA_ALLOWED_ORIGINS. A integração
requer conta Firebase real, sem bypass de convidado.

## Privacidade e ameaça

O chat não exige mais checkbox por sessão. Ao enviar ou escolher uma sugestão,
o aluno solicita a resposta externa; o rodapé informa o envio de mensagens,
até seis mensagens anteriores e o nome do módulo atual ao Cloudflare.
Abrir o chat não envia conteúdo. Não há captura de tela, leitura automática de cadernos,
gravação de áudio ou coleta integral do workspace. O histórico fica só na memória
da sessão. O professor pode cometer erros, e a interface informa isso.

Conversas do aluno não são usadas neste pipeline de treinamento nem registradas
pela API. A política de retenção do provedor é independente: confirmar as condições
da conta Cloudflare antes de publicar. Para alunos menores, concluir a revisão de
privacidade e autorização adequada antes de disponibilizar o serviço.

A API valida origem, contrato, limites de tamanho, consentimento e token Firebase.
Credenciais e endpoints são exclusivos do servidor; pedidos não escolhem URL ou
modelo. Conteúdo fornecido é dado não confiável, separado das instruções de sistema.
Sem ferramentas de escrita, a Helena não modifica Agenda nem progresso. Respostas
são texto React, nunca HTML. Erros não revelam respostas internas ou segredos.

## Streaming e interrupção

O chat pede SSE em `/api/helena`. Cloudflare gera com `stream: true`; o servidor
valida e repassa deltas sem aguardar a resposta inteira. O adaptador HTTP escreve
os pacotes incrementalmente e respeita backpressure. O cliente verifica eventos
de conclusão para não tratar respostas cortadas como completas.

Interromper ou recolher o chat cancela a leitura e propaga abort até o provedor.
Texto parcial permanece identificado; uma resposta antiga não altera a nova.
O fluxo limita texto a 12.000 caracteres, eventos a 32.000 caracteres, tráfego
a 512.000 bytes e geração no servidor a 45 segundos (cliente a 55 segundos).
Cancelar não devolve tokens já consumidos nem a chamada descontada da cota.
O modelo próprio continua exigindo aprovação explícita por capacidade. Falha
antes do primeiro delta permite fallback; após texto parcial, não mistura provedores.
O preview permanece demonstrativo, sem chamadas ao provedor.

## Aprendizado incremental

Executar os comandos na raiz do repositório. Dados gerados ficam em
`.olena-learning/`, ignorado pelo Git. O corpus inicial contém 40 exemplos públicos
de matemática básica com referências exatas. É uma prova do pipeline, insuficiente
para prometer qualidade geral ou substituir o professor.

1. Verificar termos Cloudflare e licença específica do professor para destilação.
   Só então definir `OLENA_DISTILLATION_RIGHTS_CONFIRMED=true` no ambiente.
   O professor padrão Llama 3.1 impõe condições também sobre uso de suas saídas
   para criar modelos distribuídos, incluindo prefixo Llama no nome e atribuição.
   Conferir a [licença do Llama 3.1](https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE)
   antes de gerar o corpus. Uma troca de professor exige verificar a nova licença
   e a compatibilidade da resposta da API, não apenas mudar o nome do modelo.
2. `node scripts/olena-learning.mjs generate`: cria até cinco rascunhos novos.
   Repetir continua sem refazer IDs já gerados. Não executa treinamento e não
   consome a franquia no background do chat.
3. Ler `.olena-learning/drafts.jsonl`, comparar resposta com referência matemática,
   corrigir erros e revisar linguagem pedagógica. Não aprovar automaticamente.
4. `node scripts/olena-learning.mjs approve basic-math-1 nome-do-revisor` registra
   a aprovação do conteúdo exato. Editar uma resposta invalida sua aprovação.
5. `node scripts/olena-learning.mjs export` exporta somente exemplos revisados em
   `.olena-learning/train.jsonl`. IDs duplicados são excluídos.
6. Em ambiente Python separado com torch, datasets, transformers, peft e trl,
   verificar licença e requisitos do modelo base escolhido. Rodar
   `python scripts/train-olena.py --base MODELO_BASE_VERIFICADO`.
   A receita depende do hardware e das versões dessas bibliotecas; ainda não foi
   executada ou validada com GPU nesta entrega. Não instala dependências no app.
   O resultado é um adaptador LoRA, que ainda requer o modelo base.

Este fluxo manual de dados revisados permanece separado do job diário experimental
descrito acima. Não há treinamento durante conversas nem promoção automática.
Expandir o job exige orçamento de chamadas, currículo, revisão, retenção definida
e máquina disponível para treinamento. Nunca treinar diretamente em mensagens
privadas por assumir que retirar o nome anonimiza tudo.

## Avaliação e independência

Usar perguntas inéditas, separadas do treinamento. Medir correção matemática,
qualidade pedagógica, alucinações, segurança, português, latência e uso de memória.
Comparar professor, candidato e versão anterior. Não promover somente por o modelo
afirmar confiança ou por perda de treinamento cair. Não aprender continuamente de
respostas não revisadas, para evitar repetição de erros e regressões.

Hospedar modelo base + adaptador em um runtime compatível com Chat Completions.
Depois de avaliação humana registrada, configurar:

- `OLENA_STUDENT_ENDPOINT`: URL fixa de chat completions, HTTPS em produção.
- `OLENA_STUDENT_MODEL` e, quando necessário, `OLENA_STUDENT_TOKEN`.
- `OLENA_STUDENT_EVALUATED=true`, atestado manual do operador, não avaliação automática.
- `OLENA_STUDENT_CAPABILITIES`, subconjunto de tutor, explain, summarize, study-plan.

Capacidades aprovadas usam a Olena primeiro. Resposta válida evita chamada ao
professor. Falha, timeout ou resposta estruturalmente inválida usa o professor
uma vez. Isso não detecta respostas plausíveis porém incorretas, por isso a avaliação
prévia é obrigatória. Sem aprovação, o professor continua sendo usado.

Rollback: retirar OLENA_STUDENT_EVALUATED ou a capacidade aprovada. Versões novas
não devem apagar datasets anteriores nem o adaptador de produção. Futuros modelos
locais no aparelho do aluno requerem uma entrega própria de compatibilidade.
Treinar não elimina o custo de executar: não há hospedagem ilimitada gratuita
do modelo próprio garantida por este pipeline.

## Provas

- `npx vitest run src/backend/helena-teacher.test.ts src/backend/olena-student.test.ts src/backend/helena-handler.test.ts src/components/helena-chat.test.tsx src/data/helena-client.test.ts`
- `node --test scripts/olena-learning.test.mjs`
- `npm run test:e2e -- e2e/helena-app.spec.ts`
- `npm run verify`

Fontes: [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/),
[destilação TRL](https://huggingface.co/docs/trl/distillation_trainer),
[PEFT](https://huggingface.co/docs/peft/).

## Treinamento matemático v2

O workflow candidato agora usa `scripts/olena_training_data.py`: 96 exemplos originais e públicos, em oito temas, com 32 questões de avaliação separadas. Metade do treino pede apenas resultado, metade explicação curta. Os temas são adição, subtração, multiplicação, divisão, frações, porcentagens, equações lineares e potências. Referências exatas usam Fraction; IDs, respostas, explicações, operandos e prompts devem corresponder ao corpus canônico. Nem perguntas de alunos nem respostas do professor entram nesse corpus. O gerador antigo e o endpoint protegido permanecem ferramentas separadas e não são chamados por esse workflow.

A base permanece Qwen2.5-0.5B-Instruct na revisão fixa documentada, com LoRA rank 4, dois threads CPU e até 96 passos embaralhados. Cada exemplo participa uma vez nessa tentativa, com taxa 0,00005 e gradientes limitados. Máscara de perda confere o prefixo tokenizado; apenas tokens da resposta recebem supervisão. A auditoria do ambiente continua obrigatória antes do carregamento. Modelos não executam código remoto e adaptadores usam safetensors.

A avaliação usa as mesmas instruções de formato no modelo base, no último candidato válido e no novo candidato. Resultados são comparados como valores racionais exatos, com resposta curta completa; não aceita números extraídos de explicações arbitrárias. A aprovação experimental exige pelo menos 24/32 acertos, pelo menos 2/4 em cada tema e nenhuma perda de questão que a base ou o candidato anterior acertava. Esse teste não comprova qualidade pedagógica e nunca configura aprovação de produção.

Somente pesos aprovados são enviados ao artefato `Olena-Math-Qwen-Candidate-v2`, por sete dias. Se uma tentativa nova falha, renova os pesos aprovados anteriores sem substituí-los pelos rejeitados. Relatórios, inclusive de rejeição, ficam em `Olena-Math-Training-Report-v2`, por 30 dias. Retomada exige revisão de base, versão do treino, corpus de avaliação, gate recalculado, configuração LoRA e hash dos pesos compatíveis. Só aceita artefatos da main ou da própria branch confiável. Uma falha de download não vira reinício silencioso. Artefatos antigos Llama-Olena-Qwen-Candidate não são promovidos a essa cadeia.

Se um candidato aprovado tem corpus inalterado, renova a retenção sem treinar. Uma tentativa rejeitada idêntica também não se repete automaticamente. Alterar conteúdo, avaliação ou versão do treino permite nova tentativa; `workflow_dispatch` com `force_training=true` permite repetição explícita e limitada. O agendamento permanece diário, mas não significa que pesos mudam diariamente sem dados novos.

Comandos locais sem download de modelo:

- `python3 scripts/olena_training_data.py`
- `python3 scripts/test_train_olena_candidate.py`
- `python3 scripts/test_audit_olena_runtime.py`

Treino real com ambiente auditado é executado pelo workflow em uma branch revisada ou na main. Relatório registra resultado da base, candidato anterior, novo candidato, regressões, cobertura dos temas e losses. Queda da loss não substitui o gate de avaliação. A publicação do chat permanece uma decisão separada, após revisão humana e hospedagem do modelo.
