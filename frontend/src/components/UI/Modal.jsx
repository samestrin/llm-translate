import React, { memo, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

const widths = {
  xs: 'max-w-md',
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const buttonBase = 'rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';

// A modal dialog: focus moves to the close button on open, Tab stays inside, Escape and
// the backdrop close it, and focus returns to whatever opened it.
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
  secondaryButtonAction,
}) => {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      const inside = dialogRef.current.contains(document.activeElement);
      if (e.shiftKey && (document.activeElement === first || !inside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !inside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      opener?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { color, className: primaryClass = '', ...primaryRest } = primaryButtonProps;
  const primaryTone =
    color === 'error'
      ? 'bg-red-700 text-white hover:bg-red-800'
      : 'bg-brand text-brand-ink hover:opacity-90';

  return createPortal(
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-secondary-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-[calc(100%-4rem)] w-full overflow-y-auto rounded-lg border border-line bg-surface p-4 text-ink shadow-2xl sm:p-6 ${widths[maxWidth] || widths.sm}`}
      >
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 id={titleId} className="text-lg font-semibold leading-tight sm:text-xl">
                {title}
              </h2>
            )}
            {description && (
              <p id={descriptionId} className="mt-2 text-sm text-ink-muted sm:text-base">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-2 [&_a]:text-brand [&_a]:underline-offset-4 [&_a:hover]:underline">{children}</div>

        {(primaryButtonText || secondaryButtonText) && (
          <div className="mt-6 flex justify-end gap-2">
            {secondaryButtonText && (
              <button
                type="button"
                onClick={secondaryButtonAction || onClose}
                className={`${buttonBase} text-ink hover:bg-surface-muted`}
              >
                {secondaryButtonText}
              </button>
            )}
            {primaryButtonText && (
              <button
                type="button"
                onClick={primaryButtonAction}
                className={`${buttonBase} ${primaryTone} ${primaryClass}`}
                {...primaryRest}
              >
                {primaryButtonText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
});

Modal.displayName = 'Modal';

export default Modal;
