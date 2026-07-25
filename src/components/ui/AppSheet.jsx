import { useEffect, useRef, useCallback, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon, ArrowLeftIcon } from './Icons';
import './AppSheet.css';

/**
 * AppSheet — the full-screen view that replaces the admin popup modals.
 *
 * The old `AdminModal` was a centred box capped at 580px with its own scroll
 * area. On a phone that produced a small window floating inside a dimmed page,
 * with two nested scrollers and a close button up in the far corner. This
 * presents the same content as a screen:
 *
 *  · full-bleed below the tablet breakpoint, a centred panel above it
 *  · one scroll container, so momentum scrolling behaves natively
 *  · a sticky header with a back affordance sized for a thumb, and a sticky
 *    footer that keeps the primary action reachable without scrolling
 *  · slides up from the bottom on mobile (where the gesture matches the
 *    platform) and scales in on desktop
 *
 * Accessibility: rendered in a portal as a modal dialog, focus is moved in on
 * open and returned to the trigger on close, Tab is trapped, and Escape exits.
 */

/** Elements that can hold focus inside the sheet. */
const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function AppSheet({
  open,
  onClose,
  title,
  subtitle,
  /** Rendered on the trailing edge of the header (e.g. a delete button). */
  headerAction,
  /** Sticky action bar. Omit for a plain scrolling view. */
  footer,
  /** 'full' fills the viewport on desktop too — used by the receipt generator. */
  size = 'default',
  children,
}) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);
  const titleId = useId();

  const handleClose = useCallback(() => { onClose?.(); }, [onClose]);

  // Lock the page behind the sheet. Compensating for the scrollbar width
  // prevents the layout shifting sideways as it opens on desktop.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollBarWidth = window.innerWidth - documentElement.clientWidth;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingInlineEnd;

    body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) body.style.paddingInlineEnd = `${scrollBarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingInlineEnd = prevPadding;
    };
  }, [open]);

  // Focus management + Escape + Tab trap.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement;

    // Focus the panel itself rather than the first control: landing on a text
    // input would pop the keyboard open on mobile before the user asked for it.
    const focusTimer = requestAnimationFrame(() => panelRef.current?.focus());

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
        .filter(el => el.offsetParent !== null);
      if (!items.length) return;

      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      cancelAnimationFrame(focusTimer);
      document.removeEventListener('keydown', onKeyDown, true);
      // Return focus to whatever opened the sheet, so keyboard users are not
      // dumped back at the top of the document.
      previouslyFocused.current?.focus?.();
    };
  }, [open, handleClose]);

  if (!open) return null;

  return createPortal(
    <div className="app-sheet-root" role="presentation">
      <div className="app-sheet-scrim" onClick={handleClose} aria-hidden="true" />

      <div
        ref={panelRef}
        className={`app-sheet app-sheet--${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <header className="app-sheet-header">
          <button
            type="button"
            className="app-sheet-back"
            onClick={handleClose}
            aria-label="Close"
          >
            {/* Back arrow on mobile reads as navigation; an X on desktop reads
                as dismissing an overlay. Both are the same control. */}
            <span className="app-sheet-back-mobile"><ArrowLeftIcon size={20} /></span>
            <span className="app-sheet-back-desktop"><CloseIcon size={18} /></span>
          </button>

          <div className="app-sheet-heading">
            <h2 className="app-sheet-title" id={titleId}>{title}</h2>
            {subtitle && <p className="app-sheet-subtitle">{subtitle}</p>}
          </div>

          {headerAction && <div className="app-sheet-header-action">{headerAction}</div>}
        </header>

        <div className="app-sheet-body">{children}</div>

        {footer && <footer className="app-sheet-footer">{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

/**
 * Confirmation sheet for destructive actions.
 *
 * When `confirmText` is given the action stays disabled until the operator
 * types it back. That friction is deliberate: it is used for order deletion,
 * where the cost of a mis-tap is an accounting record that cannot be recovered.
 */
export function ConfirmSheet({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', confirmText, danger = true, busy = false,
}) {
  const [typed, setTyped] = useState('');

  // Clear the field each time the sheet opens, so a previous confirmation can
  // never leave the button pre-armed.
  useEffect(() => { if (open) setTyped(''); }, [open]);

  const satisfied = !confirmText || typed.trim().toUpperCase() === confirmText.toUpperCase();

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title={title}
      size="compact"
      footer={
        <>
          <button type="button" className="btn btn--outline" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            onClick={onConfirm}
            disabled={!satisfied || busy}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="app-sheet-message">{message}</p>

      {confirmText && (
        <label className="app-sheet-confirm-field">
          <span>Type <strong>{confirmText}</strong> to confirm</span>
          <input
            type="text"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </label>
      )}
    </AppSheet>
  );
}
