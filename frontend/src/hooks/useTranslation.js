import { useState, useCallback, useEffect, useRef } from 'react';
import translationService from '../services/translationService';
import historyService from '../services/historyService';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-hot-toast';

/**
 * Custom hook for handling translations
 * @returns {Object} - Translation state and functions
 */
const useTranslation = () => {
  // Updated default languages to Auto-detect and English
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('Auto-detect');
  const [targetLang, setTargetLang] = useState('English');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serviceInfo, setServiceInfo] = useState({
    service_used: '',
    model_used: '',
  });
  const [apiAvailable, setApiAvailable] = useState(null); // Initialize as null to distinguish from false (checked and unavailable)
  const { settings } = useSettings();
  
  // Add a ref to track API health check status
  const apiHealthChecked = useRef(false);
  // Ref to track if a translation has been explicitly initiated by the user (typing, clicking translate, loading from history)
  const translationInitiated = useRef(false);

  // Check API availability on mount, but only once
  useEffect(() => {
    if (apiHealthChecked.current) {
      console.log('API health check already performed, skipping.');
      return;
    }
    
    const checkApiHealth = async () => {
      console.log('Performing API health check');
      apiHealthChecked.current = true; // Mark as attempting/checked immediately
      try {
        await translationService.healthCheck();
        setApiAvailable(true);
        console.log('API is available');
      } catch (err) {
        console.error('API health check failed:', err);
        setApiAvailable(false);
        toast.error('Translation API is currently unavailable');
      }
    };

    checkApiHealth();
  }, []); // Empty dependency array ensures it runs only once

  // Modify translate function to prevent unnecessary API calls
  const translate = useCallback(async () => {
    console.log('Translate function called. Source text:', sourceText);
    
    if (!sourceText.trim()) {
      console.log('Skipping translation: sourceText is empty');
      // setError('Please enter text to translate'); // Avoid setting error here if it's just an empty input
      return;
    }

    if (apiAvailable === false) { // Explicitly check for false (meaning check completed and API is down)
      setError('Translation API is currently unavailable');
      toast.error('Translation API is currently unavailable');
      return;
    }

    if (apiAvailable === null) { // API check hasn't completed yet
        console.log('API health check not complete yet, queuing translation or retrying soon.');
        // Optionally, you could set a state to retry or inform the user the API check is in progress.
        // For now, we'll prevent translation.
        toast.error('API status is being checked, please try again shortly.');
        return;
    }
    
    // Set flag to indicate translation has been initiated
    translationInitiated.current = true; 
    
    setIsLoading(true);
    setError(null);

    try {
      const result = await translationService.translate(
        sourceText,
        sourceLang,
        targetLang,
        settings.aiProvider !== 'auto' ? settings.aiProvider : undefined
      );
      
      console.log('API Response from /translate:', result); // Log the entire API response

      // Attempt to get translated text, checking common field names
      // Ensure result is an object before trying to access properties
      let actualTranslatedText = '';
      if (result && typeof result === 'object') {
        actualTranslatedText = result.translated_text || result.translation || '';
        
        if (result.translated_text === undefined && result.translation !== undefined) {
          console.warn("API response uses 'translation' field instead of 'translated_text'.");
        } else if (result.translated_text === undefined && result.translation === undefined) {
          console.warn("Neither 'translated_text' nor 'translation' field found in API response object.");
        }
      } else if (typeof result === 'string') {
        // If the result is a plain string, assume it's the translated text
        actualTranslatedText = result;
        console.warn("API response is a plain string. Assuming it's the translated text.");
      } else {
        console.warn("API response is not an object or string. Response:", result);
      }
      
      if (actualTranslatedText === '' && result && typeof result === 'object' && Object.keys(result).length > 0) {
         console.log("Translated text appears to be empty or was not found in the API response structure:", result);
      }

      setTranslatedText(actualTranslatedText);
      console.log('State `translatedText` set to:', actualTranslatedText);
      
      // Ensure serviceInfo fields are accessed safely, defaulting if not present
      setServiceInfo({
        service_used: (result && result.service_used) || 'N/A',
        model_used: (result && result.model_used) || 'N/A',
      });
      
      // Add to history if enabled
      if (settings.historyEnabled) {
        historyService.addToHistory({
          sourceText,
          translatedText: result.translated_text,
          sourceLang,
          targetLang,
          service_used: result.service_used,
          model_used: result.model_used,
        }, settings.maxHistoryItems);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err.message || 'An error occurred during translation. Please try again.';
      console.error('Error in translate function:', err); // Log the full error
      setError(errorMessage);
      // throw err; // Re-throwing might be handled by a higher-level error boundary or logged by the browser
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, sourceLang, targetLang, apiAvailable, settings]);

  // Rest of the hook implementation remains the same
  
  // Modified loadFromHistory to prevent auto-translating on load
  const loadFromHistory = useCallback((historyItem) => {
    console.log('Loading from history:', historyItem);
    setSourceText(historyItem.sourceText);
    setTranslatedText(historyItem.translatedText);
    setSourceLang(historyItem.sourceLang);
    setTargetLang(historyItem.targetLang);
    setServiceInfo({
      service_used: historyItem.service_used,
      model_used: historyItem.model_used,
    });
    translationInitiated.current = true; // Mark as initiated when loading from history
  }, []);

  const clearTranslation = useCallback(() => {
    setSourceText('');
    setTranslatedText('');
    setError(null);
  }, []);

  const swapLanguages = useCallback(() => {
    // Don't swap if source language is Auto-detect
    if (sourceLang === 'Auto-detect') {
      toast.info('Cannot swap when source language is set to Auto-detect');
      return;
    }
    
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  }, [sourceLang, targetLang, sourceText, translatedText]);

  return {
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
    apiAvailable,
    translate,
    clearTranslation,
    swapLanguages,
    loadFromHistory,
    translationInitiated, // Expose the ref so components can check if translation has been initiated
  };
};

export default useTranslation;