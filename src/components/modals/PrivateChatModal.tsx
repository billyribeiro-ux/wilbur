/**
 * ============================================================================
 * PRIVATE CHAT MODAL - Apple HIG & Microsoft Enterprise Standards
 * ============================================================================
 *
 * Private messaging interface between users.
 * Implements WCAG 2.1 AA accessibility compliance.
 *
 * @version 2.0.0
 * @updated 2026-01-24
 */

import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Minus, Send } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';

import { supabase } from '../../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

interface PrivateChatModalProps {
  chatId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  currentUserId: string;
  onClose: () => void;
  isOpen?: boolean;
}

interface PrivateMessage {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string | undefined;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const containerVariants = {
  minimized: {
    height: 60,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
  expanded: {
    height: 500,
    transition: { type: 'spring', damping: 20, stiffness: 300 },
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function PrivateChatModal({
  chatId,
  userId: _userId,
  userName,
  userAvatar,
  currentUserId,
  onClose,
  isOpen = true,
}: PrivateChatModalProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suppress unused variable warning - userId reserved for future use
  void _userId;

  // Fetch messages
  useEffect(() => {
    if (!chatId || !isOpen) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`private_chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: { new: PrivateMessage }) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when expanded
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!message.trim() || !chatId || isSending) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from('private_messages').insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: message.trim(),
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      setMessage('');
    } catch (error) {
      console.error('[PrivateChatModal] Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, chatId, currentUserId, isSending]);

  // Keyboard handler - using onKeyDown instead of deprecated onKeyPress
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [handleSendMessage, onClose]
  );

  // Format time
  const formatTime = (dateString: string | undefined): string => {
    if (!dateString) return 'Just now';
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return undefined;

  return (
    <AnimatePresence>
      <motion.div
        variants={containerVariants}
        initial="expanded"
        animate={isMinimized ? 'minimized' : 'expanded'}
        className="
          fixed bottom-0 right-4 w-[400px] max-w-[95vw]
          bg-slate-900 rounded-t-xl shadow-2xl
          border-2 border-blue-500/50 z-[9999]
          flex flex-col overflow-hidden
        "
        role="dialog"
        aria-modal="true"
        aria-label={`Private chat with ${userName}`}
      >
        {/* Header */}
        <button
          type="button"
          className="
            w-full bg-slate-800 px-4 py-3 flex items-center justify-between
            rounded-t-xl cursor-pointer hover:bg-slate-750 transition-colors
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset
          "
          onClick={() => setIsMinimized(!isMinimized)}
          aria-expanded={!isMinimized}
          aria-controls="private-chat-content"
        >
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-white" />
            <div className="flex items-center gap-2">
              {/* Avatar */}
              <div className="relative w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                {userAvatar ? (
                  <img
                    src={userAvatar}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                )}
                {/* Online indicator */}
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-slate-800" />
              </div>
              <span className="text-white font-semibold">{userName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="p-1 text-slate-400 hover:text-white transition-colors">
              <Minus className="w-4 h-4" />
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onClose();
                }
              }}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Close private chat"
            >
              <X className="w-4 h-4" />
            </span>
          </div>
        </button>

        {/* Chat Content */}
        <div
          id="private-chat-content"
          className={`flex-1 flex flex-col ${isMinimized ? 'hidden' : ''}`}
        >
          {/* Messages Area */}
          <div className="flex-1 bg-slate-900 p-4 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => {
                  const isOwn = msg.sender_id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`
                          max-w-[75%] px-4 py-2 rounded-2xl
                          ${isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-slate-700 text-white rounded-bl-md'
                          }
                        `}
                      >
                        {!isOwn && (
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {userAvatar ? (
                                <img
                                  src={userAvatar}
                                  alt={userName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-xs text-white">
                                  {userName.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold text-slate-300">
                              {userName}
                            </span>
                          </div>
                        )}
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            isOwn ? 'text-blue-200' : 'text-slate-400'
                          }`}
                        >
                          {formatTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="bg-slate-800 border-t border-slate-700 p-3">
            <div className="flex gap-2">
              <label htmlFor="private-chat-input" className="sr-only">
                Type your message
              </label>
              <input
                ref={inputRef}
                id="private-chat-input"
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={isSending}
                className="
                  flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-full
                  text-white placeholder-slate-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              />
              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!message.trim() || isSending}
                className="
                  px-4 py-2.5 bg-blue-600 hover:bg-blue-700
                  disabled:bg-slate-600 disabled:cursor-not-allowed
                  text-white rounded-full transition-colors
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                  flex items-center gap-2
                "
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PrivateChatModal;
