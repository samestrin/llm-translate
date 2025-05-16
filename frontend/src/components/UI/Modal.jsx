import React, { memo, useRef, useEffect, useCallback } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions, // Add DialogActions
  Button, // Add Button
  IconButton,
  Box,
  Typography,
  Fade,
  Backdrop
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const Modal = memo(({ 
  isOpen, 
  onClose, 
  title, 
  description, 
  children, 
  maxWidth = 'sm',
  primaryButtonText,
  primaryButtonAction,
  primaryButtonProps = {},
  secondaryButtonText,
  secondaryButtonAction 
}) => {
  // Create a ref for the initial focus element
  const initialFocusRef = useRef(null);

  // Handle escape key press for accessibility
  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, onClose]);

  // Memoize the close button handler
  const handleCloseClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      maxWidth={maxWidth}
      fullWidth
      closeAfterTransition
      slots={{ backdrop: Backdrop }}
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: { 
            backgroundColor: 'rgba(23, 23, 23, 0.25)',
            backdropFilter: 'blur(4px)'
          }
        }
      }}
      TransitionComponent={Fade}
      TransitionProps={{
        timeout: {
          enter: 300,
          exit: 200
        }
      }}
      PaperProps={{
        sx: {
          borderRadius: 1,
          bgcolor: theme => theme.palette.mode === 'dark' ? 'secondary.800' : 'background.paper',
          boxShadow: 24,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3 },
          mx: 2,
          maxHeight: 'calc(100% - 64px)',
          overflowY: 'auto',
          // Add styling for links inside the modal
          '& a': {
            color: theme => theme.palette.mode === 'dark' ? 'primary.400' : 'primary.600',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
              color: theme => theme.palette.mode === 'dark' ? 'primary.300' : 'primary.700',
            },
            '&:focus': {
              outline: `2px solid ${theme => theme.palette.mode === 'dark' ? 'primary.400' : 'primary.600'}`,
              outlineOffset: '2px',
            }
          }
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Box>
          {title && (
            <DialogTitle
              id="modal-title"
              sx={{
                p: 0,
                fontSize: { xs: '1.125rem', sm: '1.25rem' },
                fontWeight: 500,
                color: theme => theme.palette.mode === 'dark' ? 'common.white' : 'secondary.900',
                lineHeight: 1.2
              }}
            >
              {title}
            </DialogTitle>
          )}
          {description && (
            <Typography
              id="modal-description"
              variant="body2"
              sx={{
                mt: 1,
                color: theme => theme.palette.mode === 'dark' ? 'secondary.400' : 'secondary.500',
                fontSize: { xs: '0.875rem', sm: '1rem' }
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
        <IconButton
          ref={initialFocusRef}
          edge="end"
          color="inherit"
          onClick={handleCloseClick}
          aria-label="Close dialog"
          sx={{
            color: theme => theme.palette.mode === 'dark' ? 'secondary.500' : 'secondary.400',
            '&:hover': {
              color: theme => theme.palette.mode === 'dark' ? 'secondary.400' : 'secondary.500',
              bgcolor: 'transparent'
            },
            p: 0.5
          }}
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent sx={{ p: 0, mt: 1 }}>
        {children}
      </DialogContent>
      {(primaryButtonText || secondaryButtonText) && (
        <DialogActions sx={{ mt: 3, p: 0 }}>
          {secondaryButtonText && (
            <Button onClick={secondaryButtonAction || onClose} color="inherit">
              {secondaryButtonText}
            </Button>
          )}
          {primaryButtonText && (
            <Button 
              onClick={primaryButtonAction} 
              variant="contained" 
              {...primaryButtonProps}
              sx={{ ml: 1 }} // Add some margin if both buttons are present
            >
              {primaryButtonText}
            </Button>
          )}
        </DialogActions>
      )}
    </Dialog>
  );
});

// Add display name for better debugging
Modal.displayName = 'Modal';

export default Modal;