# Eval set: sources and licenses

The eval set covers four languages: Spanish (`es`), French (`fr`), Japanese (`ja`) and Brazilian Portuguese (`pt-BR`). Each language folder holds three pairs of an English source (`*.en.*`) and a reference translation made by people (`*.<language>.*`), plus a glossary:

| Kind | Files | From |
| --- | --- | --- |
| App strings (JSON) | `strings.en.json`, `strings.<language>.json` | 33 Git messages from the VS Code language packs |
| Markdown page | `page.en.md`, `page.<language>.md` | The MDN Web Docs "Accessibility" page |
| Subtitles (SRT) | `subtitles.en.srt`, `subtitles.<language>.srt` | The Sintel open movie subtitles |
| Glossary | `glossary.json` | Written for this repo from the terms the references use |

There is no German set: the MDN German translation is retired, and the free German alternative (`progit/progit2-de`) is licensed for non-commercial use only. No file here is under a non-commercial or no-derivatives license.

Every file was fetched on 2026-11-05 from the pinned revision or URL in the table below. A test (`backend/tests/unit/test_eval_set.py`) fails if a file in `evals/` has no row here, or a row has no source or a license outside MIT, CC-BY-SA-2.5 and CC-BY-3.0.

## Licenses and attribution

- **MIT** (`microsoft/vscode-loc`): Visual Studio Code Localization Packs, Copyright (c) Microsoft Corporation. The full notice is at the end of this file.
- **CC-BY-SA-2.5** (MDN Web Docs): prose by [Mozilla Contributors](https://developer.mozilla.org/en-US/docs/MDN/Community), licensed under [Creative Commons Attribution-ShareAlike 2.5](https://creativecommons.org/licenses/by-sa/2.5/). The `page.*.md` files stay under that license, and so does any change made to them.
- **CC-BY-3.0** (Sintel): © copyright Blender Foundation | [durian.blender.org](https://durian.blender.org/), licensed under [Creative Commons Attribution 3.0](https://creativecommons.org/licenses/by/3.0/). The Durian project states that everything it published online is under that license ([durian.blender.org/sharing](https://durian.blender.org/sharing/)).
- **MIT** (this repo): the glossaries were written for this repo and are under its [`LICENSE`](../LICENSE). Single terms are taken from the reference files beside them.

## How the files were made

- **App strings.** The VS Code language packs store each Git message under its English text (`contents.bundle` in `vscode.git.i18n.json`). `strings.en.json` maps each chosen English message to itself and `strings.<language>.json` maps it to the pack's translation, the shape of a VS Code `bundle.l10n.json` file. The same 33 messages are used in every language: short labels, sentences, `{0}` placeholders, a `$(info)` icon, a Markdown link and line breaks.
- **Markdown page.** Each MDN translation records the English commit it was translated from (`l10n.sourceCommit` in its front matter). `page.en.md` is the English page at that commit, so the English source differs a little per language. Both files are unchanged copies, front matter and `{{...}}` macros included.
- **Subtitles.** `subtitles.en.srt` and the references are the Sintel subtitles with only two changes: Windows line endings became `\n`, and the Portuguese file was converted from Windows-1252 to UTF-8. The Portuguese file is labelled only "Português" on the Durian site; its wording is Brazilian ("Você", "Pega ele!"), so it is used for `pt-BR`. It also keeps its one typo ("não se meixa"). The Japanese file is `sintel_jp.srt` on the Blender download server, not on the Durian page.

## Files

| File | Source | License |
| --- | --- | --- |
| `es/strings.en.json` | English keys of [`vscode-language-pack-es/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-es/translations/extensions/vscode.git.i18n.json) | MIT |
| `es/strings.es.json` | Translations in [`vscode-language-pack-es/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-es/translations/extensions/vscode.git.i18n.json) | MIT |
| `es/page.en.md` | [`mdn/content` `files/en-us/web/accessibility/index.md` at `acebfb2b`](https://github.com/mdn/content/blob/acebfb2b738c2b3d7caf73607000f1aa4b4393d1/files/en-us/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `es/page.es.md` | [`mdn/translated-content` `files/es/web/accessibility/index.md`](https://github.com/mdn/translated-content/blob/e7764e3da08ae07e2da59d38eba3789ce9735587/files/es/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `es/subtitles.en.srt` | [Sintel English subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_en.srt) | CC-BY-3.0 |
| `es/subtitles.es.srt` | [Sintel Spanish subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_es.srt) | CC-BY-3.0 |
| `es/glossary.json` | Written for this repo; target terms from the `es` references | MIT |
| `fr/strings.en.json` | English keys of [`vscode-language-pack-fr/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-fr/translations/extensions/vscode.git.i18n.json) | MIT |
| `fr/strings.fr.json` | Translations in [`vscode-language-pack-fr/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-fr/translations/extensions/vscode.git.i18n.json) | MIT |
| `fr/page.en.md` | [`mdn/content` `files/en-us/web/accessibility/index.md` at `04158640`](https://github.com/mdn/content/blob/04158640487c17d515de8078c9307a2f906377d0/files/en-us/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `fr/page.fr.md` | [`mdn/translated-content` `files/fr/web/accessibility/index.md`](https://github.com/mdn/translated-content/blob/e7764e3da08ae07e2da59d38eba3789ce9735587/files/fr/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `fr/subtitles.en.srt` | [Sintel English subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_en.srt) | CC-BY-3.0 |
| `fr/subtitles.fr.srt` | [Sintel French subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_fr.srt) | CC-BY-3.0 |
| `fr/glossary.json` | Written for this repo; target terms from the `fr` references | MIT |
| `ja/strings.en.json` | English keys of [`vscode-language-pack-ja/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-ja/translations/extensions/vscode.git.i18n.json) | MIT |
| `ja/strings.ja.json` | Translations in [`vscode-language-pack-ja/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-ja/translations/extensions/vscode.git.i18n.json) | MIT |
| `ja/page.en.md` | [`mdn/content` `files/en-us/web/accessibility/index.md` at `a9c0161a`](https://github.com/mdn/content/blob/a9c0161a34ba218e7acf6cdf0e93cbc0c36065a1/files/en-us/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `ja/page.ja.md` | [`mdn/translated-content` `files/ja/web/accessibility/index.md`](https://github.com/mdn/translated-content/blob/e7764e3da08ae07e2da59d38eba3789ce9735587/files/ja/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `ja/subtitles.en.srt` | [Sintel English subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_en.srt) | CC-BY-3.0 |
| `ja/subtitles.ja.srt` | [Sintel Japanese subtitles](https://download.blender.org/durian/subs/sintel_jp.srt) (line endings converted) | CC-BY-3.0 |
| `ja/glossary.json` | Written for this repo; target terms from the `ja` references | MIT |
| `pt-BR/strings.en.json` | English keys of [`vscode-language-pack-pt-BR/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-pt-BR/translations/extensions/vscode.git.i18n.json) | MIT |
| `pt-BR/strings.pt-BR.json` | Translations in [`vscode-language-pack-pt-BR/translations/extensions/vscode.git.i18n.json`](https://github.com/microsoft/vscode-loc/blob/62d5443b567022539ba6e8565b0f43f5f6b3682b/i18n/vscode-language-pack-pt-BR/translations/extensions/vscode.git.i18n.json) | MIT |
| `pt-BR/page.en.md` | [`mdn/content` `files/en-us/web/accessibility/index.md` at `5f4dc8ee`](https://github.com/mdn/content/blob/5f4dc8ee228442ddf6831f5f4b8ffe37e5f2beb3/files/en-us/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `pt-BR/page.pt-BR.md` | [`mdn/translated-content` `files/pt-br/web/accessibility/index.md`](https://github.com/mdn/translated-content/blob/e7764e3da08ae07e2da59d38eba3789ce9735587/files/pt-br/web/accessibility/index.md) | CC-BY-SA-2.5 |
| `pt-BR/subtitles.en.srt` | [Sintel English subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_en.srt) | CC-BY-3.0 |
| `pt-BR/subtitles.pt-BR.srt` | [Sintel Portuguese subtitles](https://durian.blender.org/wp-content/content/subtitles/sintel_pt.srt) (converted to UTF-8) | CC-BY-3.0 |
| `pt-BR/glossary.json` | Written for this repo; target terms from the `pt-BR` references | MIT |

## MIT notice for `microsoft/vscode-loc`

```text
Visual Studio Code Localization Packs

Copyright (c) Microsoft Corporation

All rights reserved.

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE
```
