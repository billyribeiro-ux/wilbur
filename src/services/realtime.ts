/**
 * realtime.ts — Real-time subscription management via Rust WebSocket server.
 * WebSocket-based realtime subscriptions.
 */

import { wsClient } from '../api/ws';
import { useRoomStore } from '../store/roomStore';

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
      const newMessage = data as any;
      const exists = currentMessages.some((msg) => msg.id === newMessage.id);
      if (!exists) {
        addMessage(newMessage);
      }
    } else if (event === 'message_updated' || event === 'message_pinned' || event === 'message_unpinned' || event === 'message_off_topic') {
      const updated = data as any;
      updateMessage(updated.id, updated);
    } else if (event === 'message_deleted') {
      const deleted = data as any;
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
    const data = payload as any;

    if (event === 'alert_created') {
      const exists = currentAlerts.some((a) => a.id === data.id);
      if (!exists) {
        addAlert(data);
      }
    } else if (event === 'alert_updated' || event === 'alert_media_uploaded') {
      setAlerts(currentAlerts.map((a) => (a.id === data.id ? data : a)));
    } else if (event === 'alert_deleted') {
      removeAlert(data.id);
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
    const data = payload as any;

    if (event === 'track_added') {
      addTrack(data);
    } else if (event === 'track_updated') {
      updateTrack(data.id, data);
    } else if (event === 'track_removed' || event === 'tracks_cleaned_up') {
      if (data.id) {
        removeTrack(data.id);
      } else if (data.removed_ids) {
        setTracks(currentTracks.filter((t: any) => !data.removed_ids.includes(t.id)));
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
    const data = payload as any;

    if (event === 'poll_created') {
      addPoll(data);
    } else if (event === 'poll_deleted') {
      removePoll(data.id);
    } else if (event === 'poll_closed' || event === 'poll_vote_cast') {
      setPolls(currentPolls.map((p: any) => (p.id === data.poll_id || p.id === data.id ? { ...p, ...data } : p)));
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
