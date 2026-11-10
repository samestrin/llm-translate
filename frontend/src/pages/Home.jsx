import React, { useEffect, useState } from 'react';
import TranslationInterface from '../components/Translation/TranslationInterface';
import FileTranslation from '../components/Translation/FileTranslation';
import ReviewSwitch from '../components/Translation/ReviewSwitch';
import ServiceStatus from '../components/Translation/ServiceStatus';
import useTranslation from '../hooks/useTranslation.jsx';
import { Tab, Tabs } from '@mui/material';

const Home = () => {
  const translationProps = useTranslation();
  const { loadFromHistory, audioPlayerRef, audioUrl, setHasShownTTSNotice } = translationProps;
  const [mode, setMode] = useState('text');
  // A file request in flight; the review switch must not change under it.
  const [fileBusy, setFileBusy] = useState(false);

  useEffect(() => {
    const selectedHistoryItem = sessionStorage.getItem('selectedHistoryItem');

    if (selectedHistoryItem) {
      try {
        loadFromHistory(JSON.parse(selectedHistoryItem));
        sessionStorage.removeItem('selectedHistoryItem');
      } catch (error) {
        console.error('Error loading history item:', error);
      }
    }
  }, [loadFromHistory]);

  return (
    <div className="mx-auto max-w-6xl px-0 py-4 sm:px-4">
      <h1 className="mb-3 text-center text-3xl font-bold text-ink">Translate</h1>
      <p className="mb-3 text-center text-ink-muted">
        Translate text or a file between languages using LLMs, then listen to the translations using TTS.
      </p>
      <div className="mb-6 flex justify-center">
        <ServiceStatus />
      </div>

      <div className="rounded-lg border border-line bg-surface p-3 shadow-md sm:p-6">
        <Tabs value={mode} onChange={(_, value) => setMode(value)} aria-label="Translation mode" sx={{ mb: 3 }}>
          <Tab label="Text" value="text" />
          <Tab label="File" value="file" />
        </Tabs>
        <div className="mb-4">
          <ReviewSwitch
            checked={translationProps.review}
            onChange={translationProps.setReview}
            disabled={translationProps.isLoading || fileBusy}
          />
        </div>
        {mode === 'text' ? (
          <TranslationInterface {...translationProps} setHasShownTTSNotice={setHasShownTTSNotice} />
        ) : (
          <FileTranslation
            sourceLang={translationProps.sourceLang}
            setSourceLang={translationProps.setSourceLang}
            targetLang={translationProps.targetLang}
            setTargetLang={translationProps.setTargetLang}
            review={translationProps.review}
            onBusyChange={setFileBusy}
          />
        )}
      </div>
      {/* Hidden audio player for speak functionality */}
      <audio ref={audioPlayerRef} src={audioUrl || ''} style={{ display: 'none' }} />
    </div>
  );
};

export default Home;
