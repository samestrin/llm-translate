import api from './api';
import { createCache } from '../utils/helpers';

// Create a cache for translation results
const translationCache = createCache(50, 3600000); // Cache 50 items for 1 hour

/**
 * Translation service for communicating with the backend API
 */
const translationService = {
  /**
   * Translate text from one language to another
   * @param {string} text - The text to translate
   * @param {string} fromLang - The source language
   * @param {string} toLang - The target language
   * @param {string} provider - Optional AI provider to use
   * @returns {Promise} - The translation response
   */
  translate: async (text, fromLang, toLang, provider = undefined) => {
    try {
      // Create a cache key that handles Auto-detect specially
      const cacheKey = `${text}|${fromLang}|${toLang}|${provider || 'default'}`;
      
      // Check if we have a cached result
      const cachedResult = translationCache.get(cacheKey);
      if (cachedResult) {
        console.log('Using cached translation result');
        return cachedResult;
      }
      
      // Prepare request payload
      const payload = {
        text,
        from_lang: fromLang, // Always include from_lang, sending "Auto-detect" as a string
        to_lang: toLang,
      };
      
      // Add provider if specified and not 'auto'
      if (provider && provider !== 'auto') {
        payload.provider = provider;
      }
      
      console.log('Translation payload:', payload);
      
      // Make API request
      const response = await api.post('/translate', payload);
      
      // Cache the result
      translationCache.set(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      console.error('Translation error:', error);
      throw error;
    }
  },

  /**
   * Get audio for translated text using text-to-speech
   * @param {string} text - The text to convert to speech
   * @param {string} lang - The language of the text (full name, e.g., "Spanish")
   * @param {string} responseFormat - The audio format (default: "mp3")
   * @returns {Promise<Blob>} - The audio as a blob
   */
  getSpeakAudio: async (text, lang, responseFormat = "mp3") => {
    try {
      if (!text || !lang) {
        throw new Error('Text and language are required');
      }

      console.log('Speak payload:', { text, lang, responseFormat });
      
      // Prepare request payload
      const payload = {
        text,
        lang,
        response_format: responseFormat
      };
      
      // Make API request with blob response type
      const response = await api.post('/speak', payload, {
        responseType: 'blob'
      });
      
      // Return the blob directly
      return response.data;
    } catch (error) {
      console.error('Speak audio error:', error);
      throw error;
    }
  },

  /**
   * Check if the API is available
   * @returns {Promise} - The health check response
   */
  healthCheck: async () => {
    try {
      const response = await api.get('/');
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw error;
    }
  },
  
  /**
   * Clear the translation cache
   */
  clearCache: () => {
    translationCache.clear();
  }
};

export default translationService;