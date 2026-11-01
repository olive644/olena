# Oliver: revisão depois dos três corações

Data: 01/11/2026. Branch `feat/math-oliver-review`, base `665e3ad` da PR557,
ainda não mesclada. Diretório de trabalho próprio, sem integração no produto.

## Amostra para aceite

Preview: http://127.0.0.1:4196/artifacts/math-oliver-review/

Componente React isolado e funcional, três questões reais do banco usadas como
fixtures explícitas. Explicação, quatro alternativas originais, tentativa
incorreta sem penalidade, acerto e passagem à próxima pergunta. Sem relógio,
vidas, gravação de progresso, pontos ou recompensas. Oito capturas reais da
amostra em PC1440x1000/mobile390x844, claro/escuro, com manifesto de hashes.
O script `capture.mjs` confere retentativa por teclado, três acertos, conclusão,
ausência de overflow e ausência de escritas de progresso/recompensas.

Interpretado provisoriamente como uma questão por vez com suas quatro
alternativas. A pergunta opcional para esclarecer quatro questões versus
quatro alternativas ainda não recebeu resposta. Não há aprovação presumida.

Atualização solicitada explicitamente: Rive falando, balão original e efeitos
do minigame. O arquivo próprio `public/oliver-math-review/oliver.riv` já existe,
com boca em ciclo de fala, olhos, mão e reações de acerto/encorajamento. Balão
de papel tem entrada curta; alternativas e partículas reagem sem retirar vidas.
Sons usam createMathSound e têm botão de silenciar. Não há voz sintetizada.

O ensaio atualizado conferiu variação real de pixels na região da boca Rive,
áudio nativo (seis osciladores em cada viewport) e zero osciladores adicionais
ao silenciar. Dados exatos no manifesto. Movimento reduzido mantém PNG, sem
canvas/download de Rive/runtime ou transições/partículas. Isto não é avaliação
humana de áudio audível em aparelho. Três testes unitários do componente,
TypeScript e ESLint direcionado passaram.

Ainda não existe coleta real da partida, cobertura editorial completa,
integração no MathArcade ou validação do produto completo.
Não houve verify, build, e2e geral, publicação ou merge desta nova tarefa.
ESLint e Prettier dos arquivos da amostra passaram. O ensaio automatizado de
browser teve zero erros de página e rede HTTPS externa bloqueada, animação real
ativada e movimento reduzido conferido separadamente. Não é teste em aparelho
físico, conta ou sincronização real.

## Integração proposta após o aceite

1. Guardar até três perdas confirmadas da rodada em memória: cópia completa
   da MasteryQuestion apresentada, cópia de choices, escolha ou null no timeout
   e identificador da tentativa. Capturar depois da avaliação e sob answerLock.
   Não reconstruir por seed ou recovery, pois podem mudar números e alternativas.
2. Depois do feedback da terceira perda, manter a liquidação original uma vez
   e mostrar a revisão antes do resultado. Não alternar finished para false/true
   para navegar entre revisão e resultado, evitando repetir efeitos de XP/baús.
3. Comparar novas respostas ao gabarito do snapshot em estado separado. Nunca
   chamar requestMastery, saveMathLearning ou onPractice nessa etapa gratuita.
   Não alterar final, tentativas, progressão ou recovery sincronizado.
4. Limpar a fila ao recomeçar, sair ou trocar a conta. Não introduzir chave de
   sincronização ou prometer recuperação entre dispositivos sem escopo próprio.
5. Completar soluções autorais por curso, etapa e formato, usando os mesmos
   parâmetros das perguntas e preservando fontes/Thompson. Conferir operações
   intermediárias e resultado, incluindo arredondamento e variantes finais.
   O campo review atual é uma dica; parte do banco usa fallback genérico.
   Não apresentar esse fallback como resolução completa. Sem API externa ou
   parser heurístico de enunciados.
6. Rive da amostra pronto por solicitação posterior, com camadas próprias: corpo, mão, olhos e
   boca. Estados de repouso, explicação e acerto, sem alegar áudio sintetizado.
   Reutilizar runtime existente, fallback estático e movimento reduzido, com
   comparação do quadro de repouso contra a arte. Não reutilizar rig de outra
   pose. A animação não bloqueia leitura ou botões.

Atlas investigou somente leitura: recovery não é histórico exato da rodada;
as 288 famílias ainda não têm cobertura uniforme de soluções completas. Essa
investigação não é revisão pedagógica integral nem aprovação criativa.

## Arte e procedência

Arquivo: `oliver-tutor-v1.png`, gerado pela ferramenta integrada image_gen.
Referências de identidade: `public/oliver-peeking-widget.webp` e
`public/oliver-math-islands.png`, vistas antes da geração. Nova pose, sem
substituir ou alterar as referências. O rig usa uma cópia recortada em camadas
próprias. A referência original é preservada.

Prompt final utilizado:

```text
Create one NEW illustration for the OlenaStudy mathematics retry/review screen.
Use case: stylized-concept. Input images are reference images ONLY, not edit
targets: reference 1 is Oliver's current approved identity and facial shape,
reference 2 shows his full-body faceted limbs. Preserve this exact turquoise/cyan
rounded faceted gemstone mascot, pale cyan face, two BLACK HEART-SHAPED eyes,
BLACK smiling open mouth, short chunky faceted arms and feet. No cat, ears,
whiskers, clothing or hat. NEW encouraging tutor pose, full body seated
comfortably with both feet visible, one small hand raised in a clear friendly
explanatory open-palm gesture, the other resting beside him. Face slightly turned
toward viewer's right where the app will place native speech text, but both heart
eyes clearly visible. Mouth open as if calmly talking, friendly rather than
laughing. Keep face/mouth/eyes/hands spatially distinct and simple for a later Rive
layer rig. Matte paper-cut polygons, crisp intentional facets, exact established
cyan/turquoise/pale-cyan palette, restrained flat contact shadows, no glossy
plastic, no photorealism, no gradients or glow. One character ONLY, no board,
notebook, island, math symbols, speech bubble, frame, lettering, watermark or
background. Genuine transparent background, comfortable padding, isolated full
silhouette, square composition. Do not compose a UI mockup. This must be a new
pose, not a crop or collage of the reference.
```
