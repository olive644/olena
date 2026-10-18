# Regras de trabalho do OlenaStudy

Estas regras herdam o padrão de engenharia do OliQualidade e valem para todo o repositório.

## Fluxo Git

- Nunca desenvolver diretamente na `main`.
- Criar uma branch curta e descritiva para cada mudança.
- Entregar mudanças por pull request; não habilitar merge automático.
- Não mesclar uma pull request sem autorização explícita do proprietário.
- Preferir squash merge após CI verde e revisão concluída.
- Não misturar atualização de dependência com mudança de produto sem necessidade comprovada.

## Qualidade

- Manter TypeScript estrito; não introduzir `any`, `@ts-ignore` ou `@ts-expect-error` para contornar um problema.
- Não desativar opções estritas do compilador para fazer código novo passar.
- Toda correção deve ter um teste que falhe sem ela quando isso for tecnicamente viável.
- Componentes interativos precisam funcionar com teclado, toque e larguras móveis.
- Nenhuma ação essencial pode depender apenas de hover.
- Rodar `npm run verify` antes de publicar uma branch.
- Mudanças de fluxo principal devem passar também por `npm run test:e2e`.

## Segurança e privacidade

- Nunca versionar segredos, tokens, dados pessoais ou materiais didáticos privados.
- Arquivos enviados pelo usuário devem ser tratados como não confiáveis.
- Não enviar conteúdo a serviços externos sem consentimento claro e documentação do fluxo.
- Dependências novas exigem justificativa, auditoria e verificação do impacto no bundle.
- Autenticação, IA e armazenamento remoto só entram em mudanças próprias, com modelo de ameaça e testes.

## Produto e documentação

- Progresso, agenda, histórico de Cronômetro/Pomodoro e recuperação da sessão de Foco pertencem à conta autenticada e devem sincronizar automaticamente. Armazenamento do dispositivo é cache e fila de recuperação offline, nunca um modo separado chamado sincronização local. Não substituir registros já concluídos por cópias antigas ou vazias após atualizar. Sem conexão, informar que o envio à conta está pendente; sem login, orientar a entrar, sem fingir que houve salvamento em nuvem. Preservar isolamento entre contas e não iniciar automaticamente em outro aparelho um contador recuperado.

- Seguir docs/DESIGN_SYSTEM.md: Helena, ícones e novos elementos visuais usam o padrão aprovado de papel recortado. Loadings usam HelenaLoading.
- São proibidas molduras de foco/seleção por outline e contornos automáticos roxos ou pretos. Usar a regra compartilhada de foco em papel: sublinhado e destaque amarelo, sem ocultar a indicação de navegação por teclado. Bordas estruturais dos cartões não são molduras de foco.
- Controles de fechar com X colorido usam o recorte aprovado sem placa, fundo ou sombra de botão. Preservar área de toque e sublinhado amarelo no teclado. Não alterar os X monocromáticos grafite/creme de PaperEditorIcon.

- É proibido usar travessões em textos da interface, documentação, comentários ou qualquer outro conteúdo do repositório. Reescrever a frase com vírgula, ponto, dois-pontos ou parênteses.
- Registrar decisões arquiteturais e mudanças de estado em `docs/CURRENT_STATE_AUDIT.md`.
- Atualizar `docs/SECOND_BRAIN.md` quando o fluxo, a arquitetura ou os comandos mudarem.
- Usar nomes honestos: recursos simulados ou locais não podem ser apresentados como IA, sincronização ou persistência em nuvem.
- Manter o Espaço do aluno como início da experiência e integrar novos módulos ao workspace
  compartilhado. O planejador de aulas de inglês permanece como ferramenta existente.

## Custos, CI e operação

Leia `docs/CI_MINUTOS.md` e `docs/OPERACAO_E_CUSTOS.md` antes de mexer em `.github/workflows/`, em regras do Firebase, em limites de uso ou em qualquer coisa que gaste recurso pago.

- Meça antes de propor economia e registre o que foi descartado e por quê. Não afirme o que não verificou: marque "não verificado" e diga como conferir.
- O escopo do e2e é decidido por `scripts/ci-scope.mjs`. Nunca deixe um check obrigatório passar sem o teste ter rodado quando ele era necessário, e não mude os nomes dos checks.
- Mescle com commit de mesclagem (não squash): o `.gitleaksignore` depende de um commit específico do histórico.
- Não leia nem versione `docs/CONTRATO_SOCIETARIO.md`. Não exponha chaves de servidor.
- Ações fora do repositório (publicar regras do Firebase, variáveis da Vercel, privar o repositório, planos pagos) são da dona do projeto: descreva o passo e confira o resultado, sem fazer sozinho.
- Todo recurso que gasta dinheiro precisa de limite por quem chama e de teto global.
