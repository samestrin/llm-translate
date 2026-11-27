# HTTP API

The backend's interactive API reference, at `/docs`, lists every route, with request and response schemas and examples; the OpenAPI schema at `/openapi.json` is the machine-readable specification. With the demo compose they are http://localhost:8000/docs and http://localhost:8000/openapi.json. The web app's footer "API" link opens the reference on the backend the app calls.

## Model access for a public demo

`GET /v1/presets` is public and returns `public_demo` plus each preset's `id`, `label` and `speech` flag. It never returns a provider base URL or credential.

All five model-calling routes—`/v1/translate`, `/v1/translate/file`, `/v1/speak` and the deprecated `/translate` and `/speak`—accept either:

- `X-Model-Preset: <preset-id>` with `X-Model-Key: <your-key>` for your own key; or
- `X-Demo-Code: <demo-code>` for a demo code, optionally with `X-Model-Preset: demo`.

Do not send both a key and a demo code. A key without a preset, an unknown preset, or a demo code with another preset is rejected. When `PUBLIC_DEMO=true`, omitting credentials is a 401; when it is false, an omitted credential uses the server's `LLM_*` and `TTS_*` configuration. Provider base URLs always come from the server's presets or `DEMO_GATEWAY_URL`, never from request headers. Credentials are used for the request only and are not stored in the translation cache.

A preset without a speech model returns HTTP 400 with error type `speech_not_available` rather than falling back to another provider. A rejected credential is reported as "The key was rejected by &lt;provider&gt;", a demo code whose budget is spent or that has expired as "This demo code is used up or expired", and an upstream 429 on your own key as "&lt;provider&gt; is rate limiting this key. Try again shortly." A demo code over its per-minute (rpm/tpm) limit is busy, not used up: HTTP 429 (`rate_limit_error`) with "This demo code is busy. Try again in a minute." and a `Retry-After` header (seconds) when the gateway sends one. Upstream response bodies are not exposed to callers.

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
