import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const STATES = {
  checking: { text: 'Checking the translation service…', dot: 'bg-secondary-400' },
  up: { text: 'Translation service reachable', dot: 'bg-green-600' },
  down: { text: 'Translation service unreachable', dot: 'bg-red-600' },
};

/** Whether the backend answers `GET /`, checked once when the page opens. It calls no model. */
const ServiceStatus = () => {
  const [state, setState] = useState('checking');

  useEffect(() => {
    let live = true;
    api.health()
      .then(() => live && setState('up'))
      .catch(() => live && setState('down'));
    return () => {
      live = false;
    };
  }, []);

  const { text, dot } = STATES[state];
  return (
    <p aria-live="polite" className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-ink-muted">
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
};

export default ServiceStatus;
