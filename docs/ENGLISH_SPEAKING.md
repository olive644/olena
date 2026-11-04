# Prática de fala de Inglês

## Contrato

As seis partes do Cais dos Encontros intercalam fala nas tarefas de ordenação a partir da faixa didática 1 (a primeira é 0). A seleção adaptativa da API original continua escolhendo o mesmo ID, conforme acertos e erros. Faixas 1 e 2 pedem leitura em voz alta; faixas 3 a 5 pedem produzir a frase a partir do significado. Não é certificação A1 a C2 nem avaliação fonética de pronúncia.

Não cria tarefas, pontos ou domínio paralelos. Cada questão conserva ID, resposta, explicação, checkpoint, confirmação e recibo originais. Agora não posso falar abre a ordenação da mesma frase, com a mesma progressão. Aceitar o microfone nunca é condição para concluir uma parte.

## Tecnologia e pesquisa, 03/11/2026

- [Web Speech API, MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition): reconhecimento do navegador, disponibilidade limitada. Chrome e outros navegadores podem enviar áudio a um serviço remoto. Exigir contexto seguro e detectar SpeechRecognition ou webkitSpeechRecognition; a existência do construtor não garante serviço operacional.
- [Reconhecimento local, MDN](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/processLocally): experimental, depende de implementação e pacotes. Não prometemos processamento local nem baixamos pacotes automaticamente.
- [Whisper.cpp, implementação oficial WebAssembly](https://github.com/ggml-org/whisper.cpp/tree/master/examples/whisper.wasm): alternativa local, mas exige modelo e processamento significativo. A demonstração oferece tiny.en de 75 MB ou quantizado de 31 MB. Não foi embutido na aplicação móvel nesta entrega.
- [Transformers.js, documentação oficial](https://huggingface.co/docs/transformers.js/en/index): suporta ASR no navegador com ONNX, mas introduziria runtime e pesos. Não acrescentado porque o fluxo pode usar reconhecimento nativo e alternativa equivalente, sem chave/API paga.

Nenhuma dependência, servidor de áudio ou serviço pago adicionado. Reconhecimento real depende de navegador, sistema, conectividade e autorização. Testes com reconhecimento simulado não demonstram precisão de transcrição ou qualidade de microfone real.

## Privacidade e ciclo de vida

Checkbox universal desmarcado antes do primeiro uso por sessão da prática. Iniciar é um gesto explícito posterior; a permissão técnica continua pertencendo ao navegador. Aviso específico informa processamento potencial pelo provedor do navegador. A política 2026-11-03 explica o uso opcional; aceite geral da política não liga o microfone.

Áudio não é enviado ao backend/Firebase/Discord do Olena. A transcrição fica somente em memória para conferência, nunca em progresso/checkpoint/log/telemetria. Enviar uma fala incorreta registra um rótulo neutro, sem palavras ditadas; acerto registra a resposta canônica do conteúdo. Não há gravação para download, reescuta ou retenção no Olena. Condições de retenção do provedor do navegador não são controladas pelo aplicativo.

Abortar e remover callbacks ao sair, trocar de questão/conta, abrir confirmação de saída ou ocultar a aba. Nenhuma sessão de microfone é retomada automaticamente. Resultados tardios são descartados. Não capturar fala de terceiros nem solicitar dados pessoais nos exercícios.

## Relógio, correção e efeitos

A reserva compartilhada de Matemática continua correndo ao falar ou conferir uma transcrição. Pausa durante aviso/permissão, processamento e erros técnicos, sem descontar coração por falha de reconhecimento. Pedido técnico limitado a 20 s; gravação até 12 s; processamento após parar até 8 s. Esses limites são novos da captura, não mudanças dos prazos do minigame ou dos testes.

Ao receber transcrição, mostrar texto não editável e permitir gravar novamente. Somente Enviar resposta avalia. Comparar frase normalizada (caixa, pontuação, contrações comuns e números de 0 a 99), sem similaridade aproximada que aceite negação ou número incorretos. A tolerância limitada a erros de reconhecimento de uma letra está descrita em "Precisão do reconhecimento, 04/11/2026". Não atribuir nota de sotaque. A pessoa pode refazer a captura quando o navegador tiver reconhecido errado, ou usar palavras.

Erro enviado usa o mesmo coração, reação e revisão ao final. Acerto usa os mesmos pontos/XP/poeira sem bônus por microfone. Papel amarelo para a transcrição, botões e ícone de microfone originais do app, sinal visual abstrato enquanto ouvindo (não é medidor acústico), efeitos de Matemática com preferência de som. Movimento reduzido do sistema e do app desliga o pulso. Nenhuma explicação da atividade depende de animação ou som.

## Validação exigida

Exercitar as seis partes em PC e 320x568, claro/escuro, com fixture de progresso explicitamente identificada. Cobrir consentimento antes de acesso, sucesso, fala diferente, recusa, silêncio, falha de rede, falta de suporte, limite da gravação, saída e callback tardio, alternativa com mesmo ID, não persistência da transcrição, contraste e overflow. Preservar os testes anteriores de retomada, recompensas e relógio. Publicação Firebase ou OAuth real não é necessária para a captura opcional e não deve ser simulada como prova real.

Cabeçalho de produção: vercel.json restringe microphone=(self), substituindo o bloqueio histórico microphone=(). Não concede autorização do navegador nem delega microfone a terceiros; câmera continua self e localização continua negada. Teste de segurança exige a origem própria e ausência de wildcard. Painel e segredos externos não foram alterados. Conferir o cabeçalho efetivo após deploy.

## Revisão local para Brave, 03/11/2026

Esta seção substitui a decisão anterior de depender de SpeechRecognition. No Brave do PC, com permissão e áudio sintético, a API nativa iniciou e terminou em cerca de 0,7 s com erro network. Expor o construtor não demonstra suporte funcional. Referências oficiais: https://github.com/brave/brave-browser/issues/2802 e https://github.com/brave/brave-browser/issues/56487.

Com autorização explícita do proprietário, as seis partes usam MediaRecorder e Whisper tiny.en quantizado no aparelho, via @huggingface/transformers 3.8.1, em worker separado. Modelo MIT onnx-community/whisper-tiny.en, revisão fixa 2575352d61be1bf7225cf8f8b268a4678025fc58. Fonte: https://huggingface.co/onnx-community/whisper-tiny.en e https://huggingface.co/docs/transformers.js/en/index. Não há chave nem API paga. Pesos de 40,8 MB, runtime WASM de 21,6 MB e metadados somam aproximadamente 65 MB no primeiro preparo. O cache pertence ao navegador e pode ser removido ou expulso; não prometer download único permanente.

Preparar voz no aparelho exige autorização separada e inicia somente downloads GET de arquivos públicos. Só Falar agora solicita o microfone. Nenhum áudio ou transcrição vai ao Olena, ao hospedador do modelo ou ao Discord. O download expõe IP e identificadores dos arquivos ao hospedador. A política 2026-11-03.1 descreve isso. Runtime servido pela própria aplicação, sem JavaScript remoto; CSP libera apenas os hosts necessários aos pesos e seus redirecionamentos. Sem serviço remoto automático caso a execução local falhe.

Captura até 12 s, pedido de permissão até 20 s, preparo até 180 s e inferência até 60 s. São limites de operação local, sem mudança do tempo do minigame. Silêncio é recusado antes da inferência; não vale como resposta errada. O relógio pausa no preparo, permissão, processamento e falhas técnicas. Gravação e conferência seguem a regra compartilhada existente. Sair, ocultar aba, trocar conta ou abrir confirmação abortam recursos e descartam callbacks tardios. A alternativa de palavras preserva ID, progresso e recompensas. Só Enviar resposta corrige.

Dependência adicionada porque a API nativa falhou no navegador do proprietário. Worker medido em 866,5 KiB, com limite separado de 1,1 MiB, como os recursos opcionais PDF/3D/TTS. Aplicação medida em 1729,2 KiB dentro de 1730 KiB, entrada 220,7 KiB. Runtime opcional com limite próprio de 22 MiB WASM/64 KiB JS. Não aumentar limite principal para ocultar o runtime. npm audit identificou somente 14 avisos moderados na árvore de ferramentas ESLint/minimatch já existente, sem vulnerabilidade nova de produção identificada.

Prova positiva real: worker no Brave baixou os pesos e transcreveu áudio sintético como What is your name?. Isso não prova microfone físico, sotaques ou desempenho em todos os celulares. Os testes automatizados da interface simulam captura/inferência para cobrir as seis partes, temas e viewports sem baixar o modelo em cada execução do CI. Nenhuma pontuação de pronúncia é anunciada. Reconhecimento pode errar; a pessoa confere antes de enviar.

## Palavras progressivas e aceite automático, 03/11/2026

Solicitação posterior do proprietário substitui a conferência com Enviar resposta. Esse botão foi removido. A captura agora usa AudioWorklet próprio, PCM mono a 16 kHz, em blocos de 200 ms e limitada a 13 s de memória. O microfone continua limitado a 12 s. Não há eco: a saída do grafo usa ganho zero. O preparo do modelo continua explícito e separado do gesto de falar.

A cada 2 s, quando houver voz e o worker estiver livre, o modelo transcreve uma cópia do trecho acumulado. Não executar duas inferências em paralelo. A interface alinha o texto reconhecido à frase esperada com distância de edição e a normalização já usada nas atividades. Palavras reconhecidas ficam verdes e sublinhadas; divergências ficam vermelhas e com sublinhado ondulado; partes ainda não ditas continuam neutras. São estados de texto reconhecido, não avaliação fonética ou de sotaque. A latência depende do aparelho e da duração da frase.

Depois de voz seguida por 1 s de silêncio, parar o microfone e concluir a transcrição. Terminar fala continua como alternativa manual. Só o resultado final completo correspondente à frase gera onAnswer uma vez, com texto canônico; não basta uma prévia parcial. Não há botão Enviar resposta. Divergência solicita nova gravação e não registra uma resposta errada nem desconta coração. A reserva segue correndo enquanto a pessoa fala, como nas regras anteriores; erro por esgotar o tempo ainda pertence ao minigame. Preparo, processamento, falha técnica e revisão para repetir pausam o relógio. A alternativa de palavras continua com as regras normais da atividade.

Prova real atualizada: Brave com dispositivo de áudio sintético, AudioWorklet e Whisper reais, sem mocks de inferência, reconheceu What is your name?, mostrou quatro palavras verdes e aceitou automaticamente após silêncio. Nenhum botão de envio, erro de página ou upload ao hospedador do modelo. Log ../../english-live-brave-real-ui.log. Não é validação de microfone físico. Os cenários de CI simulam PCM e transcrição para validar o contrato sem downloads repetidos.

Aplicação medida em 1731,1 KiB, entrada permanece 220,7 KiB. Aumento medido de 5,9 KiB sobre a base 1725,2 KiB, para captura local e alinhamento das palavras. Dentro da autorização vigente do proprietário para crescimento medido, teto principal ajustado de 1730 para 1734 KiB. Worker e WASM opcionais continuam em orçamento próprio. Nenhum limite de tempo de teste alterado. Licenças do runtime e dependência incluídas em public/speech-licenses; pastas geradas de runtime são excluídas do lint/format, como o OCR existente, enquanto todo o código próprio é verificado.

Validação integral de 04/11/2026: 401 arquivos/2592 testes, zero erros de lint/27 avisos existentes, tipos/API/idiomas/formatação/build/performance verdes. Aplicação 1731,1 KiB de 1734 KiB, entrada 220,7 KiB. Provas locais e limites em CURRENT_STATE_AUDIT.md.

## Precisão do reconhecimento, 04/11/2026

Relato da proprietária: mesmo falando alto e com boa pronúncia, a transcrição errava. Três mudanças, sem novo modelo, dependência ou envio de áudio.

1. **Preparo do áudio** (`src/data/english-speech-audio.ts`). Antes de cada inferência, a cópia do áudio perde o desvio contínuo, é cortada no primeiro e no último trecho com voz (margem de 280 ms), ganha 300 ms de silêncio em cada ponta e tem o pico levado a 0,9, com ganho máximo de 30 dB para não transformar ruído em fala. A captura termina com cerca de 1 s de silêncio, e é nesse silêncio que o Whisper costuma inventar "Thank you."
2. **Aceite com tolerância curta** (`src/data/english-speaking-words.ts`). Uma palavra de conteúdo (4 letras ou mais, mesma letra inicial) pode diferir em uma letra, como card e cards, no máximo uma vez em frases de até 6 palavras e duas nas maiores. Números, negações (not, cannot, never...) e palavras curtas (is, are, do, does, a, the...) continuam exatos, porque carregam a gramática treinada. A única confusão curta aceita é "a" com "of", que o modelo troca no a átono (two pounds a kilo). Anotações como [BLANK_AUDIO], hesitações iniciais (uh, um) e "Thank you" no fim, quando a frase pedida não termina assim, são ignoradas. As cores das palavras e o aceite usam a mesma função, então o que aparece verde é o que vale.
3. **Interface**: o aceite continua automático e uma divergência continua pedindo nova tentativa, sem descontar coração.

### Medição, e o que ela não prova

Whisper tiny.en, base.en e small.en vieram do GitHub (sherpa-onnx, mesmos pesos da OpenAI, quantização int8 própria), porque o Hugging Face não era acessível no ambiente de desenvolvimento. Corpus: as 24 frases de fala do curso, seis vozes sintéticas do Kokoro (quatro nativas e duas com sotaque brasileiro simulado, voz portuguesa falando inglês), cada uma em quatro condições (limpa, microfone de celular com ruído a 14 dB, volume muito baixo e ruído a 6 dB), 576 gravações por modelo, todas com 0,3 a 1,2 s de silêncio antes e 1 s depois, como a captura real. O preparo medido é o código do app, aplicado aos WAVs.

| Configuração                                          | Frases aceitas | Frases aceitas, sotaque br simulado | Erro de palavras |
| ----------------------------------------------------- | -------------- | ----------------------------------- | ---------------- |
| tiny.en, como estava (áudio bruto, comparação exata)  | 84,5%          | 78,6%                               | 3,5%             |
| tiny.en com preparo e tolerância curta (esta entrega) | 90,1%          | 87,5%                               | 3,5%             |
| base.en com preparo e tolerância curta (não incluído) | 94,3%          | 92,2%                               | 2,0%             |

O preparo sozinho melhora o tiny.en em cerca de 1,6 ponto (84,5% para 86,1% na comparação exata). A tolerância e o tratamento de bordas somam o resto. O codificador em fp32 do tiny.en não melhorou nada na medição (85,9% contra 86,1%), por isso não foi adotado.

**Limites.** Fala sintética não é microfone real: não mede sotaques reais, ruído de rua, hesitações, microfone ruim nem a captura do navegador. O sotaque brasileiro foi simulado. Os números mostram a direção e a ordem de grandeza, não a taxa que a pessoa vai ter. Não foi testado em celular físico.

### Decisão da proprietária, 04/11/2026: manter o tiny.en

A proprietária decidiu não trocar para o base.en: não vale deixar a transcrição mais lenta e o download maior para ganhar precisão. O tiny.en fica, com o preparo do áudio e a tolerância curta. A análise abaixo fica registrada para uma revisão futura, por exemplo se a lentidão deixar de ser um problema.

### Alternativa analisada: modelo base.en (não adotada)

A maior melhora medida vem de trocar tiny.en por base.en: de 9,9% para 5,7% de frases recusadas, e de 12,5% para 7,8% no sotaque simulado. O custo, não verificado aqui: download cerca de 35 MB maior (estimativa a partir da arquitetura, pesos quantizados de aproximadamente 75 MB contra 41 MB) e inferência cerca de 30% mais lenta no PC, ainda mais no celular, onde a prévia a cada 2 s pode atrasar. Não foi incluído porque o Hugging Face estava bloqueado: não foi possível confirmar os nomes dos arquivos nem fixar a revisão do repositório onnx-community/whisper-base.en, e o projeto fixa revisões de modelos. Para ativar: abrir https://huggingface.co/onnx-community/whisper-base.en/commits/main, copiar o hash do commit escolhido, conferir que `onnx/encoder_model_quantized.onnx` e `onnx/decoder_model_merged_quantized.onnx` existem nele, trocar `MODEL` e `REVISION` em `src/data/english-asr.worker.ts`, atualizar o texto "cerca de 65 MB" (catálogos de idioma e política de privacidade) e repetir a prova no celular.

## Voz lembrada neste aparelho, 04/11/2026

Problema relatado: a cada prática o Olena pedia de novo a autorização para baixar o modelo, mesmo com ele já guardado no navegador, porque cada prática cria um cliente novo de voz que começa "não preparado".

Fluxo atual:

- Ao preparar a voz com sucesso, o aparelho grava a marca `olena.englishVoice.prepared.v1` no localStorage, com a revisão do modelo. A marca é do aparelho, não da conta, e não sincroniza.
- Nas práticas seguintes, se a marca bate com a revisão atual, o Olena confere no Cache API (`transformers-cache`) se os dois arquivos grandes do modelo estão guardados e então prepara a voz sozinho, sem rede e sem pedir o download. A tela diz "Preparando a voz neste aparelho".
- O microfone continua exigindo a autorização marcada em cada sessão de prática e o toque em "Falar agora". O texto da autorização deixa de falar em baixar o modelo.
- Se o navegador apagou o modelo (arquivo faltando ou erro ao preparar), a marca é removida e volta o fluxo normal com consentimento e download.
- Após preparar, o Olena pede `navigator.storage.persist()` para reduzir a chance de o navegador apagar o modelo. É melhor esforço: o navegador pode negar.

Limites: a conferência do cache cobre só os dois pesos grandes; arquivos pequenos de configuração poderiam, em tese, ser baixados de novo se apenas eles fossem apagados (não verificado). Não foi testado em celular físico.

## Transcrição progressiva e permissão no início, 04/11/2026

A partida pede a permissão do microfone no gesto de iniciar, antes da contagem de três segundos. A consulta encerra imediatamente as trilhas, sem gravar; negativa ou ausência de suporte mantém a alternativa por palavras. A resposta tardia após cancelamento não inicia outra conta. O preparo e download do modelo continuam exigindo consentimento próprio. Quando o modelo já está preparado e a permissão foi concedida no início, não repetir o checkbox de microfone na questão.

O worker usa WhisperTextStreamer do Transformers.js 3.8.1 para emitir palavras durante a decodificação. O cliente aceita mensagens parciais apenas para a requisição ativa, sem encerrar sua promessa ou creditar resposta. As prévias do áudio acumulado continuam a cada dois segundos, sem inferências paralelas. Uma prévia curta de uma nova decodificação não apaga palavras já exibidas; o resultado final pode corrigir o texto. Somente esse resultado final confirma a resposta uma vez. Isso é transcrição incremental local, com latência de captura e inferência, não avaliação fonética instantânea.

A detecção de silêncio passa de 1 para 1,4 segundo para tolerar pausas curtas. O limite de captura permanece em 12 segundos e as regras do relógio e dos corações não mudam. O preparo de áudio preserva uma palavra inicial baixa antes de um trecho mais forte: regressão determinística reproduziu o corte anterior e validou a redução do limiar relativo, mantendo o piso de ruído. A captura solicita também controle automático de ganho do navegador.

As palavras usam pulso verde ou movimento curto vermelho, com som de nova tentativa respeitando as preferências existentes. Movimento reduzido desliga os efeitos. Os parágrafos técnicos sobre tamanho do download e sotaque foram retirados da atividade, mantendo consentimento, política e estados de erro.

Pesquisa e prova: documentação oficial do [Transformers.js](https://huggingface.co/docs/transformers.js/v3.8.1/en/api/pipelines), exemplo de [stream do whisper.cpp](https://github.com/ggml-org/whisper.cpp/tree/master/examples/stream) e código do WhisperTextStreamer instalado. Em quatro frases sintéticas Microsoft Zira, tiny.en e base.en reconheceram quatro de quatro; tiny levou cerca de 2,6 a 3,4 segundos e base 5,0 a 5,4 segundos. Mantido tiny.en, sem nova dependência ou API paga. A API adaptativa do Olena não é transcritor de áudio.

Brave real, worker e pesos reais produziram What, What is, What is your e What is your name?, seguidos pelo resultado final. Log speech-stream-real-probe.log. Prova com WAV sintético, sem microfone físico, sotaque real ou garantia de qualidade equivalente ao Duolingo. A comparação de quatro frases não substitui o corpus anterior de 576 gravações.

## Microfone só no início da partida e palavras ao vivo, 04/11/2026

Relato: a transcrição continuava ruim, as palavras não apareciam enquanto a pessoa falava, e a permissão do microfone aparecia no início da partida e de novo na atividade de fala.

- **Permissão uma vez só.** O pedido do início da partida (`prepareEnglishMicrophone`) agora devolve o fluxo aberto, sem gravar, e a jornada o entrega ao `LocalEnglishSpeech.adoptMicrophone`. A atividade reaproveita esse fluxo; só pede de novo se ele não existir mais (por exemplo, negado no início). Causa provável do segundo pedido: permissões "só desta vez" expiram quando as trilhas são paradas, e antes elas eram paradas logo após o pedido inicial. O fluxo é solto ao terminar a partida, ao sair, ao esconder a aba e ao descartar o cliente de voz. A caixa de autorização da atividade deixou de falar em microfone: sobra somente o aceite do download do modelo, e só enquanto o modelo não está no aparelho.
- **Honestidade sobre o indicador.** Enquanto a partida durar, o navegador pode mostrar o ícone de microfone em uso, porque o fluxo fica aberto. Nada é capturado fora da atividade de fala: o áudio só entra no AudioWorklet quando a pessoa toca em "Falar agora".
- **Palavras ao vivo.** A prévia deixou de rodar a cada 2 s: agora uma nova passada começa assim que a anterior termina, desde que haja ao menos 0,3 s de áudio novo, e a primeira sai com 0,6 s de fala. O ritmo passa a ser o que o aparelho aguentar (o codificador do Whisper tem custo quase fixo por passada, por isso o ganho é no intervalo, não na velocidade de cada passada).
- **Precisão.** Não houve troca de modelo (o tiny.en fica, por decisão da proprietária). O que melhora a impressão de precisão é a sequência de prévias mais frequente. Ganho real de acerto não foi medido neste passo: não há microfone real aqui.

Limites: sem celular físico; o tempo de cada passada em aparelhos fracos não foi medido; o indicador de microfone aberto durante a partida é uma troca consciente por não repetir o pedido.
