import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Check, Copy } from 'lucide-react';
import { copyToClipboard } from '../utils/helpers';
import GlossaryMisses from '../components/Translation/GlossaryMisses';
import examples from './guide-examples.json';

/*
 * The guide the footer links to: what the glossary and the style guide are, and what they do
 * in each mode.
 *
 * Every field, row and JSON block comes from `guide-examples.json`. The backend's
 * `tests/unit/test_guide_examples.py` validates that file with `GlossaryEntry`, `StyleGuide` and
 * `V1TranslationRequest`, and checks its field lists against the models' own fields, so the page
 * cannot drift from `backend/llm_translate/services/glossary.py` and `style_guide.py`. This page's
 * test checks the page shows that JSON and that `toRequestGlossary` maps these rows to it.
 */

const SECTIONS = [
  { id: 'glossary', label: 'The glossary' },
  { id: 'example', label: 'A worked example' },
  { id: 'style-guide', label: 'The style guide' },
  { id: 'modes', label: 'Text and file mode' },
];
const SECTION_IDS = SECTIONS.map((section) => section.id);

const API_DOCS = 'https://github.com/samestrin/llm-translate/blob/main/docs/api.md';

const json = (value) => JSON.stringify(value, null, 2);

/** The section the reader is in, for the contents list. */
const useSectionInView = () => {
  const [active, setActive] = useState(SECTION_IDS[0]);

  useEffect(() => {
    // No IntersectionObserver (jsdom, an old browser): the first section stays marked.
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const first = SECTION_IDS.find((id) => visible.get(id));
        if (first) setActive(first);
      },
      // Below the sticky header, and only the top part of the viewport counts as "in view".
      // Pixels and percent only: the browser rejects any other unit in rootMargin.
      { rootMargin: '-80px 0px -55% 0px' },
    );
    for (const id of SECTION_IDS) {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, []);

  return active;
};

/** One JSON block: its place in the request or reply, the JSON, and a copy button that answers. */
const CodeBlock = ({ caption, name, testId, code }) => {
  const [state, setState] = useState('idle');
  const timer = useRef(null);

  // Leaving the page mid-feedback must not leave a timer behind.
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    const copied = await copyToClipboard(code);
    setState(copied ? 'copied' : 'failed');
    // Every copy gets its own two seconds, even when the last one is still showing.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2000);
  };

  return (
    <figure className="m-0 min-w-0 overflow-hidden rounded-md border border-line bg-surface-muted">
      <figcaption className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <code className="font-mono text-xs text-ink-muted">{caption}</code>
        <button
          type="button"
          className="button secondary small"
          onClick={copy}
          aria-label={`Copy the ${name}`}
        >
          {state === 'copied' ? <Check size={14} aria-hidden="true" /> : state === 'failed' ? (
            <AlertTriangle size={14} aria-hidden="true" />
          ) : (
            <Copy size={14} aria-hidden="true" />
          )}
          {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
        </button>
      </figcaption>
      <pre data-testid={testId} className="m-0 overflow-x-auto px-3 py-2 font-mono text-xs leading-relaxed text-ink">
        <code>{code}</code>
      </pre>
      <p role="status" className="visually-hidden">
        {state === 'copied' ? `Copied the ${name}` : state === 'failed' ? `Could not copy the ${name}` : ''}
      </p>
    </figure>
  );
};

/** The fields of one model: its label, its API name and what it does. */
const FieldList = ({ fields, showRequired = false }) => (
  <dl className="m-0 flex flex-col gap-3">
    {fields.map((field) => (
      <div key={field.key} className="border-l-2 border-line pl-3">
        <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-medium text-ink">
          {field.label}
          <code className="font-mono text-xs font-normal text-ink-muted">{field.key}</code>
          {showRequired && (
            <span
              className={
                field.required.startsWith('Required')
                  ? 'rounded-full bg-brand-soft px-2 text-xs font-normal text-brand'
                  : 'rounded-full border border-line px-2 text-xs font-normal text-ink-muted'
              }
            >
              {field.required}
            </span>
          )}
        </dt>
        <dd className="m-0 mt-1 text-sm text-ink-muted">{field.summary}</dd>
      </div>
    ))}
  </dl>
);

const Section = ({ id, title, children }) => (
  <section id={id} aria-labelledby={`${id}-heading`} className="panel flex scroll-mt-20 flex-col gap-3">
    <h2 id={`${id}-heading`} className="m-0 text-lg text-ink">{title}</h2>
    {children}
  </section>
);

const Step = ({ title, children }) => (
  <div className="flex flex-col gap-2">
    <h3 className="m-0 text-sm font-semibold text-ink">{title}</h3>
    {children}
  </div>
);

const Quote = ({ caption, text }) => (
  <figure className="m-0 rounded-md border border-line bg-surface-muted p-3">
    <figcaption className="text-xs text-ink-muted">{caption}</figcaption>
    <blockquote className="m-0 mt-1 text-sm text-ink">{text}</blockquote>
  </figure>
);

const Guide = () => {
  const active = useSectionInView();
  const { glossary, styleGuide } = examples;
  const example = glossary.example;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="m-0 text-xs font-medium uppercase tracking-wide text-brand">Guide</p>
        <h1 className="m-0 text-2xl text-ink md:text-3xl">Glossary and style guide</h1>
        <p className="m-0 max-w-prose text-ink-muted">
          Two optional fields that tell the model which terms to use and how the translation should read.
          Both are saved in this browser and go with every text translation.
        </p>
      </div>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[13rem_minmax(0,42rem)] lg:items-start lg:gap-8">
        <nav aria-label="On this page" className="lg:sticky lg:top-20">
          <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 lg:flex-col lg:gap-1">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active === section.id ? 'location' : undefined}
                  className={
                    active === section.id
                      ? 'text-sm font-semibold text-brand'
                      : 'text-sm text-ink-muted hover:text-brand'
                  }
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex min-w-0 flex-col gap-5">
          <Section id="glossary" title="What the glossary is">
            <p className="m-0 text-base text-ink-muted">
              A glossary is a list of terms the translation must use. Each row is one term: what to look for,
              what to write instead, an optional note, and a flag to keep the term as it is. With no rows, the
              model translates freely.
            </p>
            <FieldList fields={glossary.fields} showRequired />
            <Step title="When a term applies">
              <ul className="m-0 list-disc pl-5 text-base text-ink-muted">
                <li>
                  A row applies only when its source term occurs in the text, matched case-insensitively as a
                  substring: “cloud” also matches “CLOUDS”.
                </li>
                <li>The translation must then contain the term’s translation, in any capitalization.</li>
                <li>A keep-as-is term must appear exactly as written, capitalization included.</li>
                <li>
                  A row with no source term, or with no translation and not kept as is, is left out of the
                  request, so a half-typed row never fails a translation.
                </li>
              </ul>
            </Step>
          </Section>

          <Section id="example" title="A worked example">
            <p className="m-0 text-base text-ink-muted">
              English to Spanish, with two rows: one term to translate and one to keep.
            </p>
            <Step title="1. The text">
              <Quote caption={`${example.fromLang} → ${example.toLang}`} text={example.text} />
            </Step>
            <Step title="2. The rows you type">
              <div className="overflow-x-auto">
                <table aria-label="The example glossary rows" className="w-full border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-ink-muted">
                      <th scope="col" className="py-1 pr-3 font-medium">Source term</th>
                      <th scope="col" className="py-1 pr-3 font-medium">Translation</th>
                      <th scope="col" className="py-1 pr-3 font-medium">Note</th>
                      <th scope="col" className="py-1 font-medium">Keep as is</th>
                    </tr>
                  </thead>
                  <tbody>
                    {example.rows.map((row) => (
                      <tr key={row.sourceTerm} className="border-b border-line align-top last:border-0">
                        <td className="py-2 pr-3 font-medium text-ink">{row.sourceTerm}</td>
                        <td className="py-2 pr-3 text-ink">
                          {row.doNotTranslate ? <span className="text-ink-muted">Not needed</span> : row.targetTerm}
                        </td>
                        <td className="py-2 pr-3 text-ink-muted">{row.note || '—'}</td>
                        <td className="py-2 text-ink">{row.doNotTranslate ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Step>
            <Step title="3. The glossary the app sends">
              <CodeBlock caption="glossary" name="glossary JSON" testId="glossary-json" code={json(example.request)} />
            </Step>
            <Step title="4. What came back">
              <Quote caption="The translation the model returned" text={example.translation} />
              <CodeBlock
                caption="glossary_misses"
                name="glossary_misses JSON"
                testId="misses-json"
                code={json(example.misses)}
              />
              <GlossaryMisses misses={example.misses} />
              <p className="m-0 text-base text-ink-muted">
                The model wrote “tablero” instead of “Panel”, so the reply lists that term and what it expected.
                A miss is reported, never an error: the translation still comes back, and the page lists the
                terms to check. “LLM Translate” was kept as is and appears unchanged, so it is not a miss.
              </p>
            </Step>
          </Section>

          <Section id="style-guide" title="What the style guide is">
            <p className="m-0 text-base text-ink-muted">
              The style guide says how the translation should read, not which terms it uses. Every field is
              optional and free text; blank fields are left out of the prompt.
            </p>
            <FieldList fields={styleGuide.fields} />
            <Step title="The style guide the app sends">
              <CodeBlock
                caption="style_guide"
                name="style guide JSON"
                testId="style-guide-json"
                code={json(styleGuide.example)}
              />
            </Step>
            <p className="m-0 text-base text-ink-muted">
              With the glossary above, this asks for a friendly, informal translation for first-time users,
              addressed as “tú”.
            </p>
          </Section>

          <Section id="modes" title="Text mode and file mode">
            <div className="grid gap-4 md:grid-cols-2">
              <article aria-labelledby="text-mode-heading" className="flex flex-col gap-2 rounded-md border border-line p-3">
                <h3 id="text-mode-heading" className="m-0 text-sm font-semibold text-ink">Text mode</h3>
                <p className="m-0 text-base text-ink-muted">
                  The Glossary and style guide panel sits under the text box. What you type there is saved in
                  this browser and sent with every <code className="font-mono text-xs">/v1/translate</code> request.
                </p>
                <ul className="m-0 list-disc pl-5 text-base text-ink-muted">
                  <li>A term applies only when it occurs in the text you translate.</li>
                  <li>Terms the translation missed are listed under it.</li>
                  <li>Change a row or a field and the next translation uses it; a cached answer is not reused.</li>
                </ul>
              </article>
              <article aria-labelledby="file-mode-heading" className="flex flex-col gap-2 rounded-md border border-line p-3">
                <h3 id="file-mode-heading" className="m-0 text-sm font-semibold text-ink">File mode</h3>
                <p className="m-0 text-base text-ink-muted">
                  File mode does not take a glossary or style guide:{' '}
                  <code className="font-mono text-xs">/v1/translate/file</code> accepts the file, the two languages
                  and the review switch only, so the panel is not shown there.
                </p>
                <p className="m-0 text-base text-ink-muted">
                  Instead, a file of more than one segment is summarized first — its key terms and names, with the
                  translation to use for each — and every segment is sent with that summary and the segments
                  around it, so a name reads the same in every cue. Placeholders and the file’s structure are kept.
                </p>
              </article>
            </div>
            <p className="m-0 text-base text-ink-muted">The review pass is available in both modes.</p>
          </Section>

          <div className="panel flex flex-wrap items-center justify-between gap-3">
            <Link to="/" className="button">
              Start translating
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a
              href={API_DOCS}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand underline-offset-4 hover:underline"
            >
              The same fields over the HTTP API →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Guide;
