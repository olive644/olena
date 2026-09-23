# Servico de TTS do OlenaStudy: Kokoro como provedor principal, Piper como
# reserva. Roda em container proprio, nunca exposto direto ao navegador; a
# funcao /api/speech da Vercel fala com ele por HTTP interno autenticado.
#
# Preparado pra rodar no tier gratis do Hugging Face Spaces (SDK Docker), que
# exige processo rodando como usuario nao-root (UID 1000) e expondo a porta
# 7860. Continua compativel com Cloud Run ou outro host de container, bastando
# apontar a porta correta na plataforma escolhida.
FROM python:3.12-slim AS base

RUN apt-get update \
    && apt-get install -y --no-install-recommends espeak-ng curl \
    && rm -rf /var/lib/apt/lists/*

# Usuario nao-root exigido pelo Hugging Face Spaces (UID 1000).
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

COPY --chown=user requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user app ./app
COPY --chown=user scripts/download-voice-models.sh ./scripts/download-voice-models.sh
RUN chmod +x scripts/download-voice-models.sh && ./scripts/download-voice-models.sh

ENV PYTHONUNBUFFERED=1
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
