/**
 * Media Tracks API module.
 */

import { api } from './client';

interface MediaTrack {
  id: string;
  room_id: string;
  user_id: string;
  track_type: string;
  track_id: string | undefined;
  track_sid: string | undefined;
  is_active: boolean;
  muted: boolean;
  metadata: Record<string, unknown> | undefined;
  last_heartbeat: string;
  created_at: string;
  updated_at: string;
}

export const mediaTracksApi = {
  list(roomId: string): Promise<{ room_id: string; tracks: MediaTrack[] }> {
    return api.get(`/api/v1/rooms/${roomId}/tracks`);
  },

  create(roomId: string, trackType: string, trackId?: string, metadata?: Record<string, unknown>): Promise<MediaTrack> {
    return api.post<MediaTrack>(`/api/v1/rooms/${roomId}/tracks`, {
      track_type: trackType,
      track_id: trackId,
      metadata,
    });
  },

  update(roomId: string, trackId: string, data: { muted?: boolean; metadata?: Record<string, unknown> }): Promise<MediaTrack> {
    return api.put<MediaTrack>(`/api/v1/rooms/${roomId}/tracks/${trackId}`, data);
  },

  delete(roomId: string, trackId: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${roomId}/tracks/${trackId}`);
  },

  heartbeat(roomId: string, trackIds: string[]): Promise<{ acknowledged: boolean }> {
    return api.post(`/api/v1/rooms/${roomId}/tracks/heartbeat`, { track_ids: trackIds });
  },

  cleanup(roomId: string): Promise<{ removed_count: number }> {
    return api.post(`/api/v1/rooms/${roomId}/tracks/cleanup`);
  },
};
