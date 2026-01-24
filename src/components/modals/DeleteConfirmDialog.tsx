/**
 * ============================================================================
 * DELETE CONFIRM DIALOG - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Confirmation dialog for destructive actions.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { AlertTriangle } from 'lucide-react';

import { ModalBase } from './ModalBase';

// ============================================================================
// TYPES
// ============================================================================

interface DeleteConfirmDialogProps {
  /** Author name for display */
  authorName: string;
  /** Alert text to show */
  alertText: string;
  /** Callback when confirmed */
  onConfirm: () => void;
  /** Callback when cancelled */
  onCancel: () => void;
  /** Controls visibility */
  isOpen?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function DeleteConfirmDialog({
  authorName,
  alertText,
  onConfirm,
  onCancel,
  isOpen = true,
}: DeleteConfirmDialogProps) {
  const footer = (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="
          px-6 py-2.5 bg-slate-600 hover:bg-slate-700
          text-white font-semibold rounded-lg transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500
        "
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        className="
          px-6 py-2.5 bg-red-600 hover:bg-red-700
          text-white font-semibold rounded-lg transition-all duration-200
          focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500
        "
        autoFocus
      >
        Delete
      </button>
    </div>
  );

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onCancel}
      title="Confirm Delete"
      size="md"
      footer={footer}
      testId="delete-confirm-dialog"
      initialFocusSelector="button[type='button']:last-of-type"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Warning Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-lg text-white leading-relaxed">
              Are you sure you want to delete this alert by{' '}
              <span className="font-bold text-white">{authorName}</span>?
            </p>
            <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
              <p className="text-slate-300 text-sm line-clamp-3">
                {alertText}
              </p>
            </div>
            <p className="mt-3 text-sm text-red-400">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </ModalBase>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DeleteConfirmDialog;
