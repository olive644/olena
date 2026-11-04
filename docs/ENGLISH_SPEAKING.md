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
