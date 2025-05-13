import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowRightLeft, Languages, Sparkles } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import TextArea from './TextArea';
import CopyButton from './CopyButton';
import Spinner from '../UI/Spinner';
import ErrorMessage from '../UI/ErrorMessage';
import { useSettings } from '../../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { debounce } from '../../utils/helpers';
import { Tooltip } from '../UI/Tooltip';
import { Fieldset, Legend } from '@headlessui/react';

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
  translate,
  clearTranslation,
  swapLanguages,
  translationInitiated, // This ref is now passed from useTranslation via Home
  // apiAvailable, // (if needed directly, but translate handles it)
}) => {
  const isInitialMount = useRef(true); // Specific to this component's first render UI logic
  
  const { settings } = useSettings();
  const translateButtonRef = useRef(null);
  // Character count can remain local to this component as it's purely UI for the source text area
  const [characterCount, setCharacterCount] = useState(0); 
  
  useEffect(() => {
    console.log('TranslationInterface mounted/updated. Source text length:', sourceText?.length);
     // If sourceText is undefined on first render (if not initialized in useTranslation), default to 0
    setCharacterCount(sourceText?.length || 0);
  }, [sourceText]);
  
  const debouncedTranslate = useCallback(
    debounce(async (text) => { // Make sure to use async if translate is async
      // translationInitiated is managed by useTranslation, set when user types or clicks translate.
      // isInitialMount is for this component's own rendering logic.
      if (isInitialMount.current || !translationInitiated.current) {
        console.log('Debounced: Skipping auto-translation: initial mount or no user action that initiated translation.');
        // isInitialMount.current = false; // This should be handled in its own useEffect
        return;
      }
      
      if (text.trim()) {
        console.log('Debounced: Auto-translation triggered by text change');
        try {
          await translate(); // translate itself now checks for text and apiAvailable
        } catch (err) {
          console.error('Debounced: Auto-translation error:', err);
          // Toasting error is likely handled within translate or its callers
        }
      }
    }, settings.autoTranslateDelay || 1000),
    [translate, settings.autoTranslateDelay, translationInitiated] // Add translationInitiated here
  );

  const handleTextChange = (e) => {
    const newText = e.target.value;
    setSourceText(newText); // This will trigger the useEffect for characterCount
    
    // Set translationInitiated to true when user types.
    // This is now primarily handled in useTranslation when sourceText changes or translate is called.
    // However, it's good to ensure it's set here as well upon first meaningful interaction.
    if (newText.trim() && translationInitiated && !translationInitiated.current) {
      translationInitiated.current = true;
      console.log('Translation initiated by typing in TranslationInterface.');
    }
    
    if (settings.autoTranslate && newText.trim() && translationInitiated && translationInitiated.current) {
      // We don't need !isInitialMount.current here anymore because debouncedTranslate checks it.
      console.log('Auto-translate will be called by debouncedTranslate');
      debouncedTranslate(newText);
    }
  };

  // Mark initial mount as complete after first render of THIS component
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('TranslationInterface initial mount complete.');
      isInitialMount.current = false;
    }
  }, []);

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error('Please enter text to translate');
      return;
    }
    
    // translationInitiated.current will be set to true within the translate() call in useTranslation
    console.log('Manual Translate button clicked in TranslationInterface');
    try {
      const result = await translate(); // translate() from useTranslation
      // translatedText state update will come from useTranslation
      if (result && result.translated_text) { // Check if translate returned a result with text
        toast.success('Translation completed!');
      } else if (!result && !isLoading && error) {
        // If translate didn't return a result, but we are not loading and there's an error message from useTranslation
        // toast.error(error || 'Translation failed'); // Error is already toasted by useTranslation or translate()
      } else if (!result && !isLoading && !error && sourceText.trim()){
        // This case might occur if translate() returns nothing due to API unavailability handled silently
        // Or if the 'Please enter text...' condition was met previously
        // toast.error('Translation could not be completed.');
      }
    } catch (err) {
      // Errors should be caught and toasted within useTranslation's translate function
      // or by the caller if translate re-throws. Here, we can ensure a generic message if not already handled.
      // toast.error(err.message || 'Translation failed');
      console.error("Error from handleTranslate in TranslationInterface:", err);
    }
  };

  const handleCopy = () => {
    toast.success('Copied to clipboard!');
  };

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
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLoading, sourceText, settings.autoTranslate]);

  return (
    <div 
      className="w-[80%] max-w-6xl mx-auto animate-fade-in"
      role="region"
      aria-label="Translation interface"
    >
      {/* Stylish card with shadow and rounded corners */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-lg overflow-hidden transition-all duration-300 border border-secondary-100 dark:border-secondary-700">
        {/* Card header with gradient background */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 dark:from-primary-700 dark:to-primary-800 p-4 flex justify-between items-center">
          <h2 className="text-white text-lg font-bold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary-100" />
            <span>Translator</span>
          </h2>
        </div>
        
        <div className="p-8">
          {/* Language selector bar with enhanced styling */}
          <Fieldset className="mb-6" disabled={isLoading}>
            <Legend className="sr-only">Language Selection</Legend>
            <div className="flex flex-col md:flex-row gap-4 bg-secondary-50 dark:bg-secondary-900 p-4 rounded-lg data-disabled:opacity-70">
              <div className="flex-1">
                <LanguageSelector
                  selected={sourceLang}
                  onChange={setSourceLang}
                  label="Translate from"
                  id="source-language"
                  className="bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 rounded-md shadow-sm"
                />
              </div>
              
              <div className="flex items-center justify-center">
                <Tooltip content={`Swap languages (${sourceLang} ↔ ${targetLang})`}>
                  <button
                    onClick={swapLanguages}
                    className="p-3 rounded-full bg-white text-primary-700 hover:bg-primary-50 dark:bg-primary-900 dark:text-primary-100 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-md hover:shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 data-disabled:opacity-50 data-disabled:cursor-not-allowed"
                    aria-label={`Swap languages from ${sourceLang} to ${targetLang}`}
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                  </button>
                </Tooltip>
              </div>
              
              <div className="flex-1">
                <LanguageSelector
                  selected={targetLang}
                  onChange={setTargetLang}
                  label="Translate to"
                  id="target-language"
                  className="bg-white dark:bg-secondary-800 border-secondary-200 dark:border-secondary-700 rounded-md shadow-sm"
                />
              </div>
            </div>
          </Fieldset>

          {error && <ErrorMessage message={error} className="mb-4" />}

          {/* Enhanced text areas with better spacing and styling */}
          <Fieldset disabled={isLoading} className="grid grid-cols-1 md:grid-cols-2 gap-6 data-disabled:opacity-80">
            <Legend className="sr-only">Translation Text</Legend>
            <div className="transition-all duration-300 transform hover:shadow-md rounded-lg">
              {/* Use TextArea component for Source Text */}
              <TextArea
                id="source-text"
                label="Source Text"
                value={sourceText}
                onChange={handleTextChange}
                placeholder="Enter text to translate..."
                onClear={() => setSourceText('')}
                className="h-48 resize-y" 
              />
              <div id="source-text-description" className="sr-only">
                Enter the text you want to translate from {sourceLang} to {targetLang}
              </div>
            </div>

            <div className="transition-all duration-300 transform hover:shadow-md rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <label 
                  htmlFor="translated-text" 
                  className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 data-disabled:opacity-70"
                >
                  Translation
                </label>
                {translatedText && (
                  <CopyButton text={translatedText} onCopy={handleCopy} />
                )}
              </div>
              <div className="relative group">
                <textarea
                  id="translated-text"
                  value={translatedText}
                  readOnly
                  placeholder="Translation will appear here..."
                  className="w-full h-48 p-4 border border-secondary-200 dark:border-secondary-700 rounded-lg bg-white dark:bg-secondary-800 text-secondary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 placeholder-secondary-400 dark:placeholder-secondary-500 resize-y shadow-sm group-hover:border-primary-300 dark:group-hover:border-primary-600 data-disabled:cursor-not-allowed data-disabled:bg-secondary-50 data-disabled:dark:bg-secondary-900"
                  aria-live="polite"
                  aria-atomic="true"
                />
                {isLoading && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-secondary-800/90 rounded-lg backdrop-blur-sm transition-all duration-500"
                    aria-live="polite"
                  >
                    <div className="flex flex-col items-center">
                      <Spinner className="h-10 w-10 text-primary-600 dark:text-primary-400" />
                      <span className="mt-2 text-secondary-700 dark:text-secondary-300 animate-pulse">Translating...</span>
                    </div>
                  </div>
                )}
              </div>
              {serviceInfo.service_used && (
                <div className="text-xs text-secondary-500 dark:text-secondary-400 mt-2 italic bg-secondary-50 dark:bg-secondary-900 p-2 rounded-md">
                  Translated with {serviceInfo.service_used} ({serviceInfo.model_used})
                  {settings.aiProvider !== 'auto' && settings.aiProvider !== serviceInfo.service_used && (
                    <span className="ml-1">
                      (Note: Server used {serviceInfo.service_used} instead of your preferred {settings.aiProvider})
                    </span>
                  )}
                </div>
              )}
            </div>
          </Fieldset>

          {!settings.autoTranslate && (
            <div className="mt-8 flex justify-center">
              <Tooltip content={isLoading ? "Translation in progress..." : sourceText.trim() ? "Translate text (Ctrl+Enter)" : "Please enter text to translate"}>
                <button
                  ref={translateButtonRef}
                  onClick={handleTranslate}
                  disabled={isLoading || !sourceText.trim()}
                  className={`flex items-center px-8 py-3 rounded-full text-white ${
                    isLoading || !sourceText.trim()
                      ? 'bg-secondary-400 cursor-not-allowed dark:bg-secondary-700'
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 dark:from-primary-700 dark:to-primary-600 dark:hover:from-primary-600 dark:hover:to-primary-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg`}
                  aria-label="Translate text"
                  aria-disabled={isLoading || !sourceText.trim()}
                  aria-describedby="translate-shortcut"
                >
                  {isLoading ? (
                    <>
                      <Spinner size="sm" className="mr-2" />
                      <span>Translating...</span>
                    </>
                  ) : (
                    <>
                      <Languages className="h-5 w-5 mr-2" />
                      <span>Translate</span>
                    </>
                  )}
                </button>
              </Tooltip>
              <div id="translate-shortcut" className="sr-only">
                You can also press Control+Enter or Command+Enter to translate
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranslationInterface;