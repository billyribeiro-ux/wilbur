/**
 * ============================================================================
 * MESSAGE NOTIFICATION - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Toast-style notification for incoming messages.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

interface MessageNotificationProps {
  authorName: string;
  message: string;
  authorAvatar?: string;
  isVisible?: boolean;
  onClose?: () => void;
  onClick?: () => void;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const variants = {
  initial: {
    opacity: 0,
    y: -20,
    scale: 0.95,
  },
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
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function MessageNotification({
  authorName,
  message,
  authorAvatar,
  isVisible = true,
  onClose,
  onClick,
}: MessageNotificationProps) {
  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  const handleClose = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  }, [onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose?.();
    }
  }, [onClick, onClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-md px-4"
          role="alert"
          aria-live="polite"
        >
          <div
            className={`
              bg-blue-600/95 backdrop-blur-xl
              border border-blue-500/50
              rounded-xl shadow-2xl
              px-5 py-4 flex items-start gap-4
              ${onClick ? 'cursor-pointer hover:bg-blue-600 transition-colors' : ''}
            `}
            onClick={onClick ? handleClick : undefined}
            onKeyDown={onClick ? handleKeyDown : undefined}
            tabIndex={onClick ? 0 : undefined}
            role={onClick ? 'button' : undefined}
          >
            {/* Avatar or Icon */}
            <div className="flex-shrink-0">
              {authorAvatar ? (
                <img
                  src={authorAvatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="
                  w-10 h-10
                  bg-white/20 backdrop-blur rounded-full
                  flex items-center justify-center
                ">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm">
                {authorName}
              </p>
              <p className="text-white/90 text-sm mt-0.5 line-clamp-2">
                {message}
              </p>
            </div>

            {/* Close Button */}
            {onClose && (
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
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MessageNotification;
