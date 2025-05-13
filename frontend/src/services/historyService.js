import { v4 as uuidv4 } from 'uuid';

const HISTORY_STORAGE_KEY = 'translationHistory';

/**
 * Service for managing translation history
 */
const historyService = {
  /**
   * Get all history items
   * @param {number} limit - Maximum number of items to return
   * @returns {Array} - Array of history items
   */
  getHistory: (limit = 0) => {
    try {
      const history = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY)) || [];
      return limit > 0 ? history.slice(0, limit) : history;
    } catch (error) {
      console.error('Error retrieving history:', error);
      return [];
    }
  },

  /**
   * Add a new translation to history
   * @param {Object} translation - Translation data
   * @param {number} maxItems - Maximum number of items to keep
   * @returns {Object} - The added history item
   */
  addToHistory: (translation, maxItems = 50) => {
    try {
      const history = historyService.getHistory();
      
      // Create a new history item with unique ID and timestamp
      const historyItem = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ...translation
      };
      
      // Add to the beginning of the array
      const updatedHistory = [historyItem, ...history];
      
      // Limit the number of items
      const limitedHistory = updatedHistory.slice(0, maxItems);
      
      // Save to localStorage
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(limitedHistory));
      
      return historyItem;
    } catch (error) {
      console.error('Error adding to history:', error);
      return null;
    }
  },

  /**
   * Remove a history item by ID
   * @param {string} id - The ID of the history item to remove
   * @returns {boolean} - Success status
   */
  removeFromHistory: (id) => {
    try {
      const history = historyService.getHistory();
      const updatedHistory = history.filter(item => item.id !== id);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      return true;
    } catch (error) {
      console.error('Error removing from history:', error);
      return false;
    }
  },

  /**
   * Clear all history
   * @returns {boolean} - Success status
   */
  clearHistory: () => {
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  },

  /**
   * Search history items
   * @param {string} query - Search query
   * @returns {Array} - Filtered history items
   */
  searchHistory: (query) => {
    if (!query) return historyService.getHistory();
    
    try {
      const history = historyService.getHistory();
      const lowerQuery = query.toLowerCase();
      
      return history.filter(item => 
        item.sourceText?.toLowerCase().includes(lowerQuery) ||
        item.translatedText?.toLowerCase().includes(lowerQuery) ||
        item.sourceLang?.toLowerCase().includes(lowerQuery) ||
        item.targetLang?.toLowerCase().includes(lowerQuery)
      );
    } catch (error) {
      console.error('Error searching history:', error);
      return [];
    }
  }
};

export default historyService;