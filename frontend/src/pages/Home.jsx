import React, { useEffect, useState } from 'react';
import TranslationInterface from '../components/Translation/TranslationInterface';
import FileTranslation from '../components/Translation/FileTranslation';
import useTranslation from '../hooks/useTranslation.jsx';
import { Paper, Tab, Tabs } from '@mui/material';

const Home = () => {
  const translationProps = useTranslation();
  const { loadFromHistory, translationInitiated, audioPlayerRef, audioUrl, handleSpeak, setHasShownTTSNotice } = translationProps;
  const [mode, setMode] = useState('text');
  
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
        Translate text or a file between languages using LLMs, then listen to the translations using TTS.
      </p>
      
      <Paper 
        elevation={3} 
        sx={{ p: 6, borderRadius: 2, bgcolor: 'background.paper' }}
        className="bg-white dark:bg-secondary-800 rounded-lg shadow-md"
      >
        <Tabs value={mode} onChange={(_, value) => setMode(value)} aria-label="Translation mode" sx={{ mb: 3 }}>
          <Tab label="Text" value="text" />
          <Tab label="File" value="file" />
        </Tabs>
        {mode === 'text' ? (
          <TranslationInterface {...translationProps} setHasShownTTSNotice={setHasShownTTSNotice} />
        ) : (
          <FileTranslation
            sourceLang={translationProps.sourceLang}
            setSourceLang={translationProps.setSourceLang}
            targetLang={translationProps.targetLang}
            setTargetLang={translationProps.setTargetLang}
          />
        )}
      </Paper>
      {/* Hidden audio player for speak functionality */}
      <audio ref={audioPlayerRef} src={audioUrl || ''} style={{ display: 'none' }} />
    </div>
  );
};

export default Home;

