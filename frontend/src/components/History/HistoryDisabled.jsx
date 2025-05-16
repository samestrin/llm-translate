import React from 'react';
import { Paper, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const HistoryDisabled = () => {
  const navigate = useNavigate();

  return (
    <div className="py-4 px-4 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-secondary-800 dark:text-secondary-200">Translation History</h1>
      <Paper elevation={3} sx={{ p: 6, borderRadius: 2, bgcolor: 'background.paper' }} className="bg-white dark:bg-secondary-800 rounded-lg shadow-md">
        <div className="text-center py-8">
          <Typography className="text-secondary-600 dark:text-secondary-400 mb-6">
            Translation history is currently disabled in your settings.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/settings')}
          >
            Go to Settings
          </Button>
        </div>
      </Paper>
    </div>
  );
};

export default HistoryDisabled;