# Amostra de perfil e Arcano

Preview: http://127.0.0.1:4190/artifacts/profile-rewards-review/

Portal do canvas: `Perfil e Arcano: revisão`. A aba `Interpretação e brilho` compara os exemplos comum, épico e lendário. `Galeria` abre a coleção com as categorias em ícones e cabeçalho fixo. `Capturas reais` oferece imagens grandes com ampliação por clique. O link para `/perfil` abre o app em execução na mesma origem de teste.

## Versão e evidências

Versão descrita em `manifest.json`, com HEAD e hash da fonte capturada. `manifest.json` contém hash de toda a fonte, incluindo os arquivos novos, data, URL, tema e viewport de cada captura. Não identificar a amostra como se estivesse inteiramente commitada.

Trinta e quatro capturas do app e dos componentes reais em Edge headless: PC 1440x1000 e celular 390x844, claro e escuro, galeria e três inspeções; no celular há também uma captura do painel após rolar. Dados locais são fixtures de teste. Não são mockups de imagem, mas também não são contas ou recompensas reais. HTTPS externo bloqueado durante os testes.

## Limites

- Direção visual aprovada explicitamente pela proprietária. Alterações posteriores relevantes continuam sujeitas à conferência.
- Revelação do preview é simulada, sem sorteio, áudio ou salvamento de prêmio.
- Toque físico, áudio real, autenticação e sincronização entre contas não verificados.
- PNG local com três conquistas e três cartas gerado e conferido em PC/mobile e claro/escuro, usando artes completas. Resultado em `share-desktop-light.png`.
- Efeitos e sons de inspeção das conquistas implementados pelo motor existente, com descarte seguro no StrictMode e bloqueadas sem celebração. A prova automatizada não confirma a percepção do áudio por uma pessoa. Resultados finais de verify/e2e e PR estão no CURRENT_STATE_AUDIT.
- Nenhuma arte ou personagem redesenhado; chances e classificação das recompensas preservadas.
- Medidas de desempenho são locais, em servidor dev com CPU reduzida e cache desligado. Não representam latência de produção.

## Reprodução

Dentro desta worktree, com servidor local na porta 4190:

```powershell
node artifacts/profile-rewards-review/capture.mjs
node artifacts/profile-rewards-review/interactions.mjs
node artifacts/profile-rewards-review/radiance-check.mjs
node artifacts/profile-rewards-review/measure-gallery.mjs sample-final
```

Os scripts usam automação do navegador headless, sem controle nativo do mouse ou captura de desktop. A origem local é exclusiva da revisão; as fixtures substituem os dados de teste dessa origem, nunca os da produção.

### Medida da amostra estável

Mesma rotina de medição local, três execuções por viewport, Edge headless, CPU 4x, cache desligado e fixture de 78 cartas. Mediana até decodificar a primeira linha: PC de 5864 ms para 4432 ms; celular de 5613 ms para 4095 ms. Na janela de observação após a primeira linha, imagens solicitadas passaram de 78 para 25 no PC e 18 no celular; bytes de 1430350 para 472678 e 341400, respectivamente. São medidas do servidor dev, sem inferência de latência de produção. Arquivos brutos: `gallery-baseline.json` e `gallery-sample-final.json`. Todas as 78 cartas permanecem disponíveis ao rolar.
