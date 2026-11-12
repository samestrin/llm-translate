# The web app

The translation page at `http://localhost:3000` (with Docker Compose) is a React app in [`frontend/`](../frontend/). It talks to the backend's HTTP API ([api.md](api.md)) and shows the model that answered each translation. The [frontend README](../frontend/README.md) has its setup, settings and file layout.

## Features

**Translation**

- LLM-powered translations: context-aware translations in real time.
- Any OpenAI-compatible endpoint, including OpenAI, Groq and OpenRouter, chosen by the backend's `LLM_*` settings.
- 21 languages to translate between, and an Auto-detect option for the source language: start typing and the model identifies the input language.
- Whole files: JSON, YAML, PO, Markdown, HTML and SRT, with placeholders and structure kept.
- Glossary and style guide: keep terms consistent with a glossary (including terms never to translate), set tone, formality and audience, and see which glossary terms a translation missed. Both apply to text mode; file mode takes neither.
- An optional review pass that flags the segments a person should read.
- Spoken translations (beta). With a Kokoro speech model (`TTS_MODEL` containing `kokoro`) and no `TTS_VOICE`, each language gets its own voice: English `af_heart`, Spanish `ef_dora`, French `ff_siwis`, Italian `if_sara`, Portuguese `pf_dora`, Japanese `jf_alpha`, Chinese `zf_xiaobei`, Hindi `hf_alpha`, and `af_heart` for the rest. Other speech models read every language with one voice (`TTS_VOICE`, default `alloy`).

**Using the page**

- A light and a dark theme. The page follows your system until you pick one with the header button, which names what it does next ("Dark theme" or "Light theme"); your choice is saved in the browser.
- A responsive layout for desktops, tablets and phones (no horizontal scroll at 375 px).
- The target language starts as Spanish, so the English sample sentence (offered as a chip when the box is empty) does not come back unchanged.
- One swap button between the two language pickers swaps the languages and, when there is a translation, moves it into the input; the output starts empty. After an Auto-detect translation it swaps into the language the backend detected (shown in the reply as `detected_lang`); before any translation it is off and says why: "Translate first, or pick a source language." It is also off when both languages are the same. The button is an outlined teal icon button with a visible hover and focus, and a clearly faded disabled state.
- Copy to clipboard, download as a text file, and listen.
- Character limit indicators, so you stay within the limit (1024 characters in the text box).
- Keyboard shortcuts: `Ctrl`/`Cmd` + `Enter` translates, `Ctrl`/`Cmd` + `/` shows the shortcuts.
- Accessibility: ARIA labels and live regions for screen readers, a skip link, and one visible focus ring on every control.
- On load the page calls `GET /` once (no model call). A healthy backend shows nothing; an unreachable one shows a banner.

**The guide page**

- `/guide`, linked from the footer, explains the glossary (rows of source term, translation, an optional note and a keep-as-is flag) and the style guide (tone, formality, audience, notes), with a worked example: the rows you type, the JSON the app sends, and the `glossary_misses` a missing term reports. It also says how both apply to text mode and why file mode takes neither.
- Its examples come from one file, [`frontend/src/pages/guide-examples.json`](../frontend/src/pages/guide-examples.json): a backend test validates every glossary entry with `GlossaryEntry` and the worked example with `V1TranslationRequest`, and a frontend test checks `toRequestGlossary` maps the page's rows to that same JSON. The field lists are checked against the models' own fields, so the page cannot drift from the code.

**History**

- Your recent translations, saved in the browser: the last 50 are kept for quick reference and reuse, and can be searched and deleted.

## Design

The page uses the same design system as llm-pdf-chatbot: the tokens in [`frontend/src/theme.css`](../frontend/src/theme.css) (colours with `light-dark()`, type scale, spacing, radii, focus ring, buttons) and an MUI theme built from them ([`frontend/src/theme/muiTheme.js`](../frontend/src/theme/muiTheme.js)). LLM Translate's own accent is teal. Text colours pass WCAG AA (4.5:1) in both themes; `src/theme/tokens.test.js` checks every pair.

| Token | Light | Dark |
|---|---|---|
| `--color-accent` | `#0f766e` (5.47:1 on white) | `#5eead4` (11.78:1 on the dark surface) |
| `--color-accent-hover` | `#115e59` | `#99f6e4` |
| `--color-accent-subtle` | `#e6f4f2` (accent text on it: 4.84:1) | `#12302d` (accent text on it: 9.55:1) |
| `--color-primary` (button fill, white text) | `#0f766e` (5.47:1) | `#0f766e` (5.47:1) |

## Project structure

```plaintext
llm-translate/
├── backend/        # Python FastAPI backend application
│   ├── llm_translate/
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── main.py
│   └── README.md   # Backend specific documentation
├── frontend/       # React Vite frontend application
│   ├── e2e/        # Playwright tests
│   ├── public/
│   ├── scripts/    # screenshot.mjs: the README images
│   ├── src/
│   ├── .env.example
│   ├── Dockerfile
│   ├── index.html
│   └── README.md   # Frontend specific documentation
├── docs/           # These pages and the README images
├── evals/          # The eval set and runner
├── docker-compose.yml # Docker Compose configuration
└── README.md
```

The tree is a summary; depth is limited for brevity.
