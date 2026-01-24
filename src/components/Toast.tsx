/**
 * ============================================================================
 * TOAST COMPONENT - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Individual toast notification component.
 * This is a legacy component for backward compatibility.
 * New code should use ToastContainer with useToastStore.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 * @deprecated Use ToastContainer and useToastStore instead
 */

import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  duration?: number;
}

// ============================================================================
// TOAST STYLES
// ============================================================================

const typeStyles = {
  success: {
    bg: 'bg-emerald-900/95',
    border: 'border-emerald-600/50',
    iconColor: 'text-emerald-400',
    Icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-900/95',
    border: 'border-red-600/50',
    iconColor: 'text-red-400',
    Icon: XCircle,
  },
  info: {
    bg: 'bg-blue-900/95',
    border: 'border-blue-600/50',
    iconColor: 'text-blue-400',
    Icon: Info,
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function Toast({ id, message, type, onClose, duration = 4000 }: ToastProps) {
  const styles = typeStyles[type];
  const Icon = styles.Icon;

  // Auto-dismiss
  useEffect(() => {
    if (duration <= 0) return;

    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, onClose, duration]);

  const handleClose = useCallback(() => {
    onClose(id);
  }, [id, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      data-toast-id={id}
      className={`
        ${styles.bg} ${styles.border}
        border backdrop-blur-xl
        px-4 py-3 rounded-xl shadow-2xl
        min-w-[280px] max-w-[380px]
        flex items-center gap-3
      `}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <Icon className={`w-5 h-5 flex-shrink-0 ${styles.iconColor}`} />

      {/* Message */}
      <p className="flex-1 text-white/90 text-sm font-medium leading-snug">
        {message}
      </p>

      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="
          flex-shrink-0 p-1.5 rounded-lg
          text-white/60 hover:text-white hover:bg-white/10
          transition-colors
          focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50
        "
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default Toast;
