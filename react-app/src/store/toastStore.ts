/**
 * ============================================================================
 * TOAST STORE - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Centralized toast notification system using Zustand.
 * Implements Apple-style notifications with proper animations.
 *
 * Features:
 *  - Supports success, error, info, and warning toasts
 *  - Auto-dismiss with configurable delay
 *  - Duplicate prevention
 *  - Queue management with max visible toasts
 *  - Fully type-safe
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  createdAt: number;
  title?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastStore {
  toasts: Toast[];
  position: ToastPosition;
  maxVisible: number;

  // Actions
  addToast: (
    message: string,
    type?: ToastType,
    options?: {
      duration?: number;
      title?: string;
      action?: Toast['action'];
    }
  ) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setPosition: (position: ToastPosition) => void;

  // Convenience methods
  success: (message: string, options?: { duration?: number; title?: string }) => string;
  error: (message: string, options?: { duration?: number; title?: string }) => string;
  info: (message: string, options?: { duration?: number; title?: string }) => string;
  warning: (message: string, options?: { duration?: number; title?: string }) => string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_DURATION = 5000;
const MAX_VISIBLE_TOASTS = 5;

// ============================================================================
// STORE
// ============================================================================

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  position: 'bottom-right',
  maxVisible: MAX_VISIBLE_TOASTS,

  /**
   * Add a toast notification
   * Returns the toast ID for programmatic removal
   */
  addToast: (message, type = 'info', options = {}) => {
    const { duration = DEFAULT_DURATION, title, action } = options;

    // Prevent duplicate toasts with same message and type
    const existingToast = get().toasts.find(
      (t) => t.message === message && t.type === type
    );

    if (existingToast) {
      if (import.meta.env.DEV) {
        console.debug('[ToastStore] Duplicate toast prevented:', { message, type });
      }
      return existingToast.id;
    }

    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now(),
      title,
      action,
    };

    set((state) => {
      // Keep only the most recent toasts up to maxVisible
      const toasts = [...state.toasts, newToast];
      if (toasts.length > state.maxVisible) {
        toasts.shift();
      }
      return { toasts };
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }

    return id;
  },

  /**
   * Remove a toast by ID
   */
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },

  /**
   * Clear all toasts
   */
  clearToasts: () => {
    set({ toasts: [] });
  },

  /**
   * Set toast position
   */
  setPosition: (position) => {
    set({ position });
  },

  // Convenience methods
  success: (message, options) => get().addToast(message, 'success', options),
  error: (message, options) => get().addToast(message, 'error', options),
  info: (message, options) => get().addToast(message, 'info', options),
  warning: (message, options) => get().addToast(message, 'warning', options),
}));

// ============================================================================
// EXPORTS
// ============================================================================

export default useToastStore;
