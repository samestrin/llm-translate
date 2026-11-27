import React from 'react';
import { Button, Checkbox, FormControl, FormControlLabel, FormLabel, MenuItem, Select, TextField } from '@mui/material';
import { useModelAccess } from '../../contexts/ModelAccessContext';

/** The public notice, word for word from the epic 08 shared design (owner answer Q4). */
export const PUBLIC_NOTICE = 'Public demo: do not upload private files. Files are translated in memory and not stored.';

/**
 * The key panel of the shared design: a preset dropdown, the visitor's key or demo code,
 * a remember box and a clear button. It appears only when the server says it is a public
 * demo (`GET /v1/presets`); the env-key mode keeps today's page. The key is stored in the
 * browser only (session storage, or local storage when remembered) and sent per request
 * in a header — never in a URL or body.
 */
const KeyPanel = () => {
  const { publicDemo, presets, preset, key, remember, setPreset, setKey, setRemember, clear } = useModelAccess();
  if (!publicDemo) return null;

  const selected = presets.find((p) => p.id === preset);
  const keyLabel = preset === 'demo' ? 'Demo code' : `${selected?.label ?? 'Provider'} API key`;

  return (
    <section aria-label="Model access" className="panel flex flex-col gap-3">
      <p className="m-0 text-sm text-ink-muted">{PUBLIC_NOTICE}</p>
      {/* Shell (docs/demo-shell.md): one wrapped row from 48rem, a full-width column below.
          The 42 px control height is local to this panel so the language pickers keep 40 px. */}
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <FormControl size="small" sx={{ minWidth: 220, gap: 0.5, '& .MuiOutlinedInput-root': { height: 42 } }}>
          <FormLabel id="model-preset-label">Provider</FormLabel>
          <Select
            labelId="model-preset-label"
            id="model-preset-selector"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
          >
            {presets.map((p) => (
              <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          id="model-key-input"
          label={keyLabel}
          type="password"
          size="small"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
          className="md:flex-1"
          sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { height: 42 } }}
        />
        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(e) => setRemember(e.target.checked)} />}
          label="Remember on this device"
          // In the stacked column the label spans the full width like the other controls.
          sx={(theme) => ({ [theme.breakpoints.down('md')]: { marginLeft: 0, marginRight: 0 } })}
        />
        <Button variant="outlined" onClick={clear} sx={{ height: 42 }}>Clear</Button>
      </div>
    </section>
  );
};

export default KeyPanel;
