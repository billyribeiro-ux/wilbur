/**
 * Moderation API module.
 */

import { api } from './client';

interface BannedUser {
  id: string;
  user_id: string;
  room_id: string;
  banned_by: string;
  reason: string | undefined;
  expires_at: string | undefined;
  created_at: string;
}

interface ModerationLogEntry {
  id: string;
  room_id: string;
  moderator_id: string;
  target_user_id: string;
  action: string;
  details: string | undefined;
  created_at: string;
}

interface Report {
  id: string;
  room_id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string | undefined;
  content_id: string | undefined;
  reason: string;
  status: string;
  reviewed_by: string | undefined;
  created_at: string;
}

export const moderationApi = {
  ban(userId: string, roomId: string, reason?: string, durationSecs?: number): Promise<BannedUser> {
    return api.post<BannedUser>('/api/v1/moderation/ban', {
      user_id: userId,
      room_id: roomId,
      reason,
      duration_secs: durationSecs,
    });
  },

  unban(userId: string, roomId: string): Promise<void> {
    return api.post('/api/v1/moderation/unban', { user_id: userId, room_id: roomId });
  },

  kick(userId: string, roomId: string, reason?: string): Promise<void> {
    return api.post('/api/v1/moderation/kick', { user_id: userId, room_id: roomId, reason });
  },

  mute(userId: string, roomId: string, durationSecs?: number): Promise<void> {
    return api.post('/api/v1/moderation/mute', {
      user_id: userId,
      room_id: roomId,
      duration_secs: durationSecs,
    });
  },

  getLog(roomId: string): Promise<{ room_id: string; entries: ModerationLogEntry[] }> {
    return api.get(`/api/v1/moderation/log/${roomId}`);
  },

  getBannedUsers(roomId: string): Promise<{ room_id: string; banned_users: BannedUser[] }> {
    return api.get(`/api/v1/moderation/banned/${roomId}`);
  },

  report(roomId: string, reportedUserId: string, reason: string, messageId?: string): Promise<Report> {
    return api.post<Report>('/api/v1/moderation/report', {
      room_id: roomId,
      reported_user_id: reportedUserId,
      reason,
      message_id: messageId,
    });
  },

  resolveReport(reportId: string, status?: string): Promise<Report> {
    return api.post<Report>(`/api/v1/moderation/report/${reportId}/resolve`, { status });
  },
};
