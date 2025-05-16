import React from 'react';
import { 
  Card, 
  CardContent, 
  Box, 
  Typography, 
  Button, 
  Grid 
} from '@mui/material';
import { Clock } from 'lucide-react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import PauseIcon from '@mui/icons-material/Pause';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Tooltip } from '../UI/Tooltip';
import Spinner from '../UI/Spinner';
import { useTheme } from '@mui/material/styles';

const HistoryItem = ({ 
  item, 
  index, 
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
  const theme = useTheme();

  const getTextColor = () => {
    return theme.palette.mode === 'dark' ? 'var(--secondary-100)' : 'var(--secondary-900)';
  };

  const getBorderColor = () => {
    return theme.palette.mode === 'dark' ? theme.palette.secondary[700] : theme.palette.secondary[300];
  };

  // Define common button styling
  const commonButtonSx = {
    px: 1,
    py: 0.5,
    minWidth: 'auto',
    fontSize: '0.75rem',
    textTransform: 'none',
  };

  // Determine tooltip text for the speak button
  const getSpeakTooltip = () => {
    if (!canSpeak) return "Daily speak limit reached";
    if (speakError && speakingItemId === item.id) return "Failed to play audio. Try again.";
    if (isAudioPlaying && speakingItemId === item.id) return "Playing audio";
    return "Listen to translation";
  };

  // Determine the icon for the speak button based on state
  const getSpeakIcon = () => {
    if (isSpeakingLoading && speakingItemId === item.id) return <Spinner size="xs" color="primary" />;
    if (isAudioPlaying && speakingItemId === item.id) return <PauseIcon fontSize="small" />;
    if (speakError && speakingItemId === item.id) return <ErrorOutlineIcon fontSize="small" />;
    return <VolumeUpIcon fontSize="small" />;
  };

  // Determine the text for the speak button based on state
  const getSpeakButtonText = () => {
    if (isSpeakingLoading && speakingItemId === item.id) return "Generating";
    if (speakError && speakingItemId === item.id) return "Failed";
    if (isAudioPlaying && speakingItemId === item.id) return "Playing";
    return "Speak";
  };

  // Style for the speak button
  const getSpeakButtonStyle = () => {
    const baseStyle = {
      ...commonButtonSx,
    };
    
    if (speakError && speakingItemId === item.id) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--error-100)',
        color: 'var(--error-700)',
        '&:hover': {
          backgroundColor: 'var(--error-200)',
        },
      };
    } else if (isAudioPlaying && speakingItemId === item.id) {
      return {
        ...baseStyle,
        backgroundColor: 'var(--secondary-100)',
        color: 'var(--secondary-700)',
        '&:hover': {
          backgroundColor: 'var(--secondary-200)',
        },
      };
    } else {
      return {
        ...baseStyle,
        backgroundColor: 'var(--primary-100)',
        color: 'var(--primary-800)',
        '&:hover': {
          backgroundColor: 'var(--primary-200)',
        },
      };
    }
  };

  return (
    <Card 
      key={item.id} 
      elevation={1}
      style={{ 
        backgroundColor: index % 2 === 0 
          ? (theme.palette.mode === 'dark' ? '#323232' : '#FFFFFF') 
          : (theme.palette.mode === 'dark' ? '#262626' : '#F5F5F5'),
      }}
      sx={{ 
        borderRadius: 2,
        transition: 'all 0.2s ease',
        borderColor: getBorderColor(),
        '&:hover': {
          border: 1,
          borderColor: theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.400',                      
        },
        '&:focus': {
          border: 1,
          borderColor: theme.palette.primary.main,
          outline: 'none'
        },
        cursor: 'pointer'
      }}
      onClick={() => handleUseTranslation(item)}
    >
      <CardContent sx={{ pb: 1 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} sx={{
            minWidth: { 
              xs: '100%',
              sm: '100%',
              md: '50%',
            }
          }}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'var(--secondary-500)', 
                mb: 0.5, 
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}
            >
              Source - {item.sourceLang} 
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: getTextColor(), 
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                height: '4.5em' // Fixed height for consistency
              }}
            >
              {truncateText(item.sourceText, 150)}
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                color: 'var(--secondary-500)', 
                mb: 0.5, 
                fontSize: '0.7rem',
                fontWeight: 'bold'
              }}
            >
              Translation - {item.targetLang}
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                color: getTextColor(), 
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                height: '4.5em' // Fixed height for consistency
              }}
            >
              {truncateText(item.translatedText, 150)}
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 2
        }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'var(--secondary-500)', 
              display: 'flex', 
              alignItems: 'center',
              alignSelf: 'flex-end', 
              gap: 0.5
            }}
          >
            <Clock size={14} /> {formatTimestamp(item.timestamp)}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Tooltip title="Copy Source Text">
              <Button
                onClick={(e) => copyToClipboard(item.sourceText, e)}
                size="small"
                variant="contained"
                startIcon={<ContentCopyIcon fontSize="small" />}
                sx={{
                  ...commonButtonSx,
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-800)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-200)',
                  }
                }}
              >
                Copy Source
              </Button>
            </Tooltip>
            
            <Tooltip title="Copy Translation">
              <Button
                onClick={(e) => copyToClipboard(item.translatedText, e)}
                size="small"
                variant="contained"
                startIcon={<ContentCopyIcon fontSize="small" />}
                sx={{
                  ...commonButtonSx,
                  backgroundColor: 'var(--primary-100)',
                  color: 'var(--primary-800)',
                  '&:hover': {
                    backgroundColor: 'var(--primary-200)',
                  }
                }}
              >
                Copy Translation
              </Button>
            </Tooltip>
            
            <Tooltip title={getSpeakTooltip()}>
              <span>
                <Button
                  onClick={(e) => handleSpeak(item, e)}
                  size="small"
                  variant="contained"
                  disabled={!canSpeak || (isSpeakingLoading && speakingItemId === item.id)}
                  startIcon={getSpeakIcon()}
                  sx={getSpeakButtonStyle()}
                  aria-label={getSpeakTooltip()}
                >
                  {getSpeakButtonText()}
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default HistoryItem;