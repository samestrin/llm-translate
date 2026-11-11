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
const swapHint = (sourceLang, targetLang) => {
  if (sourceLang === 'Auto-detect') return 'Pick the source language to swap';
  if (sourceLang === targetLang) return 'The two languages are the same';
  return 'Swap languages and text';
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
}) => (
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
        <Tooltip content={swapHint(sourceLang, targetLang)}>
          {/* A disabled button gets no pointer events; the span keeps the tooltip working. */}
          <span>
            <IconButton
              onClick={swapLanguages}
              aria-label="Swap languages and text"
              disabled={isLoading || !canSwap(sourceLang, targetLang)}
            >
              <SwapHorizIcon className="md:rotate-0 max-md:rotate-90" />
            </IconButton>
          </span>
        </Tooltip>
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

export default React.memo(TranslationForm);
