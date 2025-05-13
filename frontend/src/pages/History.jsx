import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Clock, ArrowUpDown, ExternalLink } from 'lucide-react';
import historyService from '../services/historyService';
import { useSettings } from '../contexts/SettingsContext';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const History = () => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const { settings } = useSettings();
  const navigate = useNavigate();

  // Load history on component mount
  useEffect(() => {
    if (!settings.historyEnabled) {
      setHistory([]);
      setIsLoading(false);
      return;
    }

    const loadHistory = () => {
      setIsLoading(true);
      const historyData = searchQuery
        ? historyService.searchHistory(searchQuery)
        : historyService.getHistory();
      setHistory(historyData);
      setIsLoading(false);
    };

    loadHistory();
  }, [searchQuery, settings.historyEnabled]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all translation history?')) {
      historyService.clearHistory();
      setHistory([]);
      toast.success('Translation history cleared');
    }
  };

  const handleDeleteItem = (id, e) => {
    e.stopPropagation();
    historyService.removeFromHistory(id);
    setHistory(history.filter(item => item.id !== id));
    toast.success('Item removed from history');
  };

  const handleUseTranslation = (item) => {
    // Store the item in sessionStorage to be loaded by the home page
    sessionStorage.setItem('selectedHistoryItem', JSON.stringify(item));
    navigate('/');
  };

  // Format the timestamp to a relative time (e.g., "2 hours ago")
  const formatTimestamp = (timestamp) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (error) {
      return 'Unknown time';
    }
  };

  // Truncate text to a certain length
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  if (!settings.historyEnabled) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Translation History</h1>
          <p className="text-secondary-600 dark:text-secondary-400 mb-6">
            Translation history is currently disabled in your settings.
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Translation History</h1>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-secondary-400" />
            </div>
            <input
              type="text"
              placeholder="Search history..."
              value={searchQuery}
              onChange={handleSearch}
              className="pl-10 pr-4 py-2 w-full border border-secondary-300 dark:border-secondary-600 rounded-md bg-white dark:bg-secondary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              aria-label="Search translation history"
            />
          </div>
          
          <button
            onClick={handleClearHistory}
            className="flex items-center justify-center px-4 py-2 border border-red-300 text-red-700 dark:border-red-700 dark:text-red-400 bg-white dark:bg-secondary-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Clear all history"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600 dark:border-primary-400"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-secondary-800 rounded-lg shadow">
          <Clock className="h-12 w-12 mx-auto text-secondary-400" />
          <h2 className="mt-4 text-lg font-medium">No translation history found</h2>
          <p className="mt-2 text-secondary-500 dark:text-secondary-400">
            {searchQuery ? 'Try a different search term' : 'Your translation history will appear here'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-secondary-800 rounded-lg shadow overflow-hidden">
          <ul className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {history.map((item) => (
              <li 
                key={item.id}
                onClick={() => handleUseTranslation(item)}
                className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50 cursor-pointer transition-colors"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center text-sm text-secondary-500 dark:text-secondary-400">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>{formatTimestamp(item.timestamp)}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1 text-secondary-400 hover:text-red-500 dark:hover:text-red-400 rounded-full hover:bg-secondary-100 dark:hover:bg-secondary-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Delete this history item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
                        <span>{item.sourceLang}</span>
                      </div>
                      <p className="text-secondary-900 dark:text-white">
                        {truncateText(item.sourceText)}
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center text-xs font-medium text-secondary-500 dark:text-secondary-400 mb-1">
                        <span>{item.targetLang}</span>
                      </div>
                      <p className="text-secondary-900 dark:text-white">
                        {truncateText(item.translatedText)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center text-xs text-secondary-500 dark:text-secondary-400">
                    <span>
                      Translated with {item.service_used} ({item.model_used})
                    </span>
                    <div className="ml-auto flex items-center">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      <span>Click to use again</span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default History;