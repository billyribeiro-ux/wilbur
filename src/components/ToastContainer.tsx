/**
 * ============================================================================
 * TOAST CONTAINER - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Unified toast notification renderer with Apple-style animations.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useCallback } from 'react';

import { useToastStore, type Toast, type ToastType } from '../store/toastStore';

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const toastVariants = {
  initial: (position: string) => ({
    opacity: 0,
    y: position.includes('top') ? -20 : 20,
    scale: 0.95,
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
    },
  },
  exit: (position: string) => ({
    opacity: 0,
    y: position.includes('top') ? -20 : 20,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  }),
};

// ============================================================================
// TOAST STYLES
// ============================================================================

interface ToastStyle {
  bg: string;
  border: string;
  iconColor: string;
  Icon: typeof CheckCircle;
}

const toastStyles: Record<ToastType, ToastStyle> = {
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
  warning: {
    bg: 'bg-amber-900/95',
    border: 'border-amber-600/50',
    iconColor: 'text-amber-400',
    Icon: AlertTriangle,
  },
  info: {
    bg: 'bg-blue-900/95',
    border: 'border-blue-600/50',
    iconColor: 'text-blue-400',
    Icon: Info,
  },
};

// ============================================================================
// POSITION STYLES
// ============================================================================

const positionStyles = {
  'top-right': 'top-4 right-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-right': 'bottom-4 right-4',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

// ============================================================================
// SINGLE TOAST COMPONENT
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  position: string;
  onClose: (id: string) => void;
}

function ToastItem({ toast, position, onClose }: ToastItemProps) {
  const styles = toastStyles[toast.type];
  const Icon = styles.Icon;

  const handleClose = useCallback(() => {
    onClose(toast.id);
  }, [toast.id, onClose]);

  const handleActionClick = useCallback(() => {
    toast.action?.onClick();
    onClose(toast.id);
  }, [toast.action, toast.id, onClose]);

  return (
    <motion.div
      layout
      variants={toastVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={position}
      className={`
        ${styles.bg} ${styles.border}
        border backdrop-blur-xl
        px-4 py-3 rounded-xl shadow-2xl
        min-w-[300px] max-w-[400px]
        flex items-start gap-3
      `}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5">
        <Icon className={`w-5 h-5 ${styles.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <h3 className="text-white font-semibold text-sm mb-0.5">
            {toast.title}
          </h3>
        )}
        <p className="text-white/90 text-sm leading-relaxed">
          {toast.message}
        </p>
        {toast.action && (
          <button
            type="button"
            onClick={handleActionClick}
            className="
              mt-2 text-sm font-medium text-white/80 hover:text-white
              underline underline-offset-2 transition-colors
              focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded
            "
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={handleClose}
        className="
          flex-shrink-0 p-1 rounded-lg
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
// TOAST CONTAINER COMPONENT
// ============================================================================

export function ToastContainer() {
  const { toasts, position, removeToast } = useToastStore();

  const handleClose = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  return (
    <div
      className={`
        fixed ${positionStyles[position]} z-[9999]
        flex flex-col gap-3
        pointer-events-none
      `}
      aria-label="Notifications"
      role="region"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem
              toast={toast}
              position={position}
              onClose={handleClose}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ToastContainer;
