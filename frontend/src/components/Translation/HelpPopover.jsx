import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * A small "?" button beside a field. It opens a popover with a few plain lines on what the
 * field does, one short example, and a "Read the guide" link to /guide.
 *
 * A native button, so click, Enter and Space all open it. Escape closes it and returns focus
 * to the button; a click outside closes it without stealing focus from the clicked control.
 * The popover is positioned against the nearest `relative` ancestor (the fieldset) and spans
 * the panel width, so it stays inside the viewport on a 375 px phone. Its markup is phrasing
 * content (spans) because the trigger lives inside a <legend>.
 */
const HelpPopover = ({ field, lines, example }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return undefined;
    popoverRef.current?.focus();

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointerDown = (event) => {
      if (popoverRef.current?.contains(event.target) || buttonRef.current?.contains(event.target)) return;
      const focusInside = popoverRef.current?.contains(document.activeElement);
      setOpen(false);
      if (focusInside) buttonRef.current?.focus();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  const buttonTone = open
    ? 'border-brand bg-brand-soft text-brand'
    : 'border-line bg-surface text-ink-muted hover:border-brand hover:bg-brand-soft hover:text-brand';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${field} help`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-semibold leading-none transition-colors ${buttonTone}`}
      >
        <span aria-hidden="true">?</span>
      </button>
      {open && (
        <span
          ref={popoverRef}
          id={popoverId}
          role="dialog"
          aria-label={`${field} help`}
          tabIndex={-1}
          className="absolute left-0 top-7 z-20 block w-full max-w-sm rounded-md border border-line bg-surface p-3 text-left shadow-lg"
        >
          <span className="block text-sm font-semibold text-ink">{field}</span>
          {lines.map((line) => (
            <span key={line} className="mt-1 block text-sm text-ink-muted">
              {line}
            </span>
          ))}
          <span className="mt-2 block rounded bg-surface-muted px-2 py-1 text-xs text-ink">{example}</span>
          <Link
            to="/guide"
            onClick={() => setOpen(false)}
            className="mt-2 inline-block text-sm font-medium text-brand underline-offset-4 hover:underline"
          >
            Read the guide
          </Link>
        </span>
      )}
    </>
  );
};

export default HelpPopover;
