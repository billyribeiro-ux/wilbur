/**
 * WebSocket Client — Replaces Supabase Realtime with native WebSocket.
 * Supports channel subscriptions, auto-reconnect, and event deduplication.
 */

import { api } from './client';

type EventHandler = (payload: unknown, event: string) => void;

interface ServerMessage {
  type: string;
  channel?: string;
  event?: string;
  payload?: unknown;
  timestamp?: string;
  event_id?: string;
  member_count?: number;
  message?: string;
  code?: string;
  user_id?: string;
  display_name?: string;
}

const WS_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000')
  .replace('http://', 'ws://')
  .replace('https://', 'wss://');

class WsClient {
  private ws: WebSocket | undefined;
  private subscriptions = new Map<string, Set<EventHandler>>();
  private seenEvents = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;
  private pingInterval: ReturnType<typeof setInterval> | undefined;

  connect(): void {
    const token = api.getAccessToken();
    if (!token) return;

    this.ws = new WebSocket(`${WS_BASE}/ws?token=${token}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      // Re-subscribe to all channels
      for (const channel of this.subscriptions.keys()) {
        this.send({ type: 'subscribe', channel });
      }
      // Start heartbeat
      this.pingInterval = setInterval(() => this.send({ type: 'ping' }), 30000);
    };

    this.ws.onmessage = (event) => {
      const msg: ServerMessage = JSON.parse(event.data);
      this.handleMessage(msg);
    };

    this.ws.onclose = () => {
      this.cleanup();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  subscribe(channel: string, handler: EventHandler): () => void {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'subscribe', channel });
      }
    }
    this.subscriptions.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.subscriptions.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscriptions.delete(channel);
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.send({ type: 'unsubscribe', channel });
          }
        }
      }
    };
  }

  sendPresence(channel: string, status: string): void {
    this.send({ type: 'presence', channel, status });
  }

  disconnect(): void {
    this.cleanup();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    this.subscriptions.clear();
    this.ws?.close();
    this.ws = undefined;
  }

  private handleMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'event': {
        // Deduplicate by event_id
        if (msg.event_id && this.seenEvents.has(msg.event_id)) return;
        if (msg.event_id) {
          this.seenEvents.add(msg.event_id);
          // Prune old event IDs (keep last 1000)
          if (this.seenEvents.size > 1000) {
            const iterator = this.seenEvents.values();
            for (let i = 0; i < 500; i++) iterator.next();
            // Can't easily prune a Set; rebuild
            const keep = new Set<string>();
            for (const id of this.seenEvents) keep.add(id);
            this.seenEvents = keep;
          }
        }
        const handlers = this.subscriptions.get(msg.channel!);
        if (handlers) {
          for (const handler of handlers) {
            handler(msg.payload, msg.event || 'event');
          }
        }
        break;
      }
      case 'presence': {
        const handlers = this.subscriptions.get(msg.channel!);
        if (handlers) {
          for (const handler of handlers) {
            handler({ user_id: msg.user_id, display_name: msg.display_name }, msg.event || 'presence');
          }
        }
        break;
      }
      case 'error':
        console.error(`[WS] Error: ${msg.message} (${msg.code})`);
        break;
      case 'pong':
        break;
    }
  }

  private send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private cleanup(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimeout = setTimeout(() => this.connect(), delay);
  }
}

export const wsClient = new WsClient();
