/**
 * ============================================================================
 * MODALS INDEX - Centralized Exports
 * ============================================================================
 *
 * Barrel file for all modal components.
 * Import modals from this file for cleaner imports.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

// Base Modal Component
export { ModalBase, type ModalBaseProps, type ModalSize } from './ModalBase';

// User Modals
export { UserInfoModal } from './UserInfoModal';
export { UsersPanelModal } from './UsersPanelModal';

// Settings Modals
export { GeneralSettingsModal } from './GeneralSettingsModal';

// Chat & Communication Modals
export { PrivateChatModal } from './PrivateChatModal';

// Media Modals
export { ImageModal } from './ImageModal';

// Confirmation Dialogs
export { DeleteConfirmDialog } from './DeleteConfirmDialog';

// Notifications
export { CopyNotification } from './CopyNotification';
export { MessageNotification } from './MessageNotification';

// Re-export default components
export { default as ModalBaseDefault } from './ModalBase';
export { default as UserInfoModalDefault } from './UserInfoModal';
export { default as UsersPanelModalDefault } from './UsersPanelModal';
export { default as GeneralSettingsModalDefault } from './GeneralSettingsModal';
export { default as PrivateChatModalDefault } from './PrivateChatModal';
export { default as ImageModalDefault } from './ImageModal';
export { default as DeleteConfirmDialogDefault } from './DeleteConfirmDialog';
export { default as CopyNotificationDefault } from './CopyNotification';
export { default as MessageNotificationDefault } from './MessageNotification';
