# Vision

`llm-translate` exists so that teams can translate real content, from app strings to subtitles to documents, with the consistency and review a professional localizer would expect.
It serves developers and small teams who localize apps, sites and media, and people who need a careful translation of a document.
It turns source content and its context (glossary, style guide, the whole document) into a translation that keeps the file's format, with the lines that need a human marked.
It owns exactly one thing: high-quality, reviewable translation of content in its original format.

## Two ways in: the page and the API

A single web page is the front door: paste text or drop a file, pick the languages, and get the translation with its flagged lines.
A documented HTTP API does everything the page does, so an app, a build step or a CI job can translate strings and files without the page.
The page uses only the public API, so the two never drift apart.
The API is described by OpenAPI, and the docs match what it does.

## Context, not sentences

A translation sees the whole document, not one sentence at a time.
A glossary keeps brand and product terms the same everywhere, and a style guide sets tone and formality.
The same source string in the same context always translates the same way.

## Formats stay intact

Markdown, HTML, SRT subtitles, and app language files (JSON, YAML, gettext PO) come back with the same structure, keys, placeholders and tags.
A placeholder such as `{name}` or `%s` is never translated, dropped or reordered in a way that breaks the app.
A file that cannot be kept intact is an error, not a damaged output.

## Reviewed, then flagged

A fast model translates; a reasoning model reviews: it checks meaning by translating back, scores errors by severity, and revises.
Lines it is not confident about are flagged for a human, with the reason.
A person can see which model translated, which reviewed, and what it cost.

## Nothing reports success when it did not succeed

This rule sits above every other rule here.
A failed model call, a broken placeholder or a skipped line is reported, never hidden in a file that looks complete.

## Any model, no lock-in

Models come from any OpenAI-compatible endpoint, local or cloud, set from the environment.
No vendor is special.
Text-to-speech of a translation stays an optional extra.

## Measured, not claimed

A committed test set of source files with reference translations is scored on every change to prompts or the review pass, and the README shows the score.

## Scope

It is not a translation memory server, a CAT tool, a content management system or a live chat translator.
It runs with one `docker compose up` and keeps files on the host it runs on.
It is a portfolio demo of how this should be built, so clarity of the code and the README matter as much as features.

A change aligns when it makes translations more consistent, formats safer, review more useful, the page or the API easier to use, or the project easier to run and understand.
A change should be resisted when it breaks a file format, hides a failure, ties the project to one vendor, or adds work that is not translating content.
