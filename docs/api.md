# HTTP API

The backend is an HTTP API for translation and text-to-speech. The running backend lists every route, with request and response schemas, at `/docs` (for example `http://localhost:8000/docs`); the [backend README](../backend/README.md#api-documentation) has the full reference. The main routes:

* `POST /v1/translate`: For text translation; reports the model used and the tokens spent.
* `POST /v1/translate/file`: For translating a JSON, YAML, PO, Markdown, HTML or SRT file; returns the file with its structure and placeholders intact, plus a report (segments, model, tokens).
* `POST /v1/speak`: For generating speech from text.

The unversioned `/translate` and `/speak` still work with their original responses but are deprecated.

## Auto-detect

`from_lang` may be `Auto-detect`. The backend then asks the model for the language first (that call counts in `usage`) and reports the language it found in `detected_lang`, so a client can name the source afterwards — the web app's swap button uses it to translate back into the detected language. `from_lang` still echoes `Auto-detect`; `detected_lang` is absent when a named `from_lang` was sent.

```bash
curl -X POST "http://localhost:8000/v1/translate" \
-H "Content-Type: application/json" \
-d '{"text": "Hello, world!", "from_lang": "Auto-detect", "to_lang": "Spanish"}'
```

```json
{
  "translation": "¡Hola, mundo!",
  "from_lang": "Auto-detect",
  "detected_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 42, "completion_tokens": 6, "total_tokens": 48},
  "glossary_misses": [],
  "cached": false
}
```

The same example is on the `/docs` page. When the detected language is the target, the text comes back unchanged and `detected_lang` still names it; `model` and `usage` report the detection call.

## Glossary and style guide

`POST /v1/translate` takes two optional inputs that steer the translation:

* `glossary`: terms to keep consistent. Each entry has a `source_term`, the `target_term` to use, an optional `note` for the model, and `do_not_translate` (keep the term exactly as written; then no `target_term` is needed). An entry applies only when its source term occurs in the text, matched case-insensitively.
* `style_guide`: `tone`, `formality`, `audience` and free `notes`, all optional. The filled fields go into the prompt.

The response lists every applicable term the translation missed in `glossary_misses`, with the text it expected. A miss is reported, never an error, so check this list. Here the model wrote "tablero" instead of the glossary's "Panel":

```bash
curl -X POST "http://localhost:8000/v1/translate" \
-H "Content-Type: application/json" \
-d '{
  "text": "Open the Dashboard in LLM Translate to see your history.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "glossary": [
    {"source_term": "Dashboard", "target_term": "Panel", "note": "the home screen"},
    {"source_term": "LLM Translate", "do_not_translate": true}
  ],
  "style_guide": {
    "tone": "friendly",
    "formality": "informal",
    "audience": "first-time users",
    "notes": "Address the reader as tú."
  }
}'
```

```json
{
  "translation": "Abre el tablero de LLM Translate para ver tu historial.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 118, "completion_tokens": 14, "total_tokens": 132},
  "glossary_misses": [{"term": "Dashboard", "expected": "Panel"}],
  "cached": false
}
```

The same example is on the `/docs` page. The exact matching rules are in the [backend README](../backend/README.md#glossary-and-style-guide).

## The review pass

`POST /v1/translate` (JSON field) and `POST /v1/translate/file` (form field) take `review=off|on`, default `off`. With `on`, after the fast model has translated every segment:

1. Each segment's translation is **back-translated** into the source language on the fast (`translate`) tier.
2. A reasoning model (the `review` tier, set with `LLM_REVIEW_MODEL`) **reviews** the segment: it compares source, translation and back-translation and reports errors with a category (`meaning`, `terminology`, `fluency`, `style`, `format`) and a severity (`minor`, `major`, `critical`).
3. A segment with a major or critical error is **revised once** on the review tier, then back-translated and reviewed again. A segment still rated major or critical is **flagged** with the reason.

A flagged segment keeps its best translation — the revised text whenever a revision ran and kept its placeholders, even when the second review still flags the segment, as in the example below; the earlier translation only when the revision came back empty or lost or changed a placeholder (the flag says which) — and does not fail the request; if a review model call itself fails (timeout, connection, HTTP error), the request fails as for the translation step. Review is advice for a human, not a gate: read every flag and judge the translation yourself. Reasons from the review model are model-written text, so treat them as a starting hint, not a verdict. Some flags instead start with a fixed prefix the pipeline writes itself — `review could not be read` and `revision lost or changed a placeholder; the earlier translation is kept` (these two are whole fixed messages with no detail), or `revision came back empty` and `still wrong after revision` (these two are prefixes followed by the model's error detail).

The reply gains a `review` report (`report.review` for files). `flags` lists every segment that needs a human: `segment` (number from 1, or the key for JSON, YAML and PO files), `reason`, `severity` (the highest error the reason names, `major` or `critical`; `null` for a fixed pipeline message such as `review could not be read`), and the segment's `source` and `translation` (its best translation, as in the reply), so a client can show the flagged text without re-splitting the document. `steps` gives the model and the tokens spent per step kind — each entry sums every call of that kind, so a revised segment runs back-translation and review twice and those two entries cover both calls; `usage` sums them, and the top-level `usage` includes the review calls. Cost is reported as tokens (prompt, completion, total) with no money figure. Example (`review=on`, one segment flagged):

```json
{
  "translation": "Abra el tablero.",
  "from_lang": "English",
  "to_lang": "Spanish",
  "model": "gpt-4o-mini",
  "usage": {"prompt_tokens": 460, "completion_tokens": 210, "total_tokens": 670},
  "glossary_misses": [],
  "cached": false,
  "review": {
    "flags": [
      {
        "segment": 1,
        "reason": "still wrong after revision: major meaning error: \"open\" rendered as \"abrir\" loses the UI-imperative sense",
        "severity": "major",
        "source": "Open the dashboard.",
        "translation": "Abra el tablero."
      }
    ],
    "steps": [
      {"step": "translation", "model": "gpt-4o-mini", "usage": {"prompt_tokens": 118, "completion_tokens": 14, "total_tokens": 132}},
      {"step": "back_translation", "model": "gpt-4o-mini", "usage": {"prompt_tokens": 96, "completion_tokens": 30, "total_tokens": 126}},
      {"step": "review", "model": "o4-mini", "usage": {"prompt_tokens": 180, "completion_tokens": 120, "total_tokens": 300}},
      {"step": "revision", "model": "o4-mini", "usage": {"prompt_tokens": 66, "completion_tokens": 46, "total_tokens": 112}}
    ],
    "usage": {"prompt_tokens": 460, "completion_tokens": 210, "total_tokens": 670}
  }
}
```

Reading this report: review added three step kinds (back-translation, review, revision) and 538 tokens on top of the translation; the flagged segment ran back-translation and review twice, so those two entries each sum two calls; the revision step ran, so a serious error was found, and its flag means the second review still rated the segment major or critical — a human should check segment 1 before shipping it.

Review multiplies the model calls per segment: a back-translation and a review for every segment (roughly 2-3x the translation cost in tokens), plus a revision and a second back-translation and review for each segment with a serious error. Turn it on when a human check matters; leave it off for cheap bulk translation.

## Translate a file

`POST /v1/translate/file` takes the file as a form upload; the extension names the format. The reply holds the translated file in `content` and a `report` (with `review=on` the report also carries the review section described above):

```bash
curl -X POST "http://localhost:8000/v1/translate/file" \
-F "file=@messages.json" \
-F "from_lang=English" \
-F "to_lang=Spanish"
```

With `messages.json` containing `{"greeting": "Hello, {name}!", "save": "Save"}`, the response is:

```json
{
  "content": "{\n  \"greeting\": \"¡Hola, {name}!\",\n  \"save\": \"Guardar\"\n}",
  "format": "json",
  "from_lang": "English",
  "to_lang": "Spanish",
  "report": {
    "segments": 2,
    "model": "gpt-4o-mini",
    "usage": {"prompt_tokens": 120, "completion_tokens": 18, "total_tokens": 138}
  }
}
```

Keys and the `{name}` placeholder are kept; only the values are translated.

## Translate an i18n file in CI

This GitHub Actions job translates `locales/en.json` into Spanish on every push and fails if the API returns an error. It needs a running instance (here the `LLM_TRANSLATE_URL` repository variable) and `jq`, which the runner already has:

```yaml
name: translate-locales
on: push
jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Translate locales/en.json to Spanish
        env:
          LLM_TRANSLATE_URL: ${{ vars.LLM_TRANSLATE_URL }}
        run: |
          curl --fail-with-body -sS -X POST "$LLM_TRANSLATE_URL/v1/translate/file" \
            -F "file=@locales/en.json" -F "from_lang=English" -F "to_lang=Spanish" \
            | jq -r .content > locales/es.json
      - name: Fail on a malformed file
        run: jq empty locales/es.json
```
