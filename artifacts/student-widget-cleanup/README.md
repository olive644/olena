# Limpeza dos widgets

Sem os dois títulos introdutórios, sem +/÷ no Oliver (imagem e Rive), sem halo amarelo na estrela da Olena. Fundo inglês com livro, lápis e letras discretos. A imagem inglesa é preparada em idle/por intenção e aparece sem animação de entrada.

Capturas reais de visitante sem dados pessoais, desktop 1280 × 900 e celular 320 × 900, claro/escuro e movimento reduzido. Testes de navegador também usam 320 × 568, validam o Rive em movimento e a transparência na antiga região dos sinais.

Reproduzir: servidor em 4176 e `node artifacts/student-widget-cleanup/capture.mjs`. Arte estática de Oliver exportada do repouso do Rive; fontes de edição e hashes em art-sources.json.

O carrossel prioriza uma ofensiva com até uma hora de expiração; entre duas urgentes, escolhe o prazo mais próximo. Sem urgência, abre na maior streak. A escolha manual é preservada. A prioridade usa a mesma validação e o fuso do perfil.

Validação: 20 cenários de navegador aprovados. Suíte geral: 2672 aprovados; um benchmark de busca excedeu 120 ms e também falhou no checkout limpo da main. Build, lint, formatação, API, idiomas e orçamento aprovados. O limite do benchmark permaneceu intacto.
