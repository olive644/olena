# Política de segurança

Obrigado por ajudar a manter o OlenaStudy seguro. Este documento explica como relatar uma
vulnerabilidade, o que esperar depois e o que está dentro do escopo.

## Como relatar

**Não abra uma issue pública** para uma vulnerabilidade. Use uma destas vias privadas:

1. **Relato privado no GitHub (preferido):** na aba **Security** do repositório, escolha
   **Report a vulnerability**. O relato fica visível só para quem mantém o projeto.
2. **Contato da Galeria.Oli:** o canal de contato oficial ainda está em definição e será
   publicado na [Política de Privacidade](public/politica-de-privacidade.html) quando existir.
   Enquanto isso, prefira a via 1.

Inclua, se puder:

- o que você encontrou e qual o efeito (por exemplo, ler dados de outra pessoa);
- os passos para reproduzir, com a página, a ação e o navegador;
- provas simples (captura de tela, resposta do servidor), sem dados reais de terceiros;
- se você acha que já está sendo explorado.

## O que esperar

Somos uma equipe pequena. Nossa meta, sem ser uma garantia contratual:

- confirmar o recebimento em até **7 dias**;
- dar uma primeira avaliação (procede ou não, gravidade) em até **15 dias**;
- corrigir as falhas graves o quanto antes e avisar você quando estiver no ar;
- creditar você na correção, se quiser, ou manter o anonimato, se preferir.

Pedimos que você **não divulgue publicamente** antes de a correção estar no ar ou de combinarmos
uma data juntos.

## Versões cobertas

Só a versão em produção (o que está na branch `main`, publicado em `olenastudy.vercel.app`)
recebe correções de segurança. Não há versões antigas mantidas.

## Escopo

**Dentro do escopo**

- o aplicativo web e suas funções de servidor (`/api/*`);
- login, sessão, exclusão de conta e a sincronização com a conta;
- salas, cadernos compartilhados, links de leitura e a colaboração em tempo real;
- vazamento de dados de uma pessoa para outra, acesso sem permissão (IDOR) e falta de
  verificação de quem está pedindo;
- injeção de código (XSS, injeção em consultas), falhas de CSRF, CORS e cabeçalhos de segurança;
- segredos, chaves ou dados pessoais versionados por engano no repositório.

**Fora do escopo**

- ataques de negação de serviço ou que gerem tráfego excessivo;
- engenharia social, phishing e ataques físicos contra pessoas da equipe ou de quem usa;
- falhas em serviços de terceiros em si (Google, Firebase, Vercel, Cloudflare); relate a eles.
  Se o nosso uso deles for o problema, relate a nós;
- relatórios automáticos sem prova de efeito real (por exemplo, "cabeçalho X ausente" sem impacto);
- problemas que exigem um aparelho já comprometido ou acesso ao navegador da própria vítima;
- vulnerabilidades em versões de navegador sem suporte.

## Como testar com segurança

- Teste **só com contas e dados seus** (crie contas de teste). Não acesse, altere ou apague dados
  de outras pessoas, mesmo que consiga.
- Pare assim que confirmar o problema; não extraia mais dados do que o necessário para provar.
- Não faça testes de carga, varreduras agressivas nem tentativas de adivinhar códigos de sala em
  massa. As salas têm limite de tentativas por endereço, e isso conta como abuso.
- Não use engenharia social nem ataque a contas de quem não é você.

Se você agir de boa-fé dentro destas regras, não tomaremos medidas contra você.

## O que já existe (para você não perder tempo)

Para orientar a busca, estas proteções já estão no projeto:

- política de segurança de conteúdo (CSP) sem `unsafe-inline` nem `unsafe-eval` nos scripts,
  HSTS, política de permissões e de referência, isolamento de janelas de login;
- App Check e limite de tentativas por endereço nas salas e nos cadernos compartilhados;
- as regras do banco de dados bloqueiam leitura e escrita diretas nas áreas de salas e de
  cadernos; quem escreve é a função de servidor, depois de conferir a credencial;
- dados pessoais do aparelho apagados ao sair da conta, e exclusão de conta na tela de Perfil;
- fontes e reconhecimento de texto servidos do próprio domínio, sem enviar o endereço de rede a
  terceiros; recursos que enviam texto a terceiros só com o aceite da pessoa;
- verificação automática no CI: CodeQL, Semgrep, detecção de segredos (gitleaks) e auditoria de
  dependências.

Isso **não** significa que esteja livre de falhas. Se você achou algo, queremos saber.

## Dados pessoais

Se o seu relato envolver dados pessoais de terceiros que você encontrou por engano, **não os copie
nem os compartilhe**. Descreva o tipo de dado e onde estava. Tratamos esses casos conforme a Lei
Geral de Proteção de Dados (LGPD) e a [Política de Privacidade](public/politica-de-privacidade.html).

## Reconhecimentos

Agradecemos a quem contribui com relatos responsáveis. Não temos programa de recompensa em
dinheiro.
