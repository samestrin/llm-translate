import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Paper } from '@mui/material';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import historyService from '../services/historyService';
import translationService from '../services/translationService';
import { useSettings } from '../contexts/SettingsContext';
import HistoryDisabled from '../components/History/HistoryDisabled';
import HistorySearch from '../components/History/HistorySearch';
import HistoryList from '../components/History/HistoryList';
import HistoryAudio from '../components/History/HistoryAudio';
import ConfirmModal from '../components/History/ConfirmModal';

const History = () => {
  const [history, setHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
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

  // Handle search functionality
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  // Handle history item actions
  const handleUseTranslation = (item) => {
    navigate('/', { 
      state: { 
        sourceText: item.sourceText,
        translatedText: item.translatedText,
        sourceLang: item.sourceLang,
        targetLang: item.targetLang
      } 
    });
  };

  const handleDeleteItem = useCallback((itemId, e) => {
    e.stopPropagation();
    historyService.deleteHistoryItem(itemId);
    setHistory(prev => prev.filter(item => item.id !== itemId));
    toast.success('Translation removed from history');
  }, []);

  // Handle clear all history
  const openConfirmModal = () => {
    setIsConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    setIsConfirmModalOpen(false);
  };

  const clearAllHistory = () => {
    historyService.clearHistory();
    setHistory([]);
    setIsConfirmModalOpen(false);
    toast.success('Translation history cleared');
  };

  // Helper functions
  const copyToClipboard = async (text, e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatTimestamp = (timestamp) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const truncateText = (text, maxLength) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // If history is disabled in settings, show the disabled component
  if (!settings.historyEnabled) {
    return <HistoryDisabled />;
  }

  return (
    <div className="py-4 px-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">
        Translation History
      </h1>
      
      <Paper 
        elevation={3} 
        sx={{ p: 4, borderRadius: 2, bgcolor: 'background.paper' }}
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-md"
      >
        <HistorySearch 
          searchQuery={searchQuery}
          handleSearchChange={handleSearchChange}
          handleClearSearch={handleClearSearch}
          handleSearchKeyPress={handleSearchKeyPress}
          handleSearchSubmit={handleSearchSubmit}
          openConfirmModal={openConfirmModal}
        />

        <HistoryAudio>
          {(audioProps) => (
            <HistoryList 
              history={history}
              isLoading={isLoading}
              searchQuery={searchQuery}
              handleUseTranslation={handleUseTranslation}
              handleDeleteItem={handleDeleteItem}
              copyToClipboard={copyToClipboard}
              handleSpeak={async (item, e) => {
                e.stopPropagation();
                
                // If already playing for this item, pause it
                if (audioProps.isAudioPlaying && audioProps.speakingItemId === item.id) {
                  audioProps.audioElement.pause();
                  // The audioElement's pause event will trigger setIsAudioPlaying(false)
                  // so we don't need to call it directly
                  audioProps.setSpeakingItemId(null);
                  return;
                }
                
                // Check if we can speak (daily limit)
                if (!audioProps.canSpeak) {
                  toast.error('Daily speak limit reached');
                  return;
                }
                
                // Reset error state
                audioProps.setSpeakError(false);
                
                // If we have audio for a different item, stop it
                if (audioProps.audioElement.src && audioProps.speakingItemId !== item.id) {
                  audioProps.audioElement.pause();
                  // The pause event will trigger setIsAudioPlaying(false)
                }
                
                audioProps.setSpeakingItemId(item.id);
                
                // Check if we already have a cached audio URL for this item
                const cachedAudioUrl = item.audioUrl || audioProps.audioCache?.[item.id];
                
                if (cachedAudioUrl) {
                  // Use the cached audio URL
                  audioProps.audioElement.src = cachedAudioUrl;
                  audioProps.audioElement.play();
                  return;
                }
                
                // If no cached audio, proceed with API request
                audioProps.setIsSpeakingLoading(true);
                
                try {
                  // Get audio from the translation service
                  const blob = await translationService.getSpeakAudio(item.translatedText, item.targetLang);
                  
                  // Update speak count
                  const newCount = audioProps.speakCount + 1;
                  audioProps.setSpeakCount(newCount);
                  localStorage.setItem('speakCount', newCount.toString());
                  localStorage.setItem('lastSpeakDate', new Date().toLocaleDateString());
                  audioProps.setCanSpeak(newCount < audioProps.MAX_SPEAKS_PER_DAY);
                  
                  // Create URL for the audio blob
                  const url = URL.createObjectURL(blob);
                  
                  // Cache the audio URL
                  const updatedCache = { ...audioProps.audioCache, [item.id]: url };
                  audioProps.setAudioCache(updatedCache);
                  
                  // Store the URL on the item object as well for redundancy
                  item.audioUrl = url;
                  
                  // Play the audio
                  audioProps.audioElement.src = url;
                  audioProps.audioElement.play();
                } catch (error) {
                  console.error('Error generating speech:', error);
                  audioProps.setSpeakError(true);
                  toast.error('Failed to generate speech');
                } finally {
                  audioProps.setIsSpeakingLoading(false);
                }
              }}
              formatTimestamp={formatTimestamp}
              truncateText={truncateText}
              speakingItemId={audioProps.speakingItemId}
              isSpeakingLoading={audioProps.isSpeakingLoading}
              isAudioPlaying={audioProps.isAudioPlaying}
              speakError={audioProps.speakError}
              canSpeak={audioProps.canSpeak}
            />
          )}
        </HistoryAudio>
      </Paper>

      <ConfirmModal 
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        onConfirm={clearAllHistory}
      />
    </div>
  );
};

export default History;