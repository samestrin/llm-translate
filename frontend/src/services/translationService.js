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
   * @param {string} fromLang - The source language, or "Auto-detect"
   * @param {string} toLang - The target language
   * @param {Object} [options]
   * @param {Array} [options.glossary] - Glossary entries as the API takes them
   * @param {Object} [options.styleGuide] - Style guide as the API takes it
   * @returns {Promise} - The `/v1/translate` response
   */
  translate: async (text, fromLang, toLang, { glossary, styleGuide } = {}) => {
    try {
      // The glossary and style guide change the answer and its `glossary_misses`.
      const cacheKey = JSON.stringify([text, fromLang, toLang, glossary || [], styleGuide || null]);

      // Check if we have a cached result
      const cachedResult = translationCache.get(cacheKey);
      if (cachedResult) {
        console.log('Using cached translation result');
        return cachedResult;
      }

      const result = await api.translateText({ text, fromLang, toLang, glossary, styleGuide });

      // Cache the result
      translationCache.set(cacheKey, result);

      return result;
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

      return await api.speak({ text, lang, responseFormat });
    } catch (error) {
      console.error('Speak audio error:', error);
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