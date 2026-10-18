# Login da conta Google

O resumo do onboarding abre uma etapa de login com os componentes de papel aprovados. O SDK é preparado antes do clique para preservar a abertura da janela no gesto do usuário. Cancelamento, bloqueio de popup e falha de rede apresentam mensagens específicas. Login concluído abre o Espaço.

Configurar VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN e VITE_FIREBASE_PROJECT_ID no ambiente local e na Vercel, seguido de novo build. São dados públicos do aplicativo Firebase Web, nunca credenciais administrativas. Ativar Google em Authentication e autorizar o domínio exato de produção e dos previews usados para teste.

## Limites e modelo de ameaça

O Firebase gerencia a sessão. Nenhum token é copiado manualmente para armazenamento. O indicador local do onboarding não concede acesso a dados no servidor e pode ser alterado pelo usuário. APIs existentes não devem confiar nele. Estudos continuam locais, sem sincronização entre contas. A integração com o Google Agenda foi removida. Não solicitar escopos de Agenda no login.

Configuração ausente impede o envio. Cliques simultâneos são ignorados enquanto o popup está pendente. Falha ao salvar preferências locais não transforma autenticação válida em erro de login. Verificação real exige que o usuário conclua a seleção de conta no Google.
