/**
 * ============================================================================
 * MODAL BASE COMPONENT - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Unified modal foundation implementing:
 * - Apple Human Interface Guidelines for modal presentation
 * - WCAG 2.1 AA accessibility compliance
 * - Focus trap for keyboard navigation
 * - Smooth animations via Framer Motion
 * - Portal rendering for proper stacking context
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';

// ============================================================================
// TYPES
// ============================================================================

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalBaseProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title for header and accessibility */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Modal content */
  children: ReactNode;
  /** Modal size preset */
  size?: ModalSize;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Allow closing by clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Allow closing with Escape key */
  closeOnEscape?: boolean;
  /** Custom footer content */
  footer?: ReactNode;
  /** Custom header content (replaces default) */
  customHeader?: ReactNode;
  /** Additional CSS classes for modal container */
  className?: string;
  /** Test ID for automated testing */
  testId?: string;
  /** Initial focus element selector */
  initialFocusSelector?: string;
  /** Prevent body scroll when open */
  preventBodyScroll?: boolean;
}

// ============================================================================
// ANIMATION VARIANTS - Apple-style smooth animations
// ============================================================================

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      damping: 25,
      stiffness: 300,
      mass: 0.5,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// SIZE CONFIGURATION
// ============================================================================

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[95vw] sm:max-w-[90vw]',
};

// ============================================================================
// FOCUS TRAP HOOK
// ============================================================================

function useFocusTrap(
  modalRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  initialFocusSelector?: string
) {
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Set initial focus
    const initialFocus = initialFocusSelector
      ? modal.querySelector<HTMLElement>(initialFocusSelector)
      : firstElement;

    // Delay focus to ensure modal is rendered
    const focusTimeout = setTimeout(() => {
      initialFocus?.focus();
    }, 50);

    // Handle tab key for focus trap
    const handleTabKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    return () => {
      clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, modalRef, initialFocusSelector]);
}

// ============================================================================
// BODY SCROLL LOCK HOOK
// ============================================================================

function useBodyScrollLock(isOpen: boolean, preventScroll: boolean) {
  useEffect(() => {
    if (!preventScroll) return;

    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen, preventScroll]);
}

// ============================================================================
// MODAL BASE COMPONENT
// ============================================================================

export function ModalBase({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  customHeader,
  className = '',
  testId,
  initialFocusSelector,
  preventBodyScroll = true,
}: ModalBaseProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = `modal-title-${title?.replace(/\s+/g, '-').toLowerCase() || 'untitled'}`;
  const descriptionId = subtitle ? `modal-desc-${title?.replace(/\s+/g, '-').toLowerCase() || 'untitled'}` : undefined;

  // Focus trap
  useFocusTrap(modalRef, isOpen, initialFocusSelector);

  // Body scroll lock
  useBodyScrollLock(isOpen, preventBodyScroll);

  // Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  // Backdrop click handler
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (closeOnBackdropClick && e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdropClick, onClose]
  );

  // Portal target
  const portalTarget = typeof document !== 'undefined' ? document.body : undefined;

  if (!portalTarget) return undefined;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleBackdropClick}
          onKeyDown={handleKeyDown}
          role="presentation"
          data-testid={testId ? `${testId}-backdrop` : undefined}
        >
          <motion.div
            ref={modalRef}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={descriptionId}
            className={`
              relative w-full ${sizeClasses[size]} max-h-[90vh]
              bg-slate-900 rounded-2xl shadow-2xl
              border border-slate-700/50
              flex flex-col overflow-hidden
              ${className}
            `}
            onClick={(e) => e.stopPropagation()}
            data-testid={testId}
          >
            {/* Header */}
            {customHeader ?? (
              title && (
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                  <div className="flex-1 min-w-0">
                    <h2
                      id={titleId}
                      className="text-lg font-semibold text-white truncate"
                    >
                      {title}
                    </h2>
                    {subtitle && (
                      <p
                        id={descriptionId}
                        className="text-sm text-slate-400 mt-0.5 truncate"
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                  {showCloseButton && (
                    <button
                      type="button"
                      onClick={onClose}
                      className="
                        ml-4 p-2 -mr-2
                        text-slate-400 hover:text-white
                        hover:bg-slate-800 rounded-lg
                        transition-colors duration-150
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                      "
                      aria-label="Close modal"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              )
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    portalTarget
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ModalBase;
