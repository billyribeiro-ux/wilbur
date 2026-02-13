/**
 * LiveKit API — Replaces supabase.functions.invoke('generate-livekit-token').
 */

import { api } from './client';

interface LiveKitTokenResponse {
  token: string;
  url: string;
}

export const livekitApi = {
  generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
    participantRole?: string
  ): Promise<LiveKitTokenResponse> {
    return api.post<LiveKitTokenResponse>('/api/v1/livekit/token', {
      room_name: roomName,
      participant_identity: participantIdentity,
      participant_name: participantName,
      participant_role: participantRole || 'member',
    });
  },
};
