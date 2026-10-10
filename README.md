# OlenaStudy

Central de estudos, foco e rotina da marca Oli.

O OlenaStudy reúne agenda, tarefas, hábitos, temporizador de foco, cadernos (com digitalização,
escrita à mão e reconhecimento local opcional de texto), materiais, flashcards, quizzes, bingo e
planejamento de aulas em um único espaço. O workspace fica no dispositivo por padrão. Com login
opcional pelo Google, o progresso e as preferências sincronizam entre dispositivos via Firebase;
quem não quer logar pode entrar como convidado.

## O que existe hoje

- **Espaço do aluno, Agenda, Foco e Hábitos:** o início da experiência e a rotina de estudos.
- **Cadernos e Biblioteca:** anotações, digitalização local, estúdio de escrita à mão, materiais e
  compartilhamento de cadernos por link.
- **Praticar:** ilhas temáticas de papel. A trilha de Idiomas e o minigame de Matemática, que
  adapta os assuntos ao desempenho, estão disponíveis. Os baús de recompensa dão cartas do Oliver,
  e esse progresso sincroniza com a conta.
- **Modo Sala:** o professor cria uma sala com código e os alunos entram pelo celular. Há a escuta
  coletiva e o bingo de números com globo, cartela e pódio. O anfitrião pode remover participantes
  e fechar a entrada. O Firebase Realtime Database guarda o estado temporário da sala, com App
  Check protegendo a API.
- **Voz natural do quiz de escuta:** gerada pelo Cloudflare Workers AI (modelo MeloTTS) por uma
  função segura de servidor, com a voz do dispositivo como reserva automática.
- **Olena API (versão 1):** catálogo somente leitura das ilhas e metodologias de
  Praticar e o desafio calculado do minigame de Matemática. Veja [`docs/OLENA_API.md`](docs/OLENA_API.md).

A fronteira segura da futura Helena inteligente já possui contrato e testes, mas permanece sem
provedor conectado. Consulte [`docs/AI_BACKEND.md`](docs/AI_BACKEND.md) para o fluxo de dados, o
modelo de ameaça e as decisões necessárias antes da ativação.

## Segurança

Encontrou uma vulnerabilidade? Não abra uma issue pública: veja [`SECURITY.md`](SECURITY.md) para relatar em privado.

## Licença

Software proprietário. Todos os direitos reservados, conforme a [`LICENSE`](LICENSE). O código está
visível neste repositório para fins de desenvolvimento e revisão, mas nenhuma cópia, modificação,
distribuição ou uso comercial é permitido sem autorização prévia e por escrito do titular.

## Desenvolvimento

Requer Node.js 24 ou superior (em versões anteriores alguns testes de escuta falham).

```bash
npm ci
npm run dev
```

Sem nenhuma variável de ambiente o aplicativo abre e funciona: o workspace fica no dispositivo e
o login como convidado está disponível. Login com Google, sincronização, Modo Sala e voz natural
dependem de configuração no ambiente seguro da Vercel, descrita em:

- [`docs/ACCOUNT_SYNC_SETUP.md`](docs/ACCOUNT_SYNC_SETUP.md): login Google e sincronização (variáveis
  `VITE_FIREBASE_*`, públicas por definição);
- [`docs/ROOM_SETUP.md`](docs/ROOM_SETUP.md): Modo Sala, conta de serviço, App Check e limpeza
  automática;
- [`docs/GOOGLE_CALENDAR_SETUP.md`](docs/GOOGLE_CALENDAR_SETUP.md): integração com o Google Agenda;
- voz natural: `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN`, somente no ambiente da Vercel.

Nenhuma chave de servidor deve usar o prefixo `VITE_` nem ser enviada ao navegador, e nenhum
segredo entra no repositório. Sem as variáveis, o quiz recorre automaticamente à voz instalada no
dispositivo.

O servidor de desenvolvimento (`npm run dev`) não executa as funções de `api/`. Para testar a sala
ou a voz localmente, use `vercel dev` com as variáveis configuradas, ou abra uma pull request e use
o preview da Vercel.

## Testes de ponta a ponta

```bash
npx playwright install --with-deps chromium webkit
npm run test:e2e
```

O projeto mobile usa WebKit. No GitHub Actions, os projetos desktop e mobile rodam em jobs
separados e em paralelo.

## Verificação completa

```bash
npm run verify
```

O contexto do produto e as decisões técnicas ficam em
[`docs/SECOND_BRAIN.md`](docs/SECOND_BRAIN.md).

O [mapa mental do produto](docs/PRODUCT_MIND_MAP.md) conecta todas as áreas planejadas. O
[roadmap de implementação](docs/IMPLEMENTATION_ROADMAP.md) separa as entregas em fases e registra
quando uma biblioteca ou linguagem adicional pode ser avaliada.
