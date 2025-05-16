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

  // Ref to track API health check status
  const apiHealthChecked = useRef(false);
  // Ref to track if a translation has been explicitly initiated by the user (typing, clicking translate, loading from history)
  const translationInitiated = useRef(false);

  // --- Start: Speak Translation State (Tasks 3.1, 3.2) ---
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isSpeakingLoading, setIsSpeakingLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [speakError, setSpeakError] = useState(null);
  const audioPlayerRef = useRef(null); // For controlling the <audio> element
  const prevTranslatedTextRef = useRef(null); // To compare with current translatedText for caching
  // --- End: Speak Translation State ---

  // --- Start: Daily Usage Tracking State (Task 4.2) ---
  const MAX_SPEAKS_PER_DAY = 10; // Define usage limit (Task 4.5)
  const [speakCount, setSpeakCount] = useState(0);
  const [lastSpeakDate, setLastSpeakDate] = useState(new Date().toLocaleDateString());
  const [canSpeak, setCanSpeak] = useState(true);
  // Add state for tracking if TTS notice has been shown
  const [hasShownTTSNotice, setHasShownTTSNotice] = useState(false);
  // --- End: Daily Usage Tracking State ---


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

  // --- Start: Initialize and Manage Speak Count from localStorage (Task 4.3) ---
  useEffect(() => {
    const storedSpeakCount = localStorage.getItem('speakCount');
    const storedLastSpeakDate = localStorage.getItem('lastSpeakDate');
    const today = new Date().toLocaleDateString();

    if (storedLastSpeakDate && storedLastSpeakDate === today) {
      const count = parseInt(storedSpeakCount, 10) || 0;
      setSpeakCount(count);
      if (count >= MAX_SPEAKS_PER_DAY) {
        setCanSpeak(false);
      }
    } else {
      // Reset count if it's a new day or no data stored
      setSpeakCount(0);
      localStorage.setItem('speakCount', '0');
      localStorage.setItem('lastSpeakDate', today);
      setCanSpeak(true);
    }
    // Persist the initial or reset date immediately
    setLastSpeakDate(today);
  }, []);

  // Update canSpeak whenever speakCount changes
  useEffect(() => {
    setCanSpeak(speakCount < MAX_SPEAKS_PER_DAY);
  }, [speakCount]);
  // --- End: Initialize and Manage Speak Count ---

  // --- Start: Audio Element Effects (Tasks 3.4) ---
  // Create audio element on mount
  useEffect(() => {
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio();
      console.log('Created audio element programmatically');
    }
    
    return () => {
      // Cleanup on unmount if needed
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = '';
      }
    };
  }, []);
  
  // Set up audio event listeners
  useEffect(() => {
    const audioElement = audioPlayerRef.current;
    if (!audioElement) {
      console.log('Audio element ref is not available yet');
      return;
    }
    
    console.log('Setting up audio element event listeners');
    
    // Add debugging logs for audio element properties
    console.log('Audio element initial state:', {
      src: audioElement.src,
      paused: audioElement.paused,
      ended: audioElement.ended,
      readyState: audioElement.readyState,
      networkState: audioElement.networkState,
      error: audioElement.error
    });

    const handlePlaying = () => {
      console.log('Audio started playing');
      setIsAudioPlaying(true);
    };
    
    const handleEnded = () => {
      console.log('Audio playback ended');
      setIsAudioPlaying(false);
    };
    
    const handlePause = () => {
      console.log('Audio playback paused');
      setIsAudioPlaying(false);
    };
    
    const handleError = (e) => {
      console.error('Audio playback error:', {
        error: audioElement.error,
        code: audioElement.error ? audioElement.error.code : null,
        message: audioElement.error ? audioElement.error.message : null,
        networkState: audioElement.networkState
      });
      setSpeakError('Error playing audio.');
      setIsAudioPlaying(false);
      // Make sure toast error is displayed
      toast.error('Error playing audio. Please try again.');
    };

    // Add a canplay event handler for debugging
    const handleCanPlay = () => {
      console.log('Audio can play now:', {
        duration: audioElement.duration,
        readyState: audioElement.readyState
      });
    };

    audioElement.addEventListener('playing', handlePlaying);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('pause', handlePause);
    audioElement.addEventListener('error', handleError);
    audioElement.addEventListener('canplay', handleCanPlay);

    return () => {
      console.log('Cleaning up audio element event listeners');
      audioElement.removeEventListener('playing', handlePlaying);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('pause', handlePause);
      audioElement.removeEventListener('error', handleError);
      audioElement.removeEventListener('canplay', handleCanPlay);
    };
  }, [audioPlayerRef.current]);
  // --- End: Audio Element Effects ---

  useEffect(() => {
    // Clean up Object URL when audioUrl changes or component unmounts
    let currentAudioUrl = audioUrl;
    return () => {
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        console.log('Revoked Object URL:', currentAudioUrl);
      }
    };
  }, [audioUrl]);

  // Reset speak error when translatedText changes
  useEffect(() => {
    // If translatedText changes and we have an error, reset the error state
    if (translatedText && speakError) {
      console.log('Translated text changed, resetting speak error state');
      setSpeakError(null);
    }
    // Update the reference for caching purposes
    prevTranslatedTextRef.current = translatedText;
  }, [translatedText, speakError]);

  // Clear audio cache when translated text changes
  useEffect(() => {
    if (translatedText !== prevTranslatedTextRef.current) {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      setAudioBlob(null);
      setAudioUrl(null);
      setIsAudioPlaying(false); // Stop playing if text changes
      // setSpeakError(null); // Optionally reset error
      console.log('Translated text changed, cleared audio cache.');
    }
    prevTranslatedTextRef.current = translatedText;
  }, [translatedText, audioUrl]); // Include audioUrl in dependencies to correctly revoke it
  // --- End: Clear audio cache ---


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

  // --- Start: handleSpeak function (Task 3.3) ---
  // --- Start: Auto-play audio after load (Task 3.1) ---
  useEffect(() => {
    // Only auto-play if audioUrl was just set and not already playing
    if (audioUrl && !isAudioPlaying && !isSpeakingLoading) {
      if (audioPlayerRef.current) {
        // Use the canplay event to wait until the audio is ready before playing
        const audioElement = audioPlayerRef.current;
        
        const playAudio = () => {
          audioElement.play().catch((err) => {
            setSpeakError('Failed to auto-play audio');
            setIsAudioPlaying(false);
            setIsSpeakingLoading(false);
            toast.error('Could not auto-play audio. Please try again.');
          });
          // Clean up event listener after playing
          audioElement.removeEventListener('canplay', playAudio);
        };
        
        // Add event listener for canplay
        audioElement.addEventListener('canplay', playAudio);
        
        // Set the src - this will trigger loading
        audioElement.src = audioUrl;
      }
    }
    // No dependencies on translatedText here to avoid double-play
  }, [audioUrl]);
  // --- End: Auto-play audio after load ---

  // Handle Speak functionality
  const handleSpeak = useCallback(async () => {
    if (!translatedText) {
      toast.error('No text to speak');
      return;
    }

    if (!canSpeak) {
      toast.error(`Daily limit of ${MAX_SPEAKS_PER_DAY} TTS requests reached`);
      return;
    }

    // If audio is already playing, pause it
    if (isAudioPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      return;
    }

    // If we're in an error state, clear it to allow retry
    if (speakError) {
      console.log('Retrying after previous error');
      setSpeakError(null);
      setAudioBlob(null);
      setAudioUrl(null);
      // Continue with generating new audio
    }

    // If we already have audio for this text, play it
    if (audioBlob && prevTranslatedTextRef.current === translatedText && !speakError) {
      console.log('Using cached audio');
      if (audioPlayerRef.current) {
        const playExistingAudio = () => {
          audioPlayerRef.current.play().catch(err => {
            console.error('Error playing cached audio:', err);
            setSpeakError('Error playing audio');
            toast.error('Error playing audio. Please try again.');
          });
          audioPlayerRef.current.removeEventListener('canplay', playExistingAudio);
        };
        
        if (audioPlayerRef.current.readyState >= 3) {
          // Audio is already loaded and ready to play
          playExistingAudio();
        } else {
          // Add listener for when it's ready
          audioPlayerRef.current.addEventListener('canplay', playExistingAudio);
        }
      }
      return;
    }

    // Otherwise, fetch new audio
    try {
      setIsSpeakingLoading(true);
      setSpeakError(null);

      // Show first-time TTS notice if it hasn't been shown yet in this session
      if (!hasShownTTSNotice) {
        setHasShownTTSNotice(true);
        // We'll return the shouldShowTTSNotice flag to the parent component
      }

      // Increment speak count and update localStorage
      const newCount = speakCount + 1;
      setSpeakCount(newCount);
      localStorage.setItem('speakCount', newCount.toString());
      localStorage.setItem('lastSpeakDate', lastSpeakDate);

      // Get audio from API
      const blob = await translationService.getSpeakAudio(
        translatedText,
        targetLang
      );

      // Create URL for the audio blob
      const url = URL.createObjectURL(blob);
      setAudioBlob(blob);
      setAudioUrl(url);

      // Play the audio - ensure we have a valid audio element
      if (audioPlayerRef.current) {
        console.log('Setting audio source and playing:', url);
        
        const audioElement = audioPlayerRef.current;
        
        const playNewAudio = () => {
          audioElement.play().catch(err => {
            console.error('Error playing new audio:', err);
            setSpeakError('Failed to play audio');
            setIsAudioPlaying(false);
            toast.error('Failed to play audio. Please try again.');
          });
          audioElement.removeEventListener('canplay', playNewAudio);
        };
        
        // Listen for when audio is ready to play
        audioElement.addEventListener('canplay', playNewAudio);
        
        // Set source to trigger loading
        audioElement.src = url;
      } else {
        console.error('Audio element reference is null');
        toast.error('Audio player not initialized');
      }

      setIsSpeakingLoading(false);
    } catch (err) {
      console.error('Error in handleSpeak:', err);
      setIsSpeakingLoading(false);
      setSpeakError('Failed to generate audio');
      toast.error('Failed to generate audio. Please try again.');
    }
  }, [
    translatedText,
    canSpeak,
    isAudioPlaying,
    audioBlob,
    targetLang,
    speakCount,
    lastSpeakDate,
    hasShownTTSNotice,
    setHasShownTTSNotice,
    speakError,
  ]);
  // --- End: handleSpeak function ---

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
    // Also clear speak related state
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setIsAudioPlaying(false);
    setSpeakError(null);
  }, [audioUrl]);

  const swapLanguages = useCallback(() => {
    // Don't swap if source language is Auto-detect
    if (sourceLang === 'Auto-detect') {
      toast.info('Cannot swap when source language is set to Auto-detect');
      return;
    }
    
    // Don't swap if languages are the same
    if (sourceLang === targetLang) {
      toast.info('Source and target languages are already the same');
      return;
    }
    
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // The following lines that swapped text have been removed.
  }, [sourceLang, targetLang, setSourceLang, setTargetLang]);

  // Function to swap only the text content
  return {
    sourceText,
    setSourceText,
    translatedText,
    setTranslatedText,
    sourceLang,
    setSourceLang,
    targetLang,
    setTargetLang,
    isLoading,
    error,
    serviceInfo,
    translate,
    loadFromHistory,
    translationInitiated,
    swapLanguages, // Make sure it's included here
    // Add all speak-related states and functions to the returned object
    audioBlob,
    audioUrl,
    audioPlayerRef,
    isSpeakingLoading,
    isAudioPlaying,
    speakError,
    canSpeak,
    hasShownTTSNotice,
    handleSpeak,
    clearTranslation 
  };
};

export default useTranslation;

