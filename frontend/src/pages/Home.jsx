import React, { useEffect } from 'react';
import TranslationInterface from '../components/Translation/TranslationInterface';
import useTranslation from '../hooks/useTranslation.jsx';
import { Paper } from '@mui/material';

const Home = () => {
  const translationProps = useTranslation();
  const { loadFromHistory, translationInitiated, audioPlayerRef, audioUrl, handleSpeak, setHasShownTTSNotice } = translationProps;
  
  console.log('Home component rendering handleSpeak available:', !!handleSpeak); // Debug log
  
  useEffect(() => {
    console.log('Home useEffect for history check');
    const selectedHistoryItem = sessionStorage.getItem('selectedHistoryItem');
    
    if (selectedHistoryItem) {
      try {
        const historyItem = JSON.parse(selectedHistoryItem);
        console.log('Loading history item from session storage:', historyItem);
        loadFromHistory(historyItem);
        sessionStorage.removeItem('selectedHistoryItem');
      } catch (error) {
        console.error('Error loading history item:', error);
      }
    }
  }, [loadFromHistory]);

  console.log('Home component rendering. Translation initiated:', translationInitiated?.current);

  return (
    <div className="py-4 px-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">Translate</h1>
      <p className="text-center text-secondary-600 dark:text-secondary-400 mb-8">
        Translate text between languages using LLMs, then listen to to the translations using TTS.
      </p>
      
      <Paper 
        elevation={3} 
        sx={{ p: 6, borderRadius: 2, bgcolor: 'background.paper' }}
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-md"
      >
        <TranslationInterface {...translationProps} setHasShownTTSNotice={setHasShownTTSNotice} />
      </Paper>
      {/* Hidden audio player for speak functionality */}
      <audio ref={audioPlayerRef} src={audioUrl || ''} style={{ display: 'none' }} />
    </div>
  );
};

export default Home;

