# Evals

The committed eval set (see `SOURCES.md`) and the runner that scores a model on it.

```bash
pip install -r backend/requirements.txt -r evals/requirements.txt

# Operator run: start the backend on the real endpoint (see backend/.env), then
python evals/run.py --api http://localhost:8000

# Proof of the code, no model: the in-process backend against backend/tests/fake_openai_server.py
python evals/run.py --fake
```

Per language it translates the app strings, the Markdown page and the SRT file with `review` off and on, and prints one table:

- **chrF**: `sacrebleu` chrF (0-100) against the reference translation, over all three files. The pin lives in `evals/requirements.txt`, not in the backend requirements.
- **Placeholders**: share of app strings with a placeholder (`{name}`, `%d`, `${x}`) whose translation keeps exactly the same ones.
- **Glossary**: glossary terms found in the Markdown page that the translation kept (`/v1/translate` with the language's `glossary.json`), as hits/terms.
- **Flag rate**: review flags per translated segment; `n/a` with review off.

The run writes `evals/results/<date>.json` with the model names and the numbers. It never holds the endpoint URL or key. CI runs `--fake` only (`--fake` results carry a `-fake` suffix and are not committed); the operator runs `--api` once against the real endpoint and commits the dated file.
