# Embassy review stack: https://translate.estr.in

A private copy of llm-translate on `embassy.lan` for the owner to review, behind Traefik and Authelia. Nothing on this host answers without the owner's Authelia login, the API included. The deploy path, the gateway routes and the login rule live in `fleet-deploy` (epic 3.1, `docs/review-stack.md`); this page covers what this repo provides.

## What runs

`docker-compose.embassy.yml`, project `llm-translate`, folder `~/docker/llm-translate/` on embassy:

| Container | Image | Role |
|---|---|---|
| `llm-translate-backend` | `llm-translate-backend:latest`, built on embassy from `backend/Dockerfile` | FastAPI on :8000. Health check `GET /` (`{"message": "llm-translate is running"}`) |
| `llm-translate-frontend` | `llm-translate-frontend:latest`, built on embassy from `frontend/Dockerfile` | nginx on :3000 serving the built page |

- No published host ports. Traefik reaches both containers by name over the external `proxy` network.
- No source bind-mounts, no volumes: the app keeps no state.
- No model server. The backend calls the fleet litellm on orchestrator (`orchestrator.lan:4000`) with its own key.
- Both images are built from the production Dockerfiles (`pull_policy: never`: an image that was never built fails, rather than sending compose to Docker Hub).

## Routes (Traefik, in fleet-deploy)

| Rule | Service | Notes |
|---|---|---|
| `Host(translate.estr.in) && PathPrefix(/api)` | `http://llm-translate-backend:8000` | strip the `/api` prefix: the backend serves `/v1/...` at the root. Health check path `/` |
| `Host(translate.estr.in)` | `http://llm-translate-frontend:3000` | everything else |

Both routers carry `authelia@docker`. The frontend is built with `VITE_API_URL=/api` (a build argument in the compose file), so the page calls the same origin: `/api/v1/translate` reaches the backend as `/v1/translate`, under the same login. The value is baked into the page when the image is built; setting it on embassy afterwards does nothing.

## `.env.embassy`

Lives only on embassy, in `~/docker/llm-translate/`, mode 600; never in git (`.gitignore` lists it), a card, a log or a comment. The deploy receiver refuses an archive that carries a `.env*` file. Only the backend reads it.

Set:

| Variable | What |
|---|---|
| `LLM_BASE_URL` | the fleet litellm's OpenAI-compatible base URL on `orchestrator.lan:4000` |
| `LLM_API_KEY` | this app's own litellm key (`key_alias` `review-llm-translate`) |
| `LLM_TRANSLATE_MODEL` | a model name the key may use |

Optional (defaults in `backend/.env.example`): `LLM_REVIEW_MODEL`, `LLM_TIMEOUT`, `LLM_MAX_CONCURRENCY`, `LLM_SEGMENT_MAX_CHARS`, `LLM_MAX_SEGMENTS`, `LLM_SRT_MAX_LINE_CHARS`, `LLM_CACHE_SIZE`, `LOG_LEVEL`, and for speech `TTS_MODEL`, `TTS_VOICE`, `TTS_FORMATS`, `TTS_TIMEOUT`.

Leave unset: `OPENAI_API_KEY`, `TTS_SOURCE`, `TTS_BASE_URL`, `TTS_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `AI_SOURCE`.

**Speech.** With `TTS_SOURCE` unset, `POST /v1/speak` uses the same `LLM_BASE_URL` and `LLM_API_KEY` as translation (`backend/llm_translate/utils/config.py`, `load_tts_settings`), so any speech spend stays on this app's litellm key and no OpenAI key is on the host. If litellm serves no speech model under `TTS_MODEL` (default `gpt-4o-mini-tts`), speech fails closed: the route returns an error and nothing falls back to another provider.

## Check

The real `.env.embassy` is only on embassy, so check the file with an empty placeholder:

```bash
touch .env.embassy
docker compose -f docker-compose.embassy.yml config --quiet
docker compose -f docker-compose.embassy.yml config --format json \
  | python scripts/check_embassy_compose.py docker-compose.embassy.yml
rm .env.embassy
```

The second command fails if a service publishes a host port, mounts anything, runs a model server, or drops `restart: unless-stopped`, the `proxy` network, `.env.embassy` or the frontend's `/api` base URL. CI runs both (job `embassy-compose`).

## Deploy and rollback

Deploys go through fleet-deploy's receiver (target kind `embassy-compose`) from a "Deploy llm-translate `<sha>`?" card: it copies the repo at that commit into `~/docker/llm-translate/` (keeping `.env.embassy`), tags the running image `:rollback`, builds, starts the stack, waits for the health check and puts the old image back if the new one is unhealthy. Nothing in this repo deploys, and no agent connects to embassy.

By hand, an operator on embassy rolls back with:

```bash
cd ~/docker/llm-translate && docker tag llm-translate-backend:rollback llm-translate-backend:latest && docker compose -f docker-compose.embassy.yml up -d
```

(the same with `llm-translate-frontend` for the page).
