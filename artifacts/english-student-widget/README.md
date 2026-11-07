# Widget de Inglês no Espaço do aluno

A imagem escolhida pela responsável foi mantida, retirando apenas os dois balões. A arte transparente é exportada de 1536 × 1024 para WebP 900 × 600. Fonte original preservada fora do repositório; hashes e edição registrados em art-source.json.

O carrossel começa com Matemática e oferece Inglês por botões, teclado e gesto horizontal, sem rotação automática. CTA abre o percurso real. Streak usa recibos aceitos e as regras existentes do perfil.

Capturas reais, visitante sem dados pessoais, movimento reduzido: desktop 1280 × 900 e celular 320 × 900, temas claro e escuro. O navegador também testa celular 320 × 568 e a navegação real.

- [Desktop claro](desktop-light.png)
- [Desktop escuro](desktop-dark.png)
- [Celular claro](mobile-light.png)
- [Celular escuro](mobile-dark.png)

Reproduzir os cenários com `npm run test:e2e -- e2e/english-student-widget.spec.ts e2e/student-resume.spec.ts e2e/student-space-haptics.spec.ts`. Conta real, Safari e aparelhos físicos não verificados. A arte não é uma nova animação Rive.

Para refazer estas quatro capturas, iniciar `npm run dev -- --host 127.0.0.1 --port 4174` e executar `node artifacts/english-student-widget/capture.mjs`, com Chromium em /usr/bin/chromium.
