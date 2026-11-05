import React from 'react';
import { FormControlLabel, Switch, Typography } from '@mui/material';

/**
 * The Review switch, off by default: on sends `review=on` with text and file
 * translations, which back-translates and checks every segment on the review tier.
 */
const ReviewSwitch = ({ checked, onChange, disabled }) => (
  <div>
    <FormControlLabel
      control={<Switch checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />}
      label="Review the translation"
    />
    <Typography variant="body2" className="text-secondary-600 dark:text-secondary-400">
      Back-translates and checks every segment, and flags lines a person should read. It takes longer and spends more tokens.
    </Typography>
  </div>
);

export default ReviewSwitch;
