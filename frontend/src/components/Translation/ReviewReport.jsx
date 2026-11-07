import React from 'react';
import { Box, Typography } from '@mui/material';

const STEP_LABELS = {
  translation: 'Translation',
  back_translation: 'Back-translation',
  review: 'Review',
  revision: 'Revision',
};

const SEVERITY_CLASSES = {
  critical: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100',
  major: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100',
  minor: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-100',
  none: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-700 dark:text-secondary-100',
};

const tokens = (usage) =>
  `${usage.total_tokens} (${usage.prompt_tokens} prompt, ${usage.completion_tokens} completion)`;

const segmentName = (segment) => (typeof segment === 'number' ? `Segment ${segment}` : segment);

const Flag = ({ flag }) => {
  const { severity } = flag;
  return (
    <li className="rounded border border-secondary-200 dark:border-secondary-700 p-3">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="font-medium break-all">{segmentName(flag.segment)}</span>
        <span data-testid="flag-severity" className={`rounded px-2 text-xs font-semibold ${SEVERITY_CLASSES[severity || 'none']}`}>
          {severity || 'not rated'}
        </span>
      </div>
      <p data-testid="flag-reason" className="text-sm mb-2 break-words">{flag.reason}</p>
      {/* MUI breakpoints for the two-column layout */}
      <Box className="text-sm" sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        <div className="min-w-0">
          <p className="text-xs text-secondary-600 dark:text-secondary-400">Source</p>
          <p data-testid="flag-source" className="whitespace-pre-wrap break-words">{flag.source}</p>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-secondary-600 dark:text-secondary-400">Translation</p>
          <p data-testid="flag-translation" className="whitespace-pre-wrap break-words">{flag.translation}</p>
        </div>
      </Box>
    </li>
  );
};

/**
 * The review report of a `review=on` reply: each flagged segment with its severity and
 * reason beside its source and translation, all as the backend sends them in the flag,
 * then the model and tokens of every step. Review is advice for a human, not a gate.
 * @param {Object} props
 * @param {Object} props.report - `review` of `/v1/translate`, or `report.review` of `/v1/translate/file`
 */
const ReviewReport = ({ report }) => (
  <section aria-label="Review" className="rounded-md border border-secondary-200 dark:border-secondary-700 p-4">
    <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
      Review
    </Typography>
    {report.flags.length ? (
      <ul aria-label="Flagged segments" className="flex flex-col gap-2 mb-3">
        {report.flags.map((flag) => (
          <Flag key={String(flag.segment)} flag={flag} />
        ))}
      </ul>
    ) : (
      <p className="text-sm mb-3">No segment was flagged.</p>
    )}
    <div className="overflow-x-auto">
      <table aria-label="Models and cost" className="w-full text-sm text-left">
        <thead className="text-secondary-600 dark:text-secondary-400">
          <tr>
            <th className="pr-4 font-normal">Step</th>
            <th className="pr-4 font-normal">Model</th>
            <th className="font-normal">Tokens</th>
          </tr>
        </thead>
        <tbody>
          {report.steps.map((step) => (
            <tr key={step.step}>
              <td className="pr-4">{STEP_LABELS[step.step] || step.step}</td>
              <td className="pr-4 break-all">{step.model || 'none'}</td>
              <td>{tokens(step.usage)}</td>
            </tr>
          ))}
          <tr className="font-medium">
            <td className="pr-4">Total</td>
            <td className="pr-4"></td>
            <td>{tokens(report.usage)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
);

export default ReviewReport;
