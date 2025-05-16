import React from 'react';
import { 
  Box, 
  Button, 
  IconButton,
  alpha
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CopyButton from '../CopyButton';
import Spinner from '../../UI/Spinner';
import { Tooltip } from '../../UI/Tooltip';

const TranslationControls = ({ 
  onTranslate, 
  onCopy, 
  onKeyboardShortcuts,
  onSpeak,
  isLoading, 
  sourceText, 
  translatedText,
  isSpeakingLoading = false,
  isAudioPlaying = false,
  speakError = false,
  canSpeak = true
}) => {
  // Define common button styling based on the Translate button
  const commonButtonSx = {
    px: 2,
    py: 1,
    textTransform: 'none',
    fontSize: '0.875rem',
    lineHeight: 1,
    minWidth: 'auto', // Ensure buttons can shrink to content size + padding
  };

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
    if (isSpeakingLoading) return <Spinner size="xs" color="white" />;
    return <VolumeUpIcon fontSize="small" />;
  };

  // Determine the text for the speak button based on state
  const getSpeakButtonText = () => {
    if (isSpeakingLoading) return "Generating"; // Updated to show "Generating..."
    if (speakError) return "Failed";
    if (isAudioPlaying) return "Playing";
    return "Speak";
  };

  // Determine the color for the speak button based on state
  const getSpeakButtonColor = () => {
    if (speakError) return "error";
    if (isAudioPlaying) return "secondary";
    return "primary";
  };

  // Style for the speak button
  const getSpeakButtonStyle = () => {
    const baseStyle = {
      ...commonButtonSx, // Apply common styles
      // ml: 1.5 // Removed, gap on parent Box will handle spacing
    };
    
    if (speakError) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--error-100)',
        color: 'var(--error-700)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--error-200)',
        },
      };
    } else if (isAudioPlaying) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--secondary-100)',
        color: 'var(--secondary-700)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--secondary-200)',
        },
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'var(--primary-100)',
        color: 'var(--primary-800)',
        '&.MuiButton-root:hover': {
          backgroundColor: 'var(--primary-200)',
        },
      };
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 1.5, 
        pt: 2,
        width: '100%', // Ensure full width
        justifyContent: 'space-between' // This will push items to the edges
      }}
    >
      <Tooltip content={!sourceText.trim() ? "No text to translate" : "Click to translate"}>
        <span>
          <Button
            variant="contained"
            color="primary"
            onClick={onTranslate}
            disabled={isLoading || !sourceText.trim()}
            startIcon={
              isLoading ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <AutoAwesomeIcon fontSize="small" />
              )
            }
            sx={{
              ...commonButtonSx, // Apply common styles
              bgcolor: 'primary.600',
              '&:hover': {
                bgcolor: 'primary.700',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
            aria-label={!sourceText.trim() ? "No text to translate" : "Click to translate"}
          >
            {isLoading ? 'Translating...' : 'Translate'}
          </Button>
        </span>
      </Tooltip>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}> {/* Right-aligned group */}
        <Tooltip content={!translatedText ? "No text to copy" : "Copy translated text"}>
          <span>
            <CopyButton 
              text={translatedText} 
              onCopy={onCopy}
              disabled={!translatedText}
              // Pass commonButtonSx or ensure CopyButton internally matches these styles
            />
          </span>
        </Tooltip>

        <Tooltip content={getSpeakTooltip()}>
          <span>
            <Button
              onClick={onSpeak}
              disabled={!translatedText || !canSpeak || isSpeakingLoading}
              variant="contained"
              color={getSpeakButtonColor()}
              sx={getSpeakButtonStyle()}
              startIcon={getSpeakIcon()}
              aria-label={getSpeakTooltip()}
            >
              {getSpeakButtonText()}
            </Button>
          </span>
        </Tooltip>

        <Tooltip content="Keyboard shortcuts">
          <IconButton
            onClick={onKeyboardShortcuts}
            sx={{
              p: 1,
              borderRadius: '50%',
              color: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.400' : 'secondary.500',
              bgcolor: (theme) => 
                theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.08) : alpha(theme.palette.common.black, 0.04),
              transition: 'all 0.2s',
              '&:hover': {
                color: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.200' : 'secondary.700',
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.12) : alpha(theme.palette.common.black, 0.08),
              },
            }}
            aria-label="Show keyboard shortcuts"
          >
            <KeyboardIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default TranslationControls;