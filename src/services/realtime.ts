/**
 * realtime.ts — Real-time subscription management via Rust WebSocket server.
 * WebSocket-based realtime subscriptions.
 */

import { wsClient } from '../api/ws';
import { useRoomStore } from '../store/roomStore';
import type { Alert, ChatMessage, MediaTrack, Poll } from '../types/database.types';

// Track active unsubscribe functions for cleanup
const activeUnsubscribers = new Map<string, () => void>();

export function subscribeToRoomChat(roomId: string) {
  if (!roomId) return;

  const channelName = `room:${roomId}:chat`;

  // Remove existing subscription
  unsubscribeFromChannel(channelName);

  const unsubscribe = wsClient.subscribe(channelName, (payload: unknown, event: string) => {
    const { addMessage, updateMessage, removeMessage } = useRoomStore.getState();
    const { messages: currentMessages } = useRoomStore.getState();
    const data = payload as Record<string, unknown>;

    if (event === 'message_created') {
      const newMessage = data as ChatMessage;
      const exists = currentMessages.some((msg) => msg.id === newMessage.id);
      if (!exists) {
        addMessage(newMessage);
      }
    } else if (event === 'message_updated' || event === 'message_pinned' || event === 'message_unpinned' || event === 'message_off_topic') {
      const updated = data as Partial<ChatMessage> & { id: string };
      updateMessage(updated.id, updated);
    } else if (event === 'message_deleted') {
      const deleted = data as { id: string };
      removeMessage(deleted.id);
    }
  });

  activeUnsubscribers.set(channelName, unsubscribe);
}

export function subscribeToRoomAlerts(roomId: string) {
  if (!roomId) return;

  const channelName = `room:${roomId}:alerts`;

  unsubscribeFromChannel(channelName);

  const unsubscribe = wsClient.subscribe(channelName, (payload: unknown, event: string) => {
    const { setAlerts, addAlert, removeAlert } = useRoomStore.getState();
    const { alerts: currentAlerts } = useRoomStore.getState();
    const data = payload as Record<string, unknown> & Partial<Alert> & { id?: string };

    if (event === 'alert_created') {
      const alert = data as Alert;
      const exists = currentAlerts.some((a) => a.id === alert.id);
      if (!exists) {
        addAlert(alert);
      }
    } else if (event === 'alert_updated' || event === 'alert_media_uploaded') {
      const row = data as Alert;
      setAlerts(currentAlerts.map((a) => (a.id === row.id ? row : a)));
    } else if (event === 'alert_deleted') {
      const row = data as { id: string };
      removeAlert(row.id);
    }
  });

  activeUnsubscribers.set(channelName, unsubscribe);
}

export function subscribeToRoomTracks(roomId: string) {
  if (!roomId) return;

  const channelName = `room:${roomId}:tracks`;

  unsubscribeFromChannel(channelName);

  const unsubscribe = wsClient.subscribe(channelName, (payload: unknown, event: string) => {
    const { setTracks, addTrack, updateTrack, removeTrack } = useRoomStore.getState();
    const { tracks: currentTracks } = useRoomStore.getState();
    const data = payload as Record<string, unknown> & {
      id?: string;
      removed_ids?: string[];
    };

    if (event === 'track_added') {
      addTrack(data as MediaTrack);
    } else if (event === 'track_updated') {
      const t = data as MediaTrack;
      updateTrack(t.id, t);
    } else if (event === 'track_removed' || event === 'tracks_cleaned_up') {
      if (data.id) {
        removeTrack(data.id);
      } else if (data.removed_ids) {
        const removed = new Set(data.removed_ids);
        setTracks(currentTracks.filter((t) => !removed.has(t.id)));
      }
    }
  });

  activeUnsubscribers.set(channelName, unsubscribe);
}

export function subscribeToRoomPolls(roomId: string) {
  if (!roomId) return;

  const channelName = `room:${roomId}:polls`;

  unsubscribeFromChannel(channelName);

  const unsubscribe = wsClient.subscribe(channelName, (payload: unknown, event: string) => {
    const { addPoll, removePoll, setPolls } = useRoomStore.getState();
    const { polls: currentPolls } = useRoomStore.getState();
    const data = payload as Record<string, unknown> & Partial<Poll> & { poll_id?: string };

    if (event === 'poll_created') {
      addPoll(data as Poll);
    } else if (event === 'poll_deleted') {
      const row = data as { id: string };
      removePoll(row.id);
    } else if (event === 'poll_closed' || event === 'poll_vote_cast') {
      setPolls(
        currentPolls.map((p) =>
          p.id === data.poll_id || p.id === data.id ? ({ ...p, ...data } as Poll) : p
        )
      );
    }
  });

  activeUnsubscribers.set(channelName, unsubscribe);
}

export function unsubscribeFromRoom() {
  for (const [, unsubscribe] of activeUnsubscribers) {
    unsubscribe();
  }
  activeUnsubscribers.clear();
}

export function unsubscribeFromChannel(channelName: string) {
  const unsubscribe = activeUnsubscribers.get(channelName);
  if (unsubscribe) {
    unsubscribe();
    activeUnsubscribers.delete(channelName);
  }
}

export function getActiveChannels(): string[] {
  return Array.from(activeUnsubscribers.keys());
}

export function isChannelActive(channelName: string): boolean {
  return activeUnsubscribers.has(channelName);
}

export function getChannelCount(): number {
  return activeUnsubscribers.size;
}

/**
 * @deprecated Use subscribeToRoomAlerts(roomId) instead.
 */
export function subscribeToTenantAlerts(_tenantId: string) {
  return;
}
