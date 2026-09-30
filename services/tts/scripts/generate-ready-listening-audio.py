"""Generate the bundled English word audio with the same Kokoro model as the TTS service.

Usage: python generate-ready-listening-audio.py MODEL.onnx VOICES.bin
Requires kokoro-onnx and ffmpeg. Model files stay outside the repository.
"""

import re
import subprocess
import sys
from pathlib import Path

import numpy as np
from kokoro_onnx import Kokoro


ROOT = Path(__file__).resolve().parents[3]
DECK = ROOT / "src/domain/ready-listening-words.ts"
OUTPUT = ROOT / "public/audio/kokoro"


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: generate-ready-listening-audio.py MODEL.onnx VOICES.bin")
    source = DECK.read_text(encoding="utf-8")
    rows = re.search(r"const READY_WORD_ROWS = `([^`]*)`", source)
    if rows is None:
        raise SystemExit("Ready word rows not found")
    cards = [(f"ready-{line.split('=')[0]}", line.split("=")[0]) for line in rows.group(1).splitlines()]
    if len(cards) != 50 or len(set(cards)) != 50:
        raise SystemExit(f"Expected 50 distinct ready words, found {len(cards)}")
    OUTPUT.mkdir(parents=True, exist_ok=True)
    kokoro = Kokoro(sys.argv[1], sys.argv[2])
    for index, (card_id, word) in enumerate(cards, start=1):
        samples, sample_rate = kokoro.create(word + ".", voice="af_heart", speed=1, lang="en-us")
        if sample_rate != 24_000 or not 0.2 < len(samples) / sample_rate < 5:
            raise RuntimeError(f"Unexpected audio for {word}: {len(samples)} samples at {sample_rate} Hz")
        output = OUTPUT / f"{card_id}.mp3"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "f32le", "-ar", str(sample_rate), "-ac", "1", "-i", "pipe:0", "-codec:a", "libmp3lame", "-b:a", "48k", str(output)],
            input=np.asarray(samples, dtype=np.float32).tobytes(),
            check=True,
        )
        if output.stat().st_size < 1_000:
            raise RuntimeError(f"Generated audio is too small: {output}")
        print(f"{index:02d}/50 {word}: {output.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    main()
