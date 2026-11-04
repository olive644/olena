# Renovação da política sem logout

Contas autenticadas com helena.privacy.v1 ausente ou em versão diferente da PRIVACY_POLICY_VERSION recebem o diálogo de papel ao carregar o aplicativo, no mesmo contexto em que o aviso informativo já era exibido. O modo projetor conserva a exclusão de avisos. Abas com um bundle antigo precisam carregar a atualização, sem encerrar a sessão. Não é um envio remoto para abas antigas.

O resumo helena.privacyNotice.v1 continua sendo apenas leitura. Entendi não fabrica aceite. O diálogo de renovação distingue as ações: abrir a política em outra aba, checkbox nativo inicialmente desmarcado, Confirmar aceite, Agora não e X/Escape. Adiar ou fechar mantém a versão antiga, não inicia presença e reapresenta o diálogo na próxima montagem. Não sai da conta nem altera perfil, estudos, tarefas, foco ou preferências.

Confirmar usa recordPrivacyConsent, confere a leitura da versão gravada e só então emite olena:privacy-consent-changed. Se o armazenamento bloquear a gravação, mantém o diálogo e informa erro. Não há aceite silencioso, concessão de permissões de IA/voz ou mudança de política no servidor. A versão da política permanece 2026-11-02.

startOnlinePresence escuta o evento e envia o sinal imediatamente para a conta atual, respeitando visibilidade, aceite, ausência de anonimato e limites existentes. Não é necessário reiniciar a autenticação. O token preparado é descartado se a conta mudar durante a espera; o listener é removido no cleanup. O AppContent continua usando sua revisão de conta como chave, desmontando o diálogo ao trocar de sessão.

PT/EN usam entradas append-only do catálogo e versão recalculada. LibraryDialog preserva modal nativo, navegação de teclado, Escape e devolução de foco. Checkbox universal paper-checkbox; X aprovado sem placa; seta de 24 px. Em 320x568, texto e ações ficam compactos e continuam acessíveis com rolagem quando zoom/teclado exigir.

## Provas

Três regressões vermelhas antes da implementação: aviso ausente para aceite antigo, ausência de opção de adiar e presença sem envio imediato após confirmação. Testes focados após a correção cobrem renovar, não repetir após aceite, cancelar/adiar, troca de sessão, armazenamento bloqueado e descarte do token anterior. Componente real com sessão simulada exercitado em navegador Edge desktop/mobile320 claro/escuro, com POST interceptado: nada antes de confirmar, um sinal após confirmar, perfil preservado e ausência de novo pedido após recarregar. Nenhuma conta real, token real ou renomeação Discord usada na validação.

Evidências externas: b/previews-privacy-renewal-2026-11-02. Logs privacy-renewal-red.log e privacy-renewal-focused.log. Verify integral aprovado: 388 arquivos e 2514 testes, lint sem erros/27 avisos existentes, tipos/API/idiomas/formatação/build/performance verdes. Aplicação 1673,1 KiB, entrada 220,6 KiB. Quinze testes focados e dez E2E Edge PC/mobile claro/escuro de login e retorno passaram. Logs privacy-renewal-verify.log e privacy-renewal-regression-browser.log. Sem novos serviços, dependências, limites ou configurações externas.

## Aceite preservado e abas abertas, 04/11/2026

O aceite explícito atual também guarda versão e data no registro de acesso já existente, associado ao UID ativo. Esse registro sobrevive ao logout; a leitura de recuperação só é permitida quando o UID da conta atual coincide. Trocar de conta não herda o aceite anterior, e excluir a conta continua limpando o registro. Não fabricar consentimento nem substituir a versão da política. A confirmação registra também que o resumo foi lido, evitando outro aviso no remount.

PrivacyNotice acompanha o evento local de consentimento e storage de outras abas. Aceite válido atual fecha a renovação pendente; a página incorporada da política continua acessível. Testes cobrem logout/mesmo UID, isolamento entre contas, remount e aceite vindo de outra aba. A versão permanece 2026-11-03.1, sem novo destinatário ou serviço.

Cache de acesso ilegível é descartado ao gravar uma nova escolha explícita, sem impedir a gravação nem criar aceite de política. Regressão RED/GREEN em privacy-access-repair-red/green.log.

O login pode registrar o aceite antes de conhecer o UID. claimDeviceForAccount associa esse registro explícito à conta ao assumir o aparelho, sem alterar versão/data; em troca de UID, limpa os dados antigos antes da leitura. Regressão de ordem real do login em privacy-login-order-red/green.log, com testes de isolamento existentes preservados.
