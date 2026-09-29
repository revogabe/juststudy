import os
import tempfile
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from faster_whisper import WhisperModel

MAX_AUDIO_BYTES = 32 * 1024 * 1024
SUPPORTED_MEDIA_TYPES = {
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "audio/aac",
    "audio/wav",
    "audio/x-wav",
}
PRIMARY_MODEL_NAME = os.getenv("WHISPER_PRIMARY_MODEL", "turbo")
FALLBACK_MODEL_NAME = os.getenv("WHISPER_FALLBACK_MODEL", "large-v3")
DEVICE = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")

app = FastAPI(title="JustStudy transcription", docs_url=None, redoc_url=None)
primary_model: WhisperModel | None = None
fallback_model: WhisperModel | None = None


def get_model(name: str) -> WhisperModel:
    global primary_model, fallback_model

    if name == PRIMARY_MODEL_NAME:
        if primary_model is None:
            primary_model = WhisperModel(name, device=DEVICE, compute_type=COMPUTE_TYPE)
        return primary_model

    if fallback_model is None:
        fallback_model = WhisperModel(name, device=DEVICE, compute_type=COMPUTE_TYPE)
    return fallback_model


def transcribe(path: str, model_name: str) -> dict:
    segments_iterator, info = get_model(model_name).transcribe(
        path,
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
    )
    segments = []
    log_probabilities = []

    for index, segment in enumerate(segments_iterator, start=1):
        text = segment.text.strip()
        if not text:
            continue

        segments.append(
            {
                "id": f"seg_{index}",
                "start_ms": round(segment.start * 1000),
                "end_ms": round(segment.end * 1000),
                "text": text,
            }
        )
        log_probabilities.append(segment.avg_logprob)

    mean_log_probability = (
        sum(log_probabilities) / len(log_probabilities) if log_probabilities else -10
    )

    return {
        "text": " ".join(segment["text"] for segment in segments),
        "language": info.language,
        "language_probability": info.language_probability,
        "duration_seconds": info.duration,
        "model": model_name,
        "segments": segments,
        "mean_log_probability": mean_log_probability,
    }


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/v1/transcriptions")
async def create_transcription(audio: UploadFile = File(...)) -> dict:
    if audio.content_type not in SUPPORTED_MEDIA_TYPES:
        raise HTTPException(status_code=422, detail="Unsupported audio media type")

    content = await audio.read(MAX_AUDIO_BYTES + 1)
    if not content or len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=422, detail="Audio must be at most 32 MiB")

    suffix = Path(audio.filename or "audio").suffix or ".audio"
    path = ""

    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as temporary:
            temporary.write(content)
            path = temporary.name

        result = transcribe(path, PRIMARY_MODEL_NAME)
        needs_fallback = (
            not result["text"]
            or result["language_probability"] < 0.70
            or result["mean_log_probability"] < -0.80
        )
        if needs_fallback:
            result = transcribe(path, FALLBACK_MODEL_NAME)

        result.pop("mean_log_probability", None)
        if not result["text"]:
            raise HTTPException(status_code=422, detail="No understandable speech detected")

        return result
    finally:
        if path:
            Path(path).unlink(missing_ok=True)
