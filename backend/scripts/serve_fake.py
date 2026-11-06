"""
Serve the backend on port 8000 with its model endpoint pointed at the fake OpenAI server, for screenshots.

Nothing leaves the process and no key exists, so nothing secret can appear on screen.
Run from `backend/`: `python scripts/serve_fake.py`.
"""
import os
import sys
import threading
from pathlib import Path

import uvicorn

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from tests.fake_openai_server import FakeOpenAIServer  # noqa: E402

FAKE_PORT = 8765


def main() -> None:
    fake = FakeOpenAIServer(
        translation="Abre el panel para ver el historial de tus traducciones.", detected_language="English"
    )
    threading.Thread(
        target=uvicorn.run, args=(fake.app,), kwargs={"port": FAKE_PORT, "log_level": "warning"}, daemon=True
    ).start()
    os.environ.update({
        "LLM_BASE_URL": f"http://127.0.0.1:{FAKE_PORT}/v1",
        "LLM_API_KEY": "fake",
        "LLM_TRANSLATE_MODEL": "demo-model",
        "TTS_SOURCE": "openai",
    })
    uvicorn.run("main:app", port=8000, log_level="warning")


if __name__ == "__main__":
    main()
