import React from 'react';
import { Stack } from '@mui/material';
import HistoryItem from './HistoryItem';
import HistoryEmpty from './HistoryEmpty';

const HistoryList = ({ 
  history, 
  isLoading, 
  searchQuery,
  handleUseTranslation,
  handleDeleteItem,
  copyToClipboard,
  handleSpeak,
  formatTimestamp,
  truncateText,
  speakingItemId,
  isSpeakingLoading,
  isAudioPlaying,
  speakError,
  canSpeak
}) => {
  if (history.length === 0 && !isLoading) {
    return <HistoryEmpty searchQuery={searchQuery} />;
  }

  return (
    <Stack spacing={2}>
      {history.map((item, index) => (
        <HistoryItem
          key={item.id}
          item={item}
          index={index}
          handleUseTranslation={handleUseTranslation}
          handleDeleteItem={handleDeleteItem}
          copyToClipboard={copyToClipboard}
          handleSpeak={handleSpeak}
          formatTimestamp={formatTimestamp}
          truncateText={truncateText}
          speakingItemId={speakingItemId}
          isSpeakingLoading={isSpeakingLoading}
          isAudioPlaying={isAudioPlaying}
          speakError={speakError}
          canSpeak={canSpeak}
        />
      ))}
    </Stack>
  );
};

export default HistoryList;