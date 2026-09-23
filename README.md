# OlenaStudy

Central de estudos, foco e rotina da marca Oli.

O OlenaStudy reúne agenda, tarefas, hábitos, temporizador, anotações, digitalizações, escrita à mão,
materiais, flashcards, quizzes, bingo e planejamento de aulas em um único espaço. O workspace fica
no dispositivo por padrão; com login opcional pelo Google, o progresso e as preferências sincronizam
entre dispositivos via Firebase. O Modo Sala usa Firebase Realtime Database para sincronizar
participantes e rodadas ao vivo entre dispositivos, com App Check protegendo a API. A voz natural do
quiz de escuta é gerada pelo Cloudflare Workers AI (modelo MeloTTS) por uma função segura de
servidor, com a voz do dispositivo como reserva automática.

A fronteira segura da futura Helena inteligente já possui contrato e testes, mas permanece sem
provedor conectado. Consulte [`docs/AI_BACKEND.md`](docs/AI_BACKEND.md) para o fluxo de dados, o
modelo de ameaça e as decisões necessárias antes da ativação.

## Licença

Software proprietário. Todos os direitos reservados — veja [`LICENSE`](LICENSE). O código está
visível neste repositório para fins de desenvolvimento e revisão, mas nenhuma cópia, modificação,
distribuição ou uso comercial é permitido sem autorização prévia e por escrito do titular.

## Desenvolvimento

Requer Node.js 24 ou superior.

```bash
npm ci
npm run dev
```

Em produção, configure `CLOUDFLARE_ACCOUNT_ID` e `CLOUDFLARE_API_TOKEN` somente no ambiente da
Vercel para ativar a voz natural (veja [`.env.example`](.env.example) para a lista completa de
variáveis, incluindo Firebase, App Check e login com Google). Nenhuma chave de servidor deve usar o
prefixo `VITE_` nem ser enviada ao navegador. Sem essas variáveis, o quiz recorre automaticamente à
voz instalada no dispositivo.

## Verificação completa

```bash
npm run verify
```

O contexto do produto e as decisões técnicas ficam em
[`docs/SECOND_BRAIN.md`](docs/SECOND_BRAIN.md).

O [mapa mental do produto](docs/PRODUCT_MIND_MAP.md) conecta todas as áreas planejadas. O
[roadmap de implementação](docs/IMPLEMENTATION_ROADMAP.md) separa as entregas em fases e registra
quando uma biblioteca ou linguagem adicional pode ser avaliada.
