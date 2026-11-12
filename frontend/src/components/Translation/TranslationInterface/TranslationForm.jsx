import React from 'react';
import { IconButton } from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LanguageSelector from '../LanguageSelector';
import TextArea from '../TextArea';
import TranslationError from '../TranslationError';
import TranslationControls from './TranslationControls';
import { Tooltip } from '../../UI/Tooltip';
import { canSwap } from '../../../hooks/useTranslation.jsx';

// What the swap button's tooltip says: what it does, or why it cannot.
const swapHint = (sourceLang, targetLang, detectedLang) => {
  if (sourceLang === 'Auto-detect' && !detectedLang) return 'Translate first, or pick a source language.';
  if (!canSwap(sourceLang, targetLang, detectedLang)) return 'The two languages are the same';
  return 'Swap languages and text';
};

// An outlined icon button in the family tokens: the teal accent, the pickers' radius and
// 40 px height, a visible hover (the focus ring comes from theme.css), and the family's
// neutral disabled state — clearly faded next to the teal outline, never a faded primary.
const swapButtonSx = {
  width: 40,
  height: 40,
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-accent)',
  backgroundColor: 'var(--color-surface)',
  color: 'var(--color-accent)',
  '&:hover': {
    backgroundColor: 'var(--color-accent-subtle)',
    borderColor: 'var(--color-accent-hover)',
    color: 'var(--color-accent-hover)',
  },
  '&.Mui-disabled': {
    backgroundColor: 'var(--color-disabled)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-on-disabled)',
  },
};

/**
 * The two language pickers with one swap button between them, the text and its translation
 * side by side (stacked on a phone), then the actions.
 */
const TranslationForm = ({
  sourceText,
  handleTextChange,
  translatedText,
  sourceLang,
  setSourceLang,
  detectedLang,
  targetLang,
  setTargetLang,
  swapLanguages,
  isLoading,
  serviceInfo,
  error,
  onClear,
  // Controls props
  onTranslate,
  onCopy,
  onSpeak,
  onDownload,
  onKeyboardShortcuts,
  isSpeakingLoading,
  isAudioPlaying,
  speakError,
  canSpeak
}) => {
  const swappable = canSwap(sourceLang, targetLang, detectedLang);
  const hint = swapHint(sourceLang, targetLang, detectedLang);
  return (
    <fieldset className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
      <legend className="hidden">Translation Interface</legend>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end md:gap-3">
        <LanguageSelector
          selected={sourceLang}
          onChange={setSourceLang}
          label="Translate From:"
          id="source-lang"
          disabled={isLoading}
        />
        <div className="flex justify-center">
          <Tooltip content={hint}>
            {/* A disabled button gets no pointer events; the span keeps the tooltip working. */}
            <span>
              <IconButton
                onClick={swapLanguages}
                aria-label="Swap languages"
                aria-describedby={swappable ? undefined : 'swap-hint'}
                disabled={isLoading || !swappable}
                sx={swapButtonSx}
              >
                <SwapHorizIcon className="md:rotate-0 max-md:rotate-90" />
              </IconButton>
            </span>
          </Tooltip>
          {/* The disabled reason for screen readers; the tooltip shows the same text. */}
          {!swappable && <span id="swap-hint" className="visually-hidden">{hint}</span>}
        </div>
        <LanguageSelector
          selected={targetLang}
          onChange={setTargetLang}
          label="Translate To:"
          id="target-lang"
          disabled={isLoading}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextArea
          value={sourceText}
          onChange={handleTextChange}
          placeholder="Enter text to translate..."
          label=""
          ariaLabel="Text to translate"
          id="source-text"
          onClear={onClear}
          maxLength={1024}
          autoFocus
          ariaDescribedBy="source-text-description"
          className="static-textarea"
        />
        <div className="flex min-w-0 flex-col gap-1">
          <TextArea
            value={translatedText}
            placeholder="Translation will appear here..."
            label=""
            ariaLabel="Translation"
            id="translated-text"
            readOnly
            ariaDescribedBy="translation-info"
            className="static-textarea"
          />
          {serviceInfo?.model && (
            <p id="translation-info" className="m-0 text-xs text-ink-muted">
              Translated with {serviceInfo.model}
            </p>
          )}
        </div>
      </div>

      <TranslationControls
        onTranslate={onTranslate}
        onCopy={onCopy}
        onSpeak={onSpeak}
        onDownload={onDownload}
        onKeyboardShortcuts={onKeyboardShortcuts}
        isLoading={isLoading}
        sourceText={sourceText}
        translatedText={translatedText}
        isSpeakingLoading={isSpeakingLoading}
        isAudioPlaying={isAudioPlaying}
        speakError={speakError}
        canSpeak={canSpeak}
      />

      {/* Error, with a retry */}
      {error && <TranslationError error={error} onRetry={onTranslate} disabled={isLoading} />}
    </fieldset>
  );
};

export default React.memo(TranslationForm);
