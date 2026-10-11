# Olena: professor e modelo próprio

## Estado desta entrega

O aplicativo usa `/api/helena` para respostas reais, com Cloudflare como professor
inicial. O preview continua demonstrativo. Sem credenciais, a API falha de forma
honesta, sem substituir a resposta por texto simulado.

Esta entrega não contém modelo treinado. Há um pipeline executável de geração,
revisão e exportação, uma receita LoRA e roteamento para um modelo próprio que
for avaliado e hospedado posteriormente. Salvar exemplos não altera pesos.

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

Antes do primeiro envio, o aluno autoriza mensagens, até seis mensagens anteriores
e o nome do módulo atual. Não há captura de tela, leitura automática de cadernos,
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

Não existe job periódico ativado, treinamento online durante conversas ou promoção
automática. Um agendamento futuro deve ter orçamento de chamadas, dataset maior,
revisão, retenção definida e máquina disponível para treinamento. Nunca treinar
diretamente em mensagens privadas por assumir que retirar o nome anonimiza tudo.

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
