# HTTP API

The [interactive API reference](/api/docs) lists every route, with request and response schemas and examples. The [OpenAPI schema](/api/openapi.json) is the machine-readable specification.

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
