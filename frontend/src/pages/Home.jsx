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
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="m-0 text-xl text-ink">Translate</h1>
        <p className="m-0 text-ink-muted">Translate text or a file, then listen to it.</p>
      </div>
      <ServiceStatus />

      <div className="panel flex flex-col gap-3">
        <Tabs value={mode} onChange={(_, value) => setMode(value)} aria-label="Translation mode">
          <Tab label="Text" value="text" />
          <Tab label="File" value="file" />
        </Tabs>
        <ReviewSwitch
          checked={translationProps.review}
          onChange={translationProps.setReview}
          disabled={translationProps.isLoading || fileBusy}
        />
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
