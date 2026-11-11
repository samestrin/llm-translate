import React, { memo, useMemo, useCallback } from 'react';
import { FormControl, FormLabel, Select, MenuItem } from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';

// Updated languages array with Auto-detect and reordered priorities
const languages = [
  'Auto-detect',
  'English',
  'Hebrew',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Russian',
  'Japanese',
  'Chinese',
  'Korean',
  'Arabic',
  'Hindi',
  'Dutch',
  'Swedish',
  'Polish',
  'Turkish',
  'Vietnamese',
  'Thai',
  'Indonesian',
  'Greek',
];

/**
 * A language picker: a normal-size label above an outlined select, as the family's forms do.
 * The selected language is marked by its background, not a check icon. Only the source picker
 * offers Auto-detect.
 */
const LanguageSelector = ({ selected, onChange, label, id, disabled = false }) => {
  const isSourceSelector = useMemo(() => label.toLowerCase().includes('from'), [label]);

  const filteredLanguages = useMemo(
    () => (isSourceSelector ? languages : languages.filter((lang) => lang !== 'Auto-detect')),
    [isSourceSelector]
  );

  const selectId = `${id || 'language'}-selector`;
  const labelId = `${selectId}-label`;

  const handleChange = useCallback((event) => {
    onChange(event.target.value);
  }, [onChange]);

  return (
    <FormControl fullWidth size="small" disabled={disabled} sx={{ gap: 0.5 }}>
      <FormLabel id={labelId}>{label}</FormLabel>
      <Select labelId={labelId} id={selectId} value={selected} onChange={handleChange}>
        {filteredLanguages.map((language) => (
          <MenuItem key={language} value={language}>
            {language === 'Auto-detect' && (
              <LanguageIcon aria-hidden="true" sx={{ height: 16, width: 16, mr: 1, color: 'var(--color-accent)' }} />
            )}
            {language}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

LanguageSelector.displayName = 'LanguageSelector';

export default memo(LanguageSelector);
