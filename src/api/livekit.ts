/**
 * LiveKit API module.
 * Identity is enforced server-side from JWT — no spoofing possible.
 */

import { api } from './client';

interface LiveKitTokenResponse {
  token: string;
  url: string;
}

export const livekitApi = {
  generateToken(room: string): Promise<LiveKitTokenResponse> {
    return api.post<LiveKitTokenResponse>('/api/v1/livekit/token', { room });
  },
};
