# API oficial da Olena, versão 1

## Escopo desta etapa

A API é independente de fornecedor e prepara o catálogo de metodologias para as ilhas
de Praticar. A Olena responderá somente por texto. Não há voz nesta API,
modelo conectado, geração simulada, exercícios novos ou envio de materiais a terceiros.
O áudio existente dos minigames permanece em `/api/speech`, sem alterações.

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
para outro cadastro. Apenas Idiomas tem trilha disponível. As outras cinco continuam planejadas.
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

- Somente GET. Escrita, envio de conteúdo e execução retornam 405 com `Allow: GET`.
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
