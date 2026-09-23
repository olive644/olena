import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Header, HTTPException, Response
from pydantic import BaseModel, Field

from .cache import SynthesisCache
from .config import load_settings
from .kokoro_engine import KokoroEngine
from .piper_engine import PiperEngine
from .tts_router import AllProvidersFailedError, TtsRouter

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("tts.main")

settings = load_settings()
kokoro_engine = KokoroEngine()
kokoro_engine.configure_concurrency(settings.max_concurrent_kokoro)
piper_engine = PiperEngine(settings.piper_voice)
piper_engine.configure_concurrency(settings.max_concurrent_piper)
cache = SynthesisCache(settings.cache_max_entries, settings.cache_ttl_seconds)
router = TtsRouter(
    kokoro=kokoro_engine,
    piper=piper_engine,
    cache=cache,
    kokoro_timeout_ms=settings.kokoro_timeout_ms,
    piper_timeout_ms=settings.piper_timeout_ms,
    kokoro_voice=settings.kokoro_voice,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Carrega os dois modelos uma unica vez na inicializacao do processo,
    # para que fiquem aquecidos e sejam reaproveitados entre requisicoes.
    kokoro_engine.load()
    piper_engine.load()
    yield


app = FastAPI(title="OlenaStudy TTS Service", lifespan=lifespan)


class SynthesizeRequest(BaseModel):
    text: str = Field(min_length=1)
    rate: float = Field(ge=0.5, le=1.5)


def require_secret(x_tts_secret: str | None) -> None:
    if not settings.service_token or x_tts_secret != settings.service_token:
        raise HTTPException(status_code=401, detail="Segredo invalido ou ausente.")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "kokoro_loaded": kokoro_engine.is_loaded(),
        "piper_loaded": piper_engine.is_loaded(),
    }


@app.post("/synthesize")
async def synthesize(
    request: SynthesizeRequest,
    x_tts_secret: str | None = Header(default=None, alias="X-TTS-Secret"),
) -> Response:
    require_secret(x_tts_secret)
    if len(request.text) > settings.max_text_length:
        raise HTTPException(status_code=400, detail="Texto excede o tamanho maximo.")

    try:
        audio, provider = await router.synthesize(request.text, request.rate)
    except AllProvidersFailedError:
        logger.warning("Todos os provedores de voz falharam para esta requisicao.")
        raise HTTPException(status_code=503, detail="Nenhum provedor de voz disponivel.")

    return Response(content=audio, media_type="audio/wav", headers={"X-TTS-Provider": provider})
