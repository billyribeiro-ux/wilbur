/**
 * Room presence — typing and activity (local-only until a shared transport exists).
 */

import { useState, useCallback, useRef, useMemo, useEffect } from 'react';

import { loggerFactory } from '../infrastructure';

interface PresenceState {
  readonly connectedUsers: readonly string[];
  readonly typingUsers: readonly string[];
  readonly isUserTyping: boolean;
  readonly lastActivity: Date | null;
}

interface UseRoomPresenceProps {
  readonly roomId: string;
  readonly userId: string;
}

export interface UseRoomPresenceReturn {
  readonly state: PresenceState;
  readonly setTyping: (isTyping: boolean) => void;
  readonly broadcastPresence: () => void;
}

export function useRoomPresence({ userId }: UseRoomPresenceProps): UseRoomPresenceReturn {
  const logger = useMemo(() => loggerFactory.create('RoomPresence'), []);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [state, setState] = useState<PresenceState>(() => ({
    connectedUsers: [],
    typingUsers: [],
    isUserTyping: false,
    lastActivity: null,
  }));

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (isTyping === state.isUserTyping) return;

      setState((prev) => ({ ...prev, isUserTyping: isTyping }));

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (isTyping) {
        typingTimeoutRef.current = setTimeout(() => {
          setState((prev) => ({ ...prev, isUserTyping: false }));
        }, 3000);
      }
    },
    [state.isUserTyping]
  );

  const broadcastPresence = useCallback(() => {
    if (import.meta.env.DEV) {
      logger.debug('broadcastPresence: no shared transport configured', { userId });
    }
    setState((prev) => ({ ...prev, lastActivity: new Date() }));
  }, [logger, userId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setTyping,
    broadcastPresence,
  };
}
