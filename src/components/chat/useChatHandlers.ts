/**
 * Chat Handlers Hook - Microsoft Enterprise Pattern
 * Custom hook containing all chat message handlers
 */

import { format } from 'date-fns';
import { useCallback } from 'react';

import { messagesApi } from '../../api/messages';
import { useRoomStore } from '../../store/roomStore';
import type { ToastType } from '../../store/toastStore';
import type { Database } from '../../types/database.types';

type UserRow = Database['public']['Tables']['users']['Row'];
type RoomRow = Database['public']['Tables']['rooms']['Row'];
import type { ChatMessage as ChatMessageType } from '../../types/database.types';

import type { LoadingStates } from '../../features/chat/chat.types';
import {
  MessageType,
  LoadingState,
  MAX_PINNED_MESSAGES,
  SMOOTH_SCROLL_BEHAVIOR
} from './constants';

interface UseChatHandlersProps {
  user: UserRow | undefined;
  currentRoom: RoomRow | undefined;
  messages: ChatMessageType[];
  input: string;
  pendingFile?: File;
  uploadedFileUrl?: string;
  activeTab: string;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  justSentMessageRef: React.MutableRefObject<boolean>;
  setInput: (value: string) => void;
  setImagePreview: (value: string | undefined) => void;
  setPendingFile: (value: File | undefined) => void;
  setUploadedFileUrl: (value: string | undefined) => void;
  setIsUserScrolledUp: (value: boolean) => void;
  setLoadingStates: (updater: (prev: LoadingStates) => LoadingStates) => void;
  addToast: (message: string, type?: ToastType) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function useChatHandlers(props: UseChatHandlersProps) {
  const {
    user,
    currentRoom,
    messages,
    input,
    pendingFile,
    uploadedFileUrl,
    activeTab,
    messagesEndRef,
    justSentMessageRef,
    setInput,
    setImagePreview,
    setPendingFile,
    setUploadedFileUrl,
    setIsUserScrolledUp,
    setLoadingStates,
    addToast,
    fileInputRef
  } = props;

  /**
   * Handles sending a message
   */
  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && !pendingFile) || !user || !currentRoom) return;

    setLoadingStates((prev) => ({ ...prev, sending: LoadingState.Loading }));

    try {
      const fileUrl = uploadedFileUrl;
      const isImage = pendingFile?.type.startsWith('image/');

      const contentType = fileUrl ? (isImage ? MessageType.Image : MessageType.File) : MessageType.Text;
      const content = input.trim() || (fileUrl ? (isImage ? 'Sent an image' : 'Sent a file') : '');

      const data = await messagesApi.create(currentRoom.id, content, contentType);

      if (data) {
        const { addMessage } = useRoomStore.getState();
        addMessage(data as unknown as ChatMessageType);
        justSentMessageRef.current = true;

        requestAnimationFrame(() => {
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({
                behavior: SMOOTH_SCROLL_BEHAVIOR,
                block: 'end'
              });
              setIsUserScrolledUp(false);
            }
          }, 50);
        });
      }

      setInput('');
      setImagePreview(undefined);
      setPendingFile(undefined);
      setUploadedFileUrl(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setLoadingStates((prev) => ({ ...prev, sending: LoadingState.Success }));
      setTimeout(() => {
        setLoadingStates((prev) => ({ ...prev, sending: LoadingState.Idle }));
      }, 1000);
    } catch (error: unknown) {
      setLoadingStates((prev) => ({ ...prev, sending: LoadingState.Error }));
      const message = error instanceof Error ? error.message : 'Failed to send message';
      addToast(message, 'error');
    }
  }, [input, pendingFile, user, currentRoom, uploadedFileUrl, activeTab, messagesEndRef, justSentMessageRef, setInput, setImagePreview, setPendingFile, setUploadedFileUrl, setIsUserScrolledUp, setLoadingStates, addToast, fileInputRef]);

  /**
   * Handles deleting a message
   */
  const handleDelete = useCallback(async (messageId: string) => {
    if (!user || !currentRoom) return;

    const message = messages.find(m => m.id === messageId);
    if (!message || message.user_id !== user.id) return;

    setLoadingStates((prev) => ({
      ...prev,
      deleting: new Set(prev.deleting).add(messageId)
    }));

    try {
      await messagesApi.delete(currentRoom.id, messageId);

      const { updateMessage } = useRoomStore.getState();
      updateMessage(messageId, {
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        is_deleted: true
      });

      addToast('Message deleted', 'success');
    } catch (error: unknown) {
      addToast('Failed to delete message', 'error');
    } finally {
      setLoadingStates((prev) => {
        const newDeleting = new Set(prev.deleting);
        newDeleting.delete(messageId);
        return { ...prev, deleting: newDeleting };
      });
    }
  }, [user, messages, setLoadingStates, addToast]);

  /**
   * Handles pinning/unpinning a message
   */
  const handlePin = useCallback(async (message: ChatMessageType) => {
    if (!user || !currentRoom) return;

    const pinnedMessages = messages.filter(m => m.pinned_by);

    if (!message.pinned_by && pinnedMessages.length >= MAX_PINNED_MESSAGES) {
      addToast(`Maximum ${MAX_PINNED_MESSAGES} pinned messages allowed`, 'error');
      return;
    }

    try {
      if (message.pinned_by) {
        await messagesApi.unpin(currentRoom.id, message.id);
      } else {
        await messagesApi.pin(currentRoom.id, message.id);
      }

      const updateData = message.pinned_by
        ? { pinned_by: null, pinned_at: null }
        : { pinned_by: user.id, pinned_at: new Date().toISOString() };

      const { updateMessage } = useRoomStore.getState();
      updateMessage(message.id, updateData);

      addToast(message.pinned_by ? 'Message unpinned' : 'Message pinned', 'success');
    } catch (error: unknown) {
      addToast('Failed to pin message', 'error');
    }
  }, [user, messages, currentRoom, addToast]);

  /**
   * Handles downloading chat history
   */
  const handleDownloadChat = useCallback(() => {
    if (!currentRoom) return;

    const mainMessages = messages.filter(m => !m.is_deleted && !m.is_off_topic);
    const offTopicMessages = messages.filter(m => !m.is_deleted && m.is_off_topic);

    let content = `Chat History: ${currentRoom.title}\n`;
    content += `Downloaded: ${format(new Date(), 'MMM d, yyyy h:mm a')}\n`;
    content += `${'='.repeat(60)}\n\n`;

    if (mainMessages.length > 0) {
      content += `MAIN CHAT\n${'='.repeat(60)}\n\n`;
      mainMessages.forEach(msg => {
        const time = format(new Date(msg.created_at || new Date()), 'MMM d, h:mm a');
        content += `[${time}] ${msg.content}\n\n`;
      });
    }

    if (offTopicMessages.length > 0) {
      content += `\nOFF-TOPIC CHAT\n${'='.repeat(60)}\n\n`;
      offTopicMessages.forEach(msg => {
        const time = format(new Date(msg.created_at || new Date()), 'MMM d, h:mm a');
        content += `[${time}] ${msg.content}\n\n`;
      });
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentRoom.title}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast('Chat history downloaded', 'success');
  }, [currentRoom, messages, addToast]);

  /**
   * Handles erasing all chat messages
   */
  const handleEraseChat = useCallback(async () => {
    if (!user || !currentRoom) return;

    if (!confirm('Are you sure you want to erase all chat messages in this room? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete all messages in the room via the API
      const roomMessages = messages.filter(m => !m.is_deleted);
      await Promise.all(
        roomMessages.map(m => messagesApi.delete(currentRoom.id, m.id))
      );

      useRoomStore.getState().setMessages([]);

      addToast('All messages erased', 'success');
    } catch (error: unknown) {
      addToast('Failed to erase messages', 'error');
    }
  }, [user, currentRoom, messages, addToast]);

  /**
   * Handles detaching chat to new window
   */
  const handleDetachChat = useCallback(() => {
    const width = 1200;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    window.open(
      window.location.href,
      'DetachedChat',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }, []);

  return {
    handleSend,
    handleDelete,
    handlePin,
    handleDownloadChat,
    handleEraseChat,
    handleDetachChat
  };
}
