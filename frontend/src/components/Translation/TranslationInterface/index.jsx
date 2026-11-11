import React, { useEffect, useRef, useState, useCallback, useMemo, useTransition } from 'react';
import { useSettings } from '../../../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { debounce } from '../../../utils/helpers';

// Import the refactored components
import TranslationForm from './TranslationForm';
import TranslationControls from './TranslationControls';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import Modal from '../../UI/Modal';
import TranslationOptions from '../TranslationOptions';
import GlossaryMisses from '../GlossaryMisses';
import ReviewReport from '../ReviewReport';
import EmptyState from '../EmptyState';
import StatusMessage from '../StatusMessage';
import { downloadText } from '../download';
import { translatedFileName } from '../../../utils/helpers';

// Receive props from Home component
const TranslationInterface = ({
  sourceText,
  setSourceText,
  translatedText,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  isLoading,
  error,
  serviceInfo,
  options,
  setOptions,
  glossaryMisses,
  review,
  reviewResult,
  translate,
  clearTranslation,
  swapLanguages,
  translationInitiated,
  handleSpeak,
  // Add these props from useTranslation
  isSpeakingLoading,
  isAudioPlaying,
  speakError,
  canSpeak,
  hasShownTTSNotice,
  setHasShownTTSNotice,
}) => {
  const isInitialMount = useRef(true); // Specific to this component's first render UI logic
  const prevHasShownTTSNoticeRef = useRef(false); // Add this ref to track previous state
  
  // Add useTransition hook for non-urgent UI updates
  const [, startTransition] = useTransition();
  
  const { settings } = useSettings();
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showTTSNotice, setShowTTSNotice] = useState(false);
  
  // Memoize character count calculation
  const memoizedCharacterCount = useMemo(() => {
    return sourceText?.length || 0;
  }, [sourceText]);
  
  useEffect(() => {
    console.log('TranslationInterface mounted/updated. Source text length:', sourceText?.length);
  }, [memoizedCharacterCount]);
  
  const debouncedTranslate = useCallback(
    debounce(async (text) => { // Make sure to use async if translate is async
      // translationInitiated is managed by useTranslation, set when user types or clicks translate.
      // isInitialMount is for this component's own rendering logic.
      if (isInitialMount.current || !translationInitiated.current) {
        console.log('Debounced: Skipping auto-translation: initial mount or no user action that initiated translation.');
        return;
      }
      
      if (text.trim()) {
        console.log('Debounced: Auto-translation triggered by text change');
        try {
          await translate(); // translate itself checks for text
        } catch (err) {
          console.error('Debounced: Auto-translation error:', err);
          // Toasting error is likely handled within translate or its callers
        }
      }
    }, settings.autoTranslateDelay || 1000),
    [translate, settings.autoTranslateDelay, translationInitiated] 
  );

  const handleTextChange = useCallback((e) => {
    const newText = e.target.value;
    setSourceText(newText);
    
    // Set translationInitiated to true when user types.
    if (newText.trim() && translationInitiated && !translationInitiated.current) {
      translationInitiated.current = true;
      console.log('Translation initiated by typing in TranslationInterface.');
    }
    
    if (settings.autoTranslate && newText.trim() && translationInitiated && translationInitiated.current) {
      // Use startTransition to mark the translation as a non-urgent update
      startTransition(() => {
        console.log('Auto-translate will be called by debouncedTranslate (in transition)');
        debouncedTranslate(newText);
      });
    }
  }, [setSourceText, translationInitiated, settings.autoTranslate, debouncedTranslate]);

  // Mark initial mount as complete after first render of THIS component
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('TranslationInterface initial mount complete.');
      isInitialMount.current = false;
    }
  }, []);

  // Update the useEffect to only show the TTS notice when hasShownTTSNotice becomes true
  useEffect(() => {
    if (hasShownTTSNotice && !showTTSNotice) {
      // Only set to true when hasShownTTSNotice changes from false to true
      if (!prevHasShownTTSNoticeRef.current) {
        setShowTTSNotice(true);
      }
    }
    // Update the ref to track previous value
    prevHasShownTTSNoticeRef.current = hasShownTTSNotice;
  }, [hasShownTTSNotice, showTTSNotice]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      toast.error('Please enter text to translate');
      return;
    }
    
    // translationInitiated.current will be set to true within the translate() call in useTranslation
    console.log('Manual Translate button clicked in TranslationInterface');
    try {
      const result = await translate(); // translate() from useTranslation
      // translatedText state update will come from useTranslation
      if (result && result.translation) { // Check if translate returned a result with text
        toast.success('Translation completed!');
      } else if (!result && !isLoading && error) {
        // Error is already toasted by useTranslation or translate()
      } else if (!result && !isLoading && !error && sourceText.trim()){
        // This case might occur if translate() returns nothing due to API unavailability handled silently
      }
    } catch (err) {
      console.error("Error from handleTranslate in TranslationInterface:", err);
    }
  }, [sourceText, translate, isLoading, error]);

  const handleCopy = useCallback(() => {
    toast.success('Copied to clipboard!');
  }, []);

  const handleDownload = useCallback(() => {
    downloadText(translatedText, translatedFileName('translation.txt', targetLang));
  }, [translatedText, targetLang]);

  // Fills the box and moves focus to it, which also moves it off the example button as that goes away.
  const handleExample = useCallback((text) => {
    setSourceText(text);
    document.getElementById('source-text')?.focus();
  }, [setSourceText]);

  const isEmpty = !sourceText && !translatedText && !isLoading && !error;
  let status = '';
  if (isLoading) {
    status = `Translating your text into ${targetLang}${review ? ' and reviewing it. A review takes longer.' : '…'}`;
  } else if (translatedText && !error) {
    status = 'Translation ready.';
  }

  const toggleKeyboardShortcuts = useCallback(() => {
    setShowKeyboardShortcuts(prev => !prev);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + Enter to translate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isLoading && sourceText.trim() && !settings.autoTranslate) {
          handleTranslate();
          e.preventDefault();
        }
      }
      
      // Ctrl/Cmd + / to toggle keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        toggleKeyboardShortcuts();
        e.preventDefault();
      }
      
      // Escape to close keyboard shortcuts
      if (e.key === 'Escape' && showKeyboardShortcuts) {
        setShowKeyboardShortcuts(false);
        e.preventDefault();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, sourceText, settings.autoTranslate, handleTranslate, showKeyboardShortcuts, toggleKeyboardShortcuts]);

  console.log('showTTSNotice:', showTTSNotice); // Add this line before the Modal
  return (
    <div className="flex flex-col gap-3">
      {/* TTS Notice Modal */}
      <Modal
        isOpen={showTTSNotice}
        onClose={() => {
          setShowTTSNotice(false);
          // Add this line to notify parent/hook that the notice has been dismissed
          if (typeof setHasShownTTSNotice === 'function') {
            setHasShownTTSNotice(false);
          }
        }}
        title="About speech"
        description="A speech model reads the translation aloud."
        maxWidth="sm"
      >
        <div>
          <p>
            <a
              href="/tts-info"
              className="text-brand underline-offset-4 hover:underline"
              onClick={(e) => {
                e.preventDefault();
                setShowTTSNotice(false);
                if (typeof setHasShownTTSNotice === 'function') {
                  setHasShownTTSNotice(false);
                }
                // Navigate programmatically if needed
                // navigate('/tts-info');
              }}
            >
              How speech handles other languages →
            </a>
          </p>
        </div>
      </Modal>

      {isEmpty && <EmptyState onExample={handleExample} />}

      {/* Form component for source/target lang selectors and text areas */}
      <TranslationForm 
        sourceText={sourceText}
        handleTextChange={handleTextChange}
        translatedText={translatedText}
        sourceLang={sourceLang}
        setSourceLang={setSourceLang}
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        swapLanguages={swapLanguages}
        isLoading={isLoading}
        serviceInfo={serviceInfo}
        error={error}
        onClear={clearTranslation}
        // Pass controls props
        onTranslate={handleTranslate}
        onCopy={handleCopy}
        onSpeak={handleSpeak}
        onDownload={handleDownload}
        onKeyboardShortcuts={toggleKeyboardShortcuts}
        isSpeakingLoading={isSpeakingLoading}
        isAudioPlaying={isAudioPlaying}
        speakError={speakError}
        canSpeak={canSpeak}
      />
      <StatusMessage message={status} busy={isLoading} />
      <GlossaryMisses misses={glossaryMisses} />
      {reviewResult && <ReviewReport report={reviewResult.report} />}
      <TranslationOptions options={options} setOptions={setOptions} />
      {showKeyboardShortcuts && (
        <KeyboardShortcutsModal
          open={showKeyboardShortcuts}
          onClose={toggleKeyboardShortcuts}
        />
      )}
    </div>
  );
};

export default React.memo(TranslationInterface);

