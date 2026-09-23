# Backend da Helena inteligente

## Estado da decisão

A fronteira da futura tutora Helena está definida como contrato independente de provedor e permanece
desativada. Separadamente, o Quiz de Escuta e o Modo Sala usam o mesmo serviço de voz natural,
descrito abaixo, que recebe somente o texto curto a ser pronunciado.

## Voz do Quiz de Escuta e do Modo Sala

`POST /api/speech` é uma função Vercel same-origin. Ela aceita texto de até 160 caracteres, velocidade
entre 0,7 e 1,05 e consentimento explícito no corpo. Origem, tamanho e limite de uso são validados
antes de repassar o pedido para o **Cloudflare Workers AI**, chamando o modelo `@cf/myshell-ai/melotts`
(MeloTTS, voz natural em inglês) autenticado por token, nunca exposto direto ao navegador.

Se a chamada ao Cloudflare falhar, exceder o tempo limite configurado ou não estiver configurada,
`/api/speech` responde com erro e o cliente (`NaturalVoicePlayer`, em `src/data/listening-audio.ts`)
usa a voz em inglês disponível no navegador como último recurso, tanto no Quiz de Escuta quanto no
Modo Sala. O áudio retorna em MP3 e nenhum texto, resposta ou token é registrado em log.

Configure `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` apenas como variáveis protegidas da Vercel
(nunca com prefixo `VITE_`, que exporia o token no navegador). O cache de áudio do cliente vive somente
na memória da sessão.

Existe também um serviço próprio Kokoro+Piper (`services/tts`, veja seu `README.md`) que fica **fora
de uso em produção no momento**: nenhuma hospedagem grátis viável foi encontrada pra rodar os dois
modelos juntos (Cloud Run exige pré-pagamento de faturamento no Brasil; Hugging Face Spaces Docker
exige plano PRO; Railway grátis só comporta o Kokoro sozinho; hospedagem própria dependeria de um
computador ligado 24 horas). Fica documentado e testado caso uma hospedagem própria ou paga volte a
fazer sentido no futuro; nesse caso, troque o provider em `api/speech.ts` de volta para
`createTtsServiceProvider`.

## Fluxo de dados

1. A pessoa escolhe uma capacidade: tutoria, explicação, resumo ou plano de estudos.
2. A interface mostra exatamente quais notas, materiais, cartões, tarefas ou metas serão enviados.
3. O envio exige consentimento para aquela solicitação e declara retenção `none`.
4. O cliente chama somente `POST /api/helena`, na mesma origem do aplicativo.
5. O handler valida origem, tamanho, campos permitidos, consentimento e limite de uso.
6. Um adaptador executado no servidor chama o provedor configurado com a chave guardada no ambiente.
7. O handler valida a saída, remove detalhes internos e devolve texto e até quatro sugestões.

O workspace completo nunca faz parte do contrato. O backend não recebe hábitos, agenda, anotações ou
outros dados que a pessoa não tenha selecionado expressamente.

## Componentes

| Componente                      | Responsabilidade                                                    |
| ------------------------------- | ------------------------------------------------------------------- |
| `src/ai/helena-contract.ts`     | Tipos, limites e validação estrita de entrada, saída e erros        |
| `src/data/helena-client.ts`     | Chamada same-origin sem chave ou token de provedor                  |
| `src/backend/helena-handler.ts` | Origem, tamanho, consentimento, rate limit e normalização de falhas |
| `HelenaProvider`                | Adaptador futuro para o provedor de IA escolhido                    |
| `HelenaRateLimiter`             | Adaptador futuro para limite distribuído por usuário ou cliente     |

O handler usa as APIs web `Request` e `Response`, portanto pode ser adaptado a Edge Functions,
Workers ou funções serverless sem acoplar o domínio a um fornecedor.

## Contrato HTTP

`POST /api/helena` aceita JSON com versão `1`:

```json
{
  "version": 1,
  "capability": "explain",
  "prompt": "Explique com um exemplo simples.",
  "subject": { "id": "subject-english", "name": "Inglês" },
  "sources": [
    {
      "id": "note-1",
      "kind": "note",
      "title": "Present perfect",
      "content": "Have + past participle"
    }
  ],
  "privacy": { "consent": true, "retention": "none" }
}
```

Limites da versão 1:

- pedido: 2.000 caracteres;
- até 12 fontes;
- 8.000 caracteres por fonte;
- 30.000 caracteres somando as fontes;
- corpo HTTP: 64.000 bytes;
- resposta: 12.000 caracteres e até quatro sugestões.

Campos desconhecidos são rejeitados. Isso impede que uma serialização acidental do workspace seja
silenciosamente aceita pelo backend.

## Consentimento e retenção

- O consentimento é por solicitação, depois da prévia das fontes selecionadas.
- Desmarcar uma fonte remove seu conteúdo do corpo enviado.
- A política inicial é sem histórico no backend e sem uso para treinamento pelo OlenaStudy.
- Prompt, fontes e resposta não devem ser gravados em logs, analytics ou rastreamento de erros.
- Logs operacionais podem conter apenas ID da requisição, capacidade, horário, duração, resultado e
  contagens agregadas de tamanho/tokens.
- Uma futura opção de histórico ou sincronização exige consentimento e mudança arquitetural próprias.

## Modelo de ameaça

| Risco                         | Controle obrigatório                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Chave exposta no navegador    | Segredo disponível somente no ambiente do backend; cliente usa URL relativa                        |
| Envio excessivo de dados      | Seleção explícita, esquema allowlist, limites por fonte e rejeição de campos extras                |
| Requisição de outra origem    | Lista exata de origens autorizadas e endpoint same-origin                                          |
| Abuso e custo descontrolado   | Identificação no adaptador de implantação, rate limit distribuído e teto do provedor               |
| Prompt injection em materiais | Fontes tratadas como dados não confiáveis; instruções de sistema não podem conceder ferramentas    |
| Saída insegura                | Resposta limitada, validada e renderizada como texto; nenhuma ação automática ou HTML              |
| Vazamento em logs             | Sem conteúdo ou resposta em observabilidade; erros internos são substituídos por mensagem genérica |
| Indisponibilidade do provedor | Timeout no adaptador, cancelamento e erro `provider_unavailable` sem apagar o fluxo local          |

O recurso não deve executar links, código, ferramentas, uploads ou alterações no workspace a partir
da resposta do modelo. Sugestões só produzem efeito depois de uma ação explícita da pessoa.

## Decisões necessárias para ativação

Antes de conectar um provedor, uma mudança própria deve definir e testar:

1. runtime e domínio de implantação;
2. gerenciador de segredos;
3. provedor, modelo, região e política contratual de retenção;
4. identificador de cliente antes do login e identidade depois do login;
5. armazenamento distribuído do rate limit;
6. timeout, teto de tokens e orçamento mensal;
7. texto final de consentimento e política de privacidade;
8. testes de integração com respostas simuladas, sem segredo no CI.

Até essas decisões serem aprovadas, a interface atual permanece local e não deve exibir a
funcionalidade como disponível.
