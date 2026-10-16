# Registro exclusivo de identidade

## Contrato e autorização

GET/POST/DELETE /api/profile-handle exigem Firebase Bearer válido. JWT tem issuer/audience do projeto; accounts:lookup confirma conta atual, UID correspondente, não removida/desativada. Anônimos não reservam. UID, e-mail e CREKS nunca vêm do corpo enviado pelo navegador. POST aceita username vazio para liberar, ou até 30 caracteres ASCII minúsculos, números, ponto e underscore.

CREKS_OWNER_EMAIL é configuração privada do servidor, sem prefixo VITE_. Somente a conta cujo e-mail atual está verificado e corresponde à configuração pode reservar oliver644 e receber o selo. Nome permanece protegido mesmo se configuração faltar. Configuração adicionada ao projeto Vercel olenastudy em 2026-10-16, sem dado pessoal versionado. A reserva real exige publicar o endpoint e confirmação autenticada. Não há cobrança nem integração de pagamento.

## Persistência e ciclo de vida

privateProfileHandles é nó privado permanente, sem TTL, com SHA-256 de UID apontando para username. CAS/ETag de uma árvore dedicada faz reserva, troca e liberação atômicas, sem estados intermediários nem duplicatas entre instâncias. Contenção usa até 12 tentativas e depois falha fechado. Teto de 10 mil contas: migrar para índice transacional particionado antes de atingi-lo. Rate limit persistente de 30 chamadas/minuto/UID. Limite é de implementação, não de validade temporal das reservas.

Troca libera o anterior somente quando o novo foi reservado na mesma transação. Repetir a mesma reserva é idempotente. DELETE só remove a reserva de quem autentica. Exclusão pelo app libera antes de apagar dados/login; se o passo seguinte falhar, a conta pode voltar a reservar. Exclusão administrativa externa ao app exige limpeza administrativa correspondente. Rollback não deve apagar o registro ou voltar a declarar nomes locais exclusivos.

## Modelo de ameaça e provas

- Duas contas simultâneas: um único vencedor, restante recebe 409. Duas alterações da mesma conta mantêm um único nome na árvore.
- Falsificação do selo, UID ou e-mail por corpo/cache: campos ignorados; selo deriva da identidade verificada do servidor.
- Conta anônima, removida ou desativada: 401, sem acesso ao registro.
- Origem externa: 403. GET same-origin pode não ter Origin; usa Sec-Fetch-Site e origem exata da URL autorizada. URLs de preview vêm somente do ambiente confiável Vercel.
- Falha do banco, autenticação ou limite: não confirma identidade. Respostas no-store; JSON até 512 bytes. Regras Firebase negam acesso direto pelo SDK/browser.
- Troca de conta no navegador durante uma requisição: resposta descartada antes de gravar perfil. Login legado não prova propriedade do @.

Testes: profile-handle-handler.test.ts, profile-handle-runtime.test.ts, firebase-user-rules.test.ts e use-cloud-sync.test.tsx. Integração do editor acrescenta provas de conflitos, convidados e respostas atrasadas em profile-handle.test.ts e use-profile-handle.test.tsx. Sem dependências novas.
