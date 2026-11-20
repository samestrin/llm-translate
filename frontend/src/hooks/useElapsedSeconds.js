import { useEffect, useState } from 'react';

/** Whole seconds since `active` turned true, counted once a second; 0 while it is false. */
const useElapsedSeconds = (active) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const started = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => {
      clearInterval(timer);
      setSeconds(0);
    };
  }, [active]);

  return active ? seconds : 0;
};

export default useElapsedSeconds;
