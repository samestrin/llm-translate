import React from 'react';
import { 
  Box, 
  Grid, 
  Button, 
  Typography,
  useTheme,
  useMediaQuery 
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LanguageSelector from '../LanguageSelector';
import TextArea from '../TextArea';
import ErrorMessage from '../../UI/ErrorMessage';
import TranslationControls from './TranslationControls';

const TranslationForm = ({
  sourceText,
  handleTextChange,
  translatedText,
  sourceLang,
  setSourceLang,
  targetLang,
  setTargetLang,
  swapLanguages,
  swapText,      
  swapBoth,      
  isLoading,
  serviceInfo,
  error,
  // Controls props
  onTranslate,
  onCopy,
  onSpeak,
  onKeyboardShortcuts,
  isSpeakingLoading,
  isAudioPlaying,
  speakError,
  canSpeak
}) => {
  const theme = useTheme();
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Box 
      component="fieldset" 
      sx={{         
        m: 0, 
        p: 2,
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%',
        boxSizing: 'border-box',        
        background: 'inherit',
        border: '0px',    
      }}
    >
      <Box component="legend" sx={{ display: 'none' }}>
        Translation Interface
      </Box>
      
      <Grid 
        container 
        spacing={2} 
        justifyContent="space-between"
        alignItems="flex-start"
        sx={{           
          width: '100%', 
          margin: '0 auto',
          height: '100%'
        }}
      >
        {/* Source Text Area */}
        <Grid item xs={12} md={5.5} sx={{ 
          height: '100%',
          flexGrow: 1,
          flexBasis: 0,
          minWidth: { 
            xs: '100%',
            sm: '100%',
            md: '40%',
          }
          
        }}>
          <Box sx={{             
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            height: '100%',
            width: '100%',            
          }}>
            <LanguageSelector
              selected={sourceLang}
              onChange={setSourceLang}
              label="Translate From:"
              id="source-lang"
              disabled={isLoading}
              sx={{ width: '100%' }}
            />
            <TextArea
              value={sourceText}
              onChange={handleTextChange}
              placeholder="Enter text to translate..."
              label=""
              id="source-text"
              maxLength={1024}
              autoFocus
              ariaDescribedBy="source-text-description"
              className="static-textarea"
              sx={{ 
                flexGrow: 1,
                width: '100%',
                minHeight: '200px'
              }}
            />
          </Box>
        </Grid>

        {/* Middle section with swap buttons */}
        <Grid item xs={12} md="auto" sx={{ 
          display: 'flex', 
          flexDirection: isSmallScreen ? 'row' : 'column', 
          gap: 2, 
          justifyContent: 'center', 
          my: isSmallScreen ? 1 : 2,
          alignItems: 'center',
          px: 1,
          flexShrink: 0,
          width: isSmallScreen ? '100%' : 'auto',
          maxWidth: isSmallScreen ? '100%' : '10%'
        }}>
          {/* Swap Languages Button */}
          <Button
            variant="outlined"
            startIcon={<SwapHorizIcon />}
            onClick={swapLanguages}
            disabled={isLoading || sourceLang === 'Auto-detect' || sourceLang === targetLang}
            sx={{
              width: isSmallScreen ? '33%' : '100%',
              px: 1,
              py: 0.75,
              whiteSpace: isSmallScreen ? 'nowrap' : 'normal',
              bgcolor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
              color: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.200' : 'secondary.700',
              borderColor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.300',
              '&:hover': {
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.500' : 'secondary.400',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            {isSmallScreen ? 'LANG' : 'SWAP LANG.'}
          </Button>

          {/* Swap Text Button */}
          <Button
            variant="outlined"
            startIcon={<SwapVertIcon />}
            onClick={swapText}
            disabled={isLoading || !sourceText || !translatedText}
            sx={{
              width: isSmallScreen ? '33%' : '100%',
              px: 1,
              py: 0.75,
              whiteSpace: isSmallScreen ? 'nowrap' : 'normal',
              bgcolor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
              color: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.200' : 'secondary.700',
              borderColor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.300',
              '&:hover': {
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.500' : 'secondary.400',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            {isSmallScreen ? 'TEXT' : 'SWAP TEXT'}
          </Button>

          {/* Swap Both Button */}
          <Button
            variant="outlined"
            startIcon={<CompareArrowsIcon />}
            onClick={swapBoth}
            disabled={isLoading || sourceLang === 'Auto-detect' || sourceLang === targetLang || !sourceText || !translatedText}
            sx={{
              width: isSmallScreen ? '33%' : '100%',
              px: 1,
              py: 0.75,
              whiteSpace: isSmallScreen ? 'nowrap' : 'normal',
              bgcolor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
              color: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.200' : 'secondary.700',
              borderColor: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.300',
              '&:hover': {
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.500' : 'secondary.400',
              },
              '&.Mui-disabled': {
                opacity: 0.5,
              },
            }}
          >
            {isSmallScreen ? 'BOTH' : 'SWAP BOTH'}
          </Button>
        </Grid>

        {/* Target Text Area */}
        <Grid item xs={12} md={5.5} sx={{ 
          height: '100%',
          flexGrow: 1,
          flexBasis: 0,
          minWidth: { 
            xs: '100%',
            sm: '100%',
            md: '40%',
          }
        }}>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 1,
            height: '100%',
            width: '100%'            
          }}>
            <LanguageSelector
              selected={targetLang}
              onChange={setTargetLang}
              label="Translate To:"
              id="target-lang"
              disabled={isLoading}
              sx={{ width: '100%' }}
            />
            <TextArea
              value={translatedText}
              placeholder="Translation will appear here..."
              label=""
              id="translated-text"
              readOnly
              ariaDescribedBy="translation-info"
              className="static-textarea"
              sx={{ 
                flexGrow: 1,
                width: '100%',
                minHeight: '200px'
              }}
            />
            {serviceInfo?.service_used && (
              <Typography 
                variant="caption" 
                id="translation-info"
                sx={{ 
                  color: (theme) => 
                    theme.palette.mode === 'dark' ? 'secondary.400' : 'secondary.500',
                }}
              >
                Translated with {serviceInfo.service_used} ({serviceInfo.model_used})
              </Typography>
            )}
          </Box>
        </Grid>
      </Grid>
      
      {/* Controls component for action buttons */}
      <Box sx={{ width: '100%', mt: 2 }}>
        <TranslationControls
          onTranslate={onTranslate}
          onCopy={onCopy}
          onSpeak={onSpeak}
          onKeyboardShortcuts={onKeyboardShortcuts}
          isLoading={isLoading}
          sourceText={sourceText}
          translatedText={translatedText}
          isSpeakingLoading={isSpeakingLoading}
          isAudioPlaying={isAudioPlaying}
          speakError={speakError}
          canSpeak={canSpeak}
        />
      </Box>

      {/* Error Message */}
      {error && (
        <Box sx={{ mt: 2, width: '100%' }}>
          <ErrorMessage message={error} />
        </Box>
      )}
    </Box>
  );
};

export default React.memo(TranslationForm);