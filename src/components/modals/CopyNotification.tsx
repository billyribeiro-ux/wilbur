/**
 * ============================================================================
 * COPY NOTIFICATION - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Toast-style notification for clipboard copy actions.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clipboard } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface CopyNotificationProps {
  isVisible?: boolean;
  message?: string;
  onAnimationComplete?: () => void;
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

export function CopyNotification({
  isVisible = true,
  message = 'Copied to clipboard',
  onAnimationComplete,
}: CopyNotificationProps) {
  return (
    <AnimatePresence onExitComplete={onAnimationComplete}>
      {isVisible && (
        <motion.div
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-sm px-4"
          role="status"
          aria-live="polite"
        >
          <div className="
            bg-emerald-600/95 backdrop-blur-xl
            border border-emerald-500/50
            rounded-xl shadow-2xl
            px-5 py-4 flex items-center gap-4
          ">
            {/* Icon */}
            <div className="
              flex-shrink-0 w-10 h-10
              bg-white/20 backdrop-blur rounded-full
              flex items-center justify-center
            ">
              <div className="relative">
                <Clipboard className="w-5 h-5 text-white" />
                <Check className="w-3 h-3 text-white absolute -bottom-0.5 -right-0.5" />
              </div>
            </div>

            {/* Message */}
            <p className="flex-1 text-white font-semibold text-base">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CopyNotification;
