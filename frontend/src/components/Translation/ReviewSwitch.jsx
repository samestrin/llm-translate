import React, { useId } from 'react';
import { FormControlLabel, Switch } from '@mui/material';

/**
 * The Review switch, off by default: on sends `review=on` with text and file
 * translations, which back-translates and checks every segment on the review tier.
 */
const ReviewSwitch = ({ checked, onChange, disabled }) => {
  const hintId = useId();
  return (
    <div className="flex flex-wrap items-center gap-x-3">
      <FormControlLabel
        sx={{ mr: 0 }}
        control={
          <Switch
            size="small"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            slotProps={{ input: { 'aria-describedby': hintId } }}
          />
        }
        label="Review the translation"
      />
      <span id={hintId} className="text-sm text-ink-muted">
        Back-translates and checks every segment, and flags lines a person should read. It takes longer and spends more tokens.
      </span>
    </div>
  );
};

export default ReviewSwitch;
