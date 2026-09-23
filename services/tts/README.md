---
title: OlenaStudy TTS
emoji: 🗣️
colorFrom: purple
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# Servico de TTS (Kokoro + Piper)

Servico interno em FastAPI que gera a voz do Quiz de Escuta e do Modo Sala.
Kokoro e o provedor principal; se falhar, exceder o tempo limite ou estiver
indisponivel, o proprio servico tenta o Piper. Se os dois falharem, quem
chama (a funcao `/api/speech` da Vercel) sinaliza para o navegador usar a
Web Speech API. Este servico nunca e exposto direto ao frontend.

## Executar localmente

```bash
cd services/tts
python -m venv .venv
./.venv/Scripts/python -m pip install -r requirements-dev.txt
./scripts/download-voice-models.sh
TTS_SERVICE_TOKEN=um-segredo-de-teste ./.venv/Scripts/python -m uvicorn app.main:app --port 7860
```

No Linux/macOS troque `./.venv/Scripts/python` por `./.venv/bin/python`.

## Testes

```bash
./.venv/Scripts/python -m pytest
```

Os testes em `tests/test_integration_real_models.py` sao pulados
automaticamente quando os modelos nao estao baixados em `models/`. Rode
`scripts/download-voice-models.sh` antes para exercitar sintese de audio
de verdade (Kokoro e Piper reais, nao mockados).

## Variaveis de ambiente

| Variavel                    | Obrigatoria | Padrao                    | Descricao                                                                                     |
| --------------------------- | ----------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `TTS_SERVICE_TOKEN`         | sim         | (vazio, recusa tudo)      | Segredo compartilhado com a funcao `/api/speech` da Vercel, enviado no header `X-TTS-Secret`. |
| `KOKORO_VOICE`              | nao         | `af_heart`                | Voz do Kokoro (americana feminina natural).                                                   |
| `PIPER_VOICE`               | nao         | `en_US-hfc_female-medium` | Voz do Piper usada como reserva.                                                              |
| `KOKORO_TIMEOUT_MS`         | nao         | `6000`                    | Tempo limite da sintese com Kokoro antes de tentar o Piper.                                   |
| `PIPER_TIMEOUT_MS`          | nao         | `6000`                    | Tempo limite da sintese com Piper antes de desistir.                                          |
| `TTS_CACHE_TTL_SECONDS`     | nao         | `3600`                    | Tempo de vida de cada audio em cache.                                                         |
| `TTS_CACHE_MAX_ENTRIES`     | nao         | `512`                     | Numero maximo de audios guardados em cache ao mesmo tempo.                                    |
| `TTS_MAX_CONCURRENT_KOKORO` | nao         | `2`                       | Sinteses simultaneas permitidas no Kokoro (limite de memoria).                                |
| `TTS_MAX_CONCURRENT_PIPER`  | nao         | `2`                       | Sinteses simultaneas permitidas no Piper.                                                     |
| `TTS_MAX_TEXT_LENGTH`       | nao         | `160`                     | Tamanho maximo do texto aceito, em caracteres.                                                |

Nenhuma dessas variaveis deve ser exposta ao navegador (nao usar prefixo
`VITE_`). `TTS_SERVICE_URL` e `TTS_SERVICE_TOKEN` do lado da Vercel ficam
descritos em `.env.example`, na raiz do projeto.

## Memoria e inicializacao esperadas

- Modelo Kokoro em disco: ~325MB (`kokoro-v1.0.onnx`) + ~27MB (`voices-v1.0.bin`).
- Modelo Piper em disco: ~63MB (`en_US-hfc_female-medium.onnx`).
- Memoria residente observada com os dois modelos carregados: pedir pelo
  menos **1.5GB de RAM** para o container, com folga para concorrencia
  (2 sinteses simultaneas por provedor, por padrao).
- Tempo de carregamento medido nesta maquina: Kokoro ~2.5s, Piper ~4.5s.
  O `lifespan` do FastAPI carrega os dois uma unica vez na inicializacao
  do processo; requisicoes concorrentes reaproveitam a mesma instancia.
- `/health` responde `{"status": "ok", "kokoro_loaded": bool, "piper_loaded": bool}`
  sem revelar nenhuma configuracao sensivel.

## Build do container

```bash
docker build -t helenastudy-tts services/tts
docker run -p 7860:7860 -e TTS_SERVICE_TOKEN=um-segredo-de-teste helenastudy-tts
curl http://localhost:7860/health
```

O build baixa os modelos durante a construcao da imagem (via
`scripts/download-voice-models.sh`), entao a imagem final e autossuficiente
e nao depende de rede na inicializacao do container.

**Pendente nesta entrega**: o build e o teste do container Docker acima nao
puderam ser executados no ambiente onde este servico foi desenvolvido (sem
Docker disponivel). O Dockerfile foi escrito e revisado manualmente contra a
documentacao oficial da imagem `python:3.12-slim` e contra os requisitos de
permissao do Hugging Face Spaces (usuario nao-root, porta 7860), mas o build
de verdade fica como validacao pendente antes do primeiro deploy.

## Deploy no Railway (recomendado, sem custo)

O plano Free do Railway nao pede cartao de credito e e permanente (nao e
trial), mas limita a instancia a 0.5GB de RAM, insuficiente pros dois
motores juntos. Por isso este deploy roda **so o Kokoro**
(`Dockerfile.railway`, que pula o download do Piper). O codigo ja trata isso
com naturalidade: `/health` reporta `piper_loaded: false`, e o roteador cai
direto pro fallback da voz do navegador se o Kokoro falhar, sem quebrar o
Quiz de Escuta nem o Modo Sala.

1. Crie conta em https://railway.app (sem cartao).
2. **New Project → Deploy from GitHub repo**, escolha o repositorio
   `helenastudy`.
3. Nas configuracoes do servico criado:
   - **Root Directory**: `services/tts`
   - **Dockerfile Path**: `Dockerfile.railway` (em vez do `Dockerfile` padrao)
   - **Watch Paths**: `services/tts/**` (evita redeploy quando o resto do
     monorepo mudar)
4. Em **Variables**, adicione:

```
TTS_SERVICE_TOKEN=<o mesmo valor configurado na Vercel>
TTS_MAX_CONCURRENT_KOKORO=1
```

5. Faça o deploy. O primeiro build demora alguns minutos (baixa o modelo do
   Kokoro). Acompanhe em **Deployments → Logs**.
6. Em **Settings → Networking**, gere um dominio publico (**Generate
   Domain**). A URL fica algo como
   `https://helenastudy-tts-production.up.railway.app`.
7. Configure na Vercel (nunca com prefixo `VITE_`):

```
TTS_SERVICE_URL=https://<dominio-gerado-pelo-railway>
TTS_SERVICE_TOKEN=<o mesmo segredo do passo 4>
```

**Atencao com um ponto real**: diferente do Cloud Run e do Hugging Face
Spaces, o plano Free do Railway nao escala a zero. O container fica ligado
o tempo todo, consumindo do credito de US$1/mes que o plano da. Nao tenho
certeza se US$1 cobre um mes inteiro de container ligado 24 horas (depende
do consumo real de CPU/memoria em repouso); acompanhe em **Usage** no
primeiro mes. Pra nunca ser cobrado por engano, configure em **Settings →
Usage Limits** um teto de gasto de US$0 acima do credito gratis. Se
estourar, o Railway so pausa o servico em vez de cobrar.

## Deploy no Hugging Face Spaces (exige plano PRO)

**Atualizacao**: o Hugging Face passou a exigir assinatura **PRO** (paga) pra
criar Spaces com SDK Docker ou Gradio. So o SDK "Static" (sem servidor)
continua gratis, o que nao serve pra este servico. Deixamos a secao abaixo
documentada para quem ja tiver o plano PRO; quem nao tem, va direto pra
[Deploy no Railway](#deploy-no-railway-recomendado-sem-custo) mais abaixo.

O SDK Docker do Hugging Face Spaces le o `sdk: docker` e `app_port: 7860` do
cabecalho YAML deste proprio README.

1. Crie um novo Space em https://huggingface.co/new-space, escolhendo SDK
   **Docker** e visibilidade **Private** (o segredo no header ja protege o
   endpoint, mas deixar privado evita que o Space apareca em buscas).
2. Em **Settings → Variables and secrets** do Space, adicione como _Secret_:
   `TTS_SERVICE_TOKEN` (o mesmo valor configurado na Vercel). As demais
   variaveis (`KOKORO_VOICE`, `PIPER_VOICE`, etc.) sao opcionais; os padroes
   ja servem.
3. Publique o conteudo desta pasta no repositorio git do Space:

```bash
cd services/tts
git init
git remote add space https://huggingface.co/spaces/<seu-usuario>/<nome-do-space>
git add -A
git commit -m "Publica servico de TTS"
git push --force space HEAD:main
```

(Peça login antes com `huggingface-cli login`, instalado via
`pip install huggingface_hub`, ou cole um token de acesso quando o git
pedir usuario/senha.) 4. O primeiro build demora alguns minutos (baixa os modelos). Acompanhe em
**Logs** na propria pagina do Space. 5. A URL do serviço fica em
`https://<seu-usuario>-<nome-do-space>.hf.space`. Configure na Vercel
(nunca com prefixo `VITE_`):

```
TTS_SERVICE_URL=https://<seu-usuario>-<nome-do-space>.hf.space
TTS_SERVICE_TOKEN=<o mesmo segredo do passo 2>
```

O tier gratis de CPU do Hugging Face Spaces "dorme" o Space depois de um
tempo sem uso; a primeira requisicao depois disso enfrenta um cold start
parecido com o de qualquer container que escala a zero (alguns segundos pra
recarregar os modelos).

## Deploy no Google Cloud Run (alternativa, exige faturamento)

Cloud Run tem tier "always free" genuino (2 milhoes de requisicoes, 360.000
GB-segundos de memoria e 180.000 vCPU-segundos por mes), mas o Google passou
a exigir um pre-pagamento reembolsavel (na faixa de R$200) pra abrir uma conta
de faturamento nova no Brasil, mesmo pra ficar dentro do tier gratis depois.
Avalie se vale a pena antes de seguir por aqui; o Hugging Face Spaces acima
nao tem essa exigencia.

```bash
gcloud auth login
gcloud config set project SEU_PROJETO_GCP
gcloud run deploy helenastudy-tts \
  --source services/tts \
  --region us-central1 \
  --memory 2Gi \
  --cpu 2 \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 3 \
  --allow-unauthenticated \
  --set-env-vars TTS_SERVICE_TOKEN=<segredo-forte>,KOKORO_VOICE=af_heart,PIPER_VOICE=en_US-hfc_female-medium
```

`--allow-unauthenticated` e necessario porque a Vercel autentica com o
segredo no header `X-TTS-Secret`, nao com um token de identidade do Google;
`--no-allow-unauthenticated` bloquearia a requisicao antes mesmo dela chegar
no FastAPI. A protecao real continua sendo o segredo validado pelo proprio
servico.

Depois do deploy, configure na Vercel (nunca com prefixo `VITE_`):

```
TTS_SERVICE_URL=<url do Cloud Run>
TTS_SERVICE_TOKEN=<o mesmo segredo>
```

`--min-instances 0` deixa o servico escalar a zero entre usos (mais barato),
ao custo de um cold start (~3 a 5s de carregamento dos modelos) na primeira
requisicao apos um periodo ocioso. Se isso for perceptivel demais no Quiz de
Escuta ao vivo, considere `--min-instances 1` (deixa de ser gratuito).
Configure tambem um orcamento de baixo valor em Cloud Billing com alerta por
e-mail; orcamentos so avisam, nao bloqueiam gasto automaticamente.

## Licencas

- **Kokoro**: Apache 2.0 (modelo hexgrad/Kokoro-82M, distribuido via
  `kokoro-onnx` 0.6.1).
- **Piper**: o pacote `piper-tts` (mantido atualmente, fork "Piper 1") usa
  licenca GPL-3.0. Ele fica isolado neste servico Python, executado como
  processo proprio; nenhum codigo GPL entra no frontend (JavaScript/TypeScript
  do OlenaStudy).
- **Voz do Piper** (`en_US-hfc_female-medium`): distribuida no repositorio
  `rhasspy/piper-voices` no Hugging Face. O `MODEL_CARD` oficial dessa voz
  informa que o dataset de treinamento (Hi-Fi CAPTAIN, NICT) usa licenca
  **CC BY-NC-SA 4.0 (nao comercial)**: https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en.
  Isso pode ser incompativel com uso comercial do OlenaStudy dependendo de
  como o produto for monetizado; nao troquei a voz por conta propria porque
  foi pedida nominalmente, mas isso precisa ser decidido antes do deploy em
  producao. Este projeto nao redistribui o arquivo do modelo, apenas o baixa
  em tempo de build a partir da fonte oficial.
- A avaliacao juridica final sobre a distribuicao (incluindo a licenca
  exata da voz Piper) continua necessaria e nao foi feita aqui.
