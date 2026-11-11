# Evaluation

The eval set ([`evals/`](../evals/), sources and licenses in [`evals/SOURCES.md`](../evals/SOURCES.md)) holds app strings, a Markdown page and an SRT file per language, each with a reference translation. `python evals/run.py --api <endpoint>` translates all three with `review` off and on and scores the result; the table below is the committed run, `evals/results/2026-11-05.json`, on **deepseek-v4.1-flash**.

| Language | Review | chrF | Placeholders | Glossary | Flag rate | Tokens |
|---|---|---|---|---|---|---|
| es | off | 81.6 | 100% | 3/3 | n/a | 27875 |
| es | on | 80.8 | 100% | 3/3 | 0% | 133945 |
| fr | off | 79.0 | 100% | 3/3 | n/a | 33374 |
| fr | on | 78.8 | 100% | 2/3 | 0% | 176409 |
| ja | off | 72.1 | 100% | 3/3 | n/a | 32160 |
| ja | on | 70.8 | 100% | 3/3 | 1% | 184343 |
| pt-BR | off | 82.4 | 100% | 3/3 | n/a | 30106 |
| pt-BR | on | 83.0 | 100% | 3/3 | 0% | 133290 |

* **chrF** is `sacrebleu` chrF (0-100) against the reference translation.
* **Placeholders** is the share of app strings whose placeholders (`{name}`, `%d`, `${x}`) survived unchanged.
* **Glossary** is glossary terms the translation kept, out of the terms present.
* **Flag rate** is review flags per segment (`n/a` with review off). **Tokens** is everything spent, so review costs about 4-6x the tokens of the plain run here.

The numbers are for one model on a small set. They show the pipeline keeps placeholders and glossary terms, not that any language is perfect; see [`evals/README.md`](../evals/README.md) for how to reproduce them.
