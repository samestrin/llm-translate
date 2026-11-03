import React, { useCallback, useId, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import LanguageSelector from './LanguageSelector';
import api from '../../services/api';
import { translatedFileName } from '../../utils/helpers';

// The extensions `/v1/translate/file` reads; the server decides, this only filters the picker.
const ACCEPT = '.json,.yaml,.yml,.po,.md,.markdown,.html,.htm,.srt';

const MIME_TYPES = {
  json: 'application/json',
  yaml: 'application/yaml',
  po: 'text/x-gettext-translation',
  markdown: 'text/markdown',
  html: 'text/html',
  srt: 'application/x-subrip',
};

const Report = ({ result }) => {
  const { usage } = result.report;
  const rows = [
    ['Format', 'report-format', result.format],
    ['Segments', 'report-segments', String(result.report.segments)],
    ['Model', 'report-model', result.report.model || 'none (no model was called)'],
    ['Tokens', 'report-tokens', `${usage.total_tokens} (${usage.prompt_tokens} prompt, ${usage.completion_tokens} completion)`],
  ];
  return (
    <section aria-label="Report" className="rounded-md border border-secondary-200 dark:border-secondary-700 p-4">
      <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
        Report
      </Typography>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {rows.map(([label, testId, value]) => (
          <React.Fragment key={testId}>
            <dt className="text-secondary-600 dark:text-secondary-400">{label}</dt>
            <dd data-testid={testId} className="break-words">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
};

/**
 * File mode: drop or choose a file, pick languages, translate it on `/v1/translate/file`,
 * then download the translated file and read the report.
 */
const FileTranslation = ({ sourceLang, setSourceLang, targetLang, setTargetLang }) => {
  const inputId = useId();
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const selectFile = useCallback((picked) => {
    if (!picked) return;
    setFile(picked);
    setResult(null);
    setError(null);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    selectFile(e.dataTransfer?.files?.[0]);
  }, [selectFile]);

  const handleTranslate = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      setResult(await api.translateFile({ file, fromLang: sourceLang, toLang: targetLang }));
    } catch (err) {
      setError({ message: err.message, segmentErrors: err.data?.error?.segment_errors || [] });
    } finally {
      setIsLoading(false);
    }
  }, [file, sourceLang, targetLang]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([result.content], { type: MIME_TYPES[result.format] || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = translatedFileName(file.name, result.to_lang);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [file, result]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        data-testid="file-drop-zone"
        onDragEnter={handleDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center ${
          isDragging
            ? 'border-primary-500 bg-primary-50 dark:bg-secondary-700'
            : 'border-secondary-300 dark:border-secondary-600'
        }`}
      >
        <UploadFileIcon aria-hidden="true" sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography>Drop a file here</Typography>
        <Typography variant="body2" className="text-secondary-600 dark:text-secondary-400">
          JSON, YAML, PO, Markdown, HTML or SRT
        </Typography>
        <Button component="label" htmlFor={inputId} variant="outlined" size="small">
          Choose a file
        </Button>
        <input
          id={inputId}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            selectFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {file && <Typography sx={{ fontWeight: 500, wordBreak: 'break-all' }}>{file.name}</Typography>}
      </div>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <LanguageSelector
          selected={sourceLang}
          onChange={setSourceLang}
          label="Translate From:"
          id="file-source-lang"
          disabled={isLoading}
        />
        <LanguageSelector
          selected={targetLang}
          onChange={setTargetLang}
          label="Translate To:"
          id="file-target-lang"
          disabled={isLoading}
        />
      </Box>

      <Button
        variant="contained"
        onClick={handleTranslate}
        disabled={!file || isLoading}
        startIcon={isLoading ? <CircularProgress size={16} color="inherit" /> : null}
      >
        {isLoading ? 'Translating…' : 'Translate file'}
      </Button>

      {error && (
        <Alert severity="error">
          {error.message}
          {error.segmentErrors.length > 0 && (
            <ul className="mt-1 list-disc pl-5">
              {error.segmentErrors.map((s) => (
                <li key={s.segment}>{s.message}</li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {result && (
        <>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
            Download
          </Button>
          <Report result={result} />
        </>
      )}
    </Box>
  );
};

export default FileTranslation;
