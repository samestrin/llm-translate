import React from 'react';
import Modal from '../../../components/UI/Modal';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Box,
  Typography,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const KeyboardShortcutsModal = ({ open, onClose }) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="keyboard-shortcuts-title"
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: (theme) => 
            theme.palette.mode === 'dark' ? 'secondary.800' : 'background.paper',
          borderRadius: 2,
          boxShadow: 5,
        }
      }}
    >
      <DialogTitle 
        id="keyboard-shortcuts-title"
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}
      >
        <Typography 
          variant="h6" 
          component="div"
          sx={{ 
            color: (theme) => 
              theme.palette.mode === 'dark' ? 'common.white' : 'secondary.900'
          }}
        >
          Keyboard Shortcuts
        </Typography>
        <IconButton
          aria-label="Close keyboard shortcuts"
          onClick={onClose}
          size="small"
          sx={{ 
            color: (theme) => 
              theme.palette.mode === 'dark' ? 'secondary.400' : 'secondary.500',
            '&:hover': {
              color: (theme) => 
                theme.palette.mode === 'dark' ? 'secondary.200' : 'secondary.700',
            }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.300' : 'secondary.700'
              }}
            >
              Translate
            </Typography>
            <Paper
              component="kbd"
              variant="outlined"
              sx={{
                px: 1, 
                py: 0.5,
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                borderRadius: 0.5
              }}
            >
              Ctrl/⌘ + Enter
            </Paper>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.300' : 'secondary.700'
              }}
            >
              Show/Hide Shortcuts
            </Typography>
            <Paper
              component="kbd"
              variant="outlined"
              sx={{
                px: 1, 
                py: 0.5,
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200', 
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                borderRadius: 0.5
              }}
            >
              Ctrl/⌘ + /
            </Paper>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography 
              variant="body2" 
              sx={{ 
                color: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.300' : 'secondary.700'
              }}
            >
              Close Shortcuts
            </Typography>
            <Paper
              component="kbd"
              variant="outlined"
              sx={{
                px: 1, 
                py: 0.5,
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.700' : 'secondary.100',
                borderColor: (theme) => 
                  theme.palette.mode === 'dark' ? 'secondary.600' : 'secondary.200',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                borderRadius: 0.5
              }}
            >
              Esc
            </Paper>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(KeyboardShortcutsModal);