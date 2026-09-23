# Configurar a integração com o Google Agenda

A integração usa OAuth 2.0 para ler os próximos eventos do Google Agenda do
usuário (somente leitura). Como o OlenaStudy é uma SPA estática hospedada na
Vercel, o "backend" é só a função serverless `api/google-calendar.ts`; não
existe banco de dados; a sessão do Google fica num cookie `HttpOnly` cifrado
no próprio navegador do usuário.

Isso precisa ser feito uma vez, fora do Claude Code, porque envolve criar
credenciais numa conta Google e configurar variáveis de ambiente sigilosas na
Vercel (nunca cole o Client Secret em uma conversa ou committe em um arquivo).

## 1. Criar o projeto e ativar a API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2. Crie um projeto (ou reaproveite um existente).
3. Em **APIs e serviços → Biblioteca**, ative a **Google Calendar API**.

## 2. Configurar a tela de consentimento OAuth

1. Em **APIs e serviços → Tela de consentimento OAuth**, escolha **Externo**.
2. Preencha nome do app, e-mail de suporte e domínio autorizado
   (`helenastudy.vercel.app`, ou o seu domínio de produção).
3. Escopo necessário: `https://www.googleapis.com/auth/calendar.events.readonly`.
4. Enquanto o app estiver em modo de teste, adicione as contas Google que vão
   usar o recurso em **Usuários de teste**.

## 3. Criar as credenciais OAuth

1. Em **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**.
2. Tipo de aplicativo: **Aplicativo da Web**.
3. Em **URIs de redirecionamento autorizados**, adicione exatamente:
   - `https://helenastudy.vercel.app/api/google-calendar?action=callback`
     (troque pelo domínio real de produção, se for diferente)
4. Salve e copie o **Client ID** e o **Client Secret**.

> A URI de redirecionamento precisa ser um domínio fixo. Prévias de PR da
> Vercel têm URL dinâmica a cada PR, então a integração só funciona de fato
> depois de mesclada em produção (ou testando localmente com `vercel dev` e
> uma URI `http://localhost:PORTA/api/google-calendar?action=callback`
> também cadastrada acima).

## 4. Configurar as variáveis de ambiente na Vercel

No painel do projeto na Vercel (**Settings → Environment Variables**), nunca
num arquivo do repositório:

| Variável                | Valor                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`      | o Client ID copiado acima                                                                                   |
| `GOOGLE_CLIENT_SECRET`  | o Client Secret copiado acima                                                                               |
| `GOOGLE_REDIRECT_URI`   | a mesma URI cadastrada no passo 3                                                                           |
| `GOOGLE_SESSION_SECRET` | uma chave aleatória: gere com `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

Depois de configurar, faça um novo deploy para as variáveis entrarem em vigor.

## Como funciona no app

- **Conectar Google Agenda** leva o usuário para `/api/google-calendar?action=connect`, que redireciona para a tela de consentimento do Google.
- O Google chama de volta `?action=callback`, a função troca o código por tokens e grava a sessão cifrada num cookie.
- A Agenda do OlenaStudy chama `?action=events` para listar os próximos 14 dias; o access token é renovado automaticamente quando expira.
- **Desconectar** apaga o cookie de sessão. Nada fica salvo em nenhum servidor.

Esta primeira versão é só leitura. Criar eventos do OlenaStudy diretamente no Google Agenda (escrita) é um passo futuro separado.
