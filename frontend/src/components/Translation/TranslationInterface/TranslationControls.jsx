import React from 'react';
import { Button, IconButton } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import DownloadIcon from '@mui/icons-material/Download';
import CopyButton from '../CopyButton';
import Spinner from '../../UI/Spinner';
import { Tooltip } from '../../UI/Tooltip';

const TranslationControls = ({ 
  onTranslate, 
  onCopy, 
  onKeyboardShortcuts,
  onSpeak,
  onDownload,
  isLoading, 
  sourceText, 
  translatedText,
  isSpeakingLoading = false,
  isAudioPlaying = false,
  speakError = false,
  canSpeak = true
}) => {
  // Determine tooltip text for the speak button
  const getSpeakTooltip = () => {
    if (!translatedText) return "No text to speak";
    if (!canSpeak) return "Daily speak limit reached";
    if (speakError) return "Failed to play audio. Try again.";
    if (isAudioPlaying) return "Playing audio";
    return "Listen to translation";
  };

  // Determine the icon for the speak button based on state
  const getSpeakIcon = () => {
    if (speakError) return <ErrorOutlineIcon fontSize="small" />;
    if (isAudioPlaying) return <PauseIcon fontSize="small" />;
    if (isSpeakingLoading) return <Spinner size="xs" />;
    return <VolumeUpIcon fontSize="small" />;
  };

  // Determine the text for the speak button based on state
  const getSpeakButtonText = () => {
    if (isSpeakingLoading) return "Generating"; // Updated to show "Generating..."
    if (speakError) return "Failed";
    if (isAudioPlaying) return "Playing";
    return "Speak";
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tooltip content={!sourceText.trim() ? "No text to translate" : "Click to translate"}>
        <span>
          <Button
            variant="contained"
            onClick={onTranslate}
            disabled={isLoading || !sourceText.trim()}
            startIcon={<AutoAwesomeIcon fontSize="small" />}
            aria-label={!sourceText.trim() ? "No text to translate" : "Click to translate"}
          >
            {isLoading ? 'Translating…' : 'Translate'}
          </Button>
        </span>
      </Tooltip>

      <div className="flex flex-wrap items-center gap-2">
        <Tooltip content={!translatedText ? "No text to copy" : "Copy translated text"}>
          <span>
            <CopyButton text={translatedText} onCopy={onCopy} disabled={!translatedText} />
          </span>
        </Tooltip>

        <Tooltip content={!translatedText ? "No text to download" : "Download the translation as a text file"}>
          <span>
            <Button
              onClick={onDownload}
              disabled={!translatedText}
              variant="outlined"
              startIcon={<DownloadIcon fontSize="small" />}
              aria-label="Download translation"
            >
              Download
            </Button>
          </span>
        </Tooltip>

        <Tooltip content={getSpeakTooltip()}>
          <span>
            <Button
              onClick={onSpeak}
              disabled={!translatedText || !canSpeak || isSpeakingLoading}
              variant="outlined"
              color={speakError ? 'error' : 'primary'}
              startIcon={getSpeakIcon()}
              aria-label={getSpeakTooltip()}
            >
              {getSpeakButtonText()}
            </Button>
          </span>
        </Tooltip>

        <Tooltip content="Keyboard shortcuts">
          <IconButton onClick={onKeyboardShortcuts} aria-label="Show keyboard shortcuts">
            <KeyboardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>
    </div>
  );
};

export default TranslationControls;
