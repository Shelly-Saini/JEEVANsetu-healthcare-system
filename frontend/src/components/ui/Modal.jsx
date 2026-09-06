import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — the one modal shell for the whole app. Handles the keyboard/focus
 * behavior every modal should have (Escape to close, focus moved into the
 * dialog on open, backdrop click to dismiss) once, instead of each
 * "Add ___" form re-implementing it slightly differently.
 */
export default function Modal({ title, onClose, children, maxWidth = 'max-w-sm' }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    // Move focus into the dialog so keyboard/screen-reader users land somewhere sensible.
    const firstField = dialogRef.current?.querySelector('input, select, textarea, button');
    firstField?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-surface-950/40 flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`bg-white rounded-2xl shadow-popover border border-surface-200 p-6 w-full ${maxWidth} animate-slide-up`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-surface-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
