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

Ao receber transcrição, mostrar texto não editável e permitir gravar novamente. Somente Enviar resposta avalia. Comparar frase normalizada (caixa, pontuação, contrações comuns e números de 0 a 99), sem similaridade aproximada que aceite negação ou número incorretos. Não atribuir nota de sotaque. A pessoa pode refazer a captura quando o navegador tiver reconhecido errado, ou usar palavras.

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
