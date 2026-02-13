// Track heartbeat service using mediaTracksApi
import { TIMING } from '../config/constants';
import { mediaTracksApi } from '../api/media_tracks';

class TrackHeartbeatService {
  private heartbeatIntervals: Map<string, number> = new Map();
  private sessionId: string = '';
  private roomId: string = '';

  initialize(roomId?: string) {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    if (roomId) {
      this.roomId = roomId;
    }
    console.log('[Heartbeat] Session initialized:', this.sessionId);
  }

  setRoomId(roomId: string) {
    this.roomId = roomId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async startHeartbeat(trackId: string, intervalMs: number = TIMING.heartbeatInterval) {
    if (this.heartbeatIntervals.has(trackId)) {
      console.log('[Heartbeat] Already running for track:', trackId);
      return;
    }

    console.log('[Heartbeat] Starting heartbeat for track:', trackId, 'interval:', intervalMs);

    await this.sendHeartbeat(trackId);

    const interval = setInterval(async () => {
      await this.sendHeartbeat(trackId);
    }, intervalMs) as unknown as number;

    this.heartbeatIntervals.set(trackId, interval);
  }

  private async sendHeartbeat(trackId: string) {
    try {
      if (!this.roomId) {
        console.error('[Heartbeat] No roomId set, cannot send heartbeat');
        return;
      }

      await mediaTracksApi.heartbeat(this.roomId, [trackId]);
    } catch (error) {
      console.error('[Heartbeat] Failed to send heartbeat for track:', trackId, error);
    }
  }

  stopHeartbeat(trackId: string) {
    const interval = this.heartbeatIntervals.get(trackId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(trackId);
      console.log('[Heartbeat] Stopped heartbeat for track:', trackId);
    }
  }

  stopAllHeartbeats() {
    console.log('[Heartbeat] Stopping all heartbeats, count:', this.heartbeatIntervals.size);
    for (const [trackId, interval] of this.heartbeatIntervals.entries()) {
      clearInterval(interval);
      console.log('[Heartbeat] Stopped heartbeat for track:', trackId);
    }
    this.heartbeatIntervals.clear();
  }

  async cleanupSessionTracks() {
    if (!this.sessionId || !this.roomId) {
      console.log('[Heartbeat] No session ID or room ID, skipping cleanup');
      return 0;
    }

    console.log('[Heartbeat] Cleaning up session tracks:', this.sessionId);

    try {
      const result = await mediaTracksApi.cleanup(this.roomId);
      const cleanedCount = result?.removed_count || 0;
      console.log('[Heartbeat] Cleaned up tracks:', cleanedCount);
      return cleanedCount;
    } catch (error) {
      console.log('[Heartbeat] Exception during session cleanup (non-critical):', error instanceof Error ? error.message : 'Unknown error');
      return 0;
    }
  }

  getActiveHeartbeats(): string[] {
    return Array.from(this.heartbeatIntervals.keys());
  }
}

export const trackHeartbeatService = new TrackHeartbeatService();
