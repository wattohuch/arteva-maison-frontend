import { useEffect, useRef } from 'react';
import { CloseIcon } from '../../../components/ui/Icons';

/**
 * Reusable admin modal — matches the vanilla admin-modal pattern.
 * Closes on overlay click, Escape key, or the X button.
 */
export default function AdminModal({ open, onClose, title, wide, children, footer }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`admin-modal${wide ? ' admin-modal--wide' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <h2 className="admin-modal-title">{title}</h2>
          <button className="admin-icon-btn" onClick={onClose} title="Close">
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
