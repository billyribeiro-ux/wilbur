/**
 * Polls API module.
 */

import { api } from './client';

interface Poll {
  id: string;
  room_id: string;
  created_by: string;
  question: string;
  options: string[];
  status: string;
  closes_at: string | undefined;
  created_at: string;
}

interface PollVote {
  id: string;
  poll_id: string;
  user_id: string;
  option_index: number;
  created_at: string;
}

export const pollsApi = {
  list(roomId: string, page = 1, perPage = 50): Promise<{ room_id: string; page: number; per_page: number; data: Poll[] }> {
    return api.get(`/api/v1/rooms/${roomId}/polls?page=${page}&per_page=${perPage}`);
  },

  create(roomId: string, question: string, options: string[], closesAt?: string): Promise<Poll> {
    return api.post<Poll>(`/api/v1/rooms/${roomId}/polls`, {
      question,
      options,
      closes_at: closesAt,
    });
  },

  delete(roomId: string, pollId: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${roomId}/polls/${pollId}`);
  },

  vote(roomId: string, pollId: string, optionIndex: number): Promise<PollVote> {
    return api.post<PollVote>(`/api/v1/rooms/${roomId}/polls/${pollId}/vote`, {
      option_index: optionIndex,
    });
  },

  getVotes(roomId: string, pollId: string): Promise<{ poll_id: string; votes: PollVote[] }> {
    return api.get(`/api/v1/rooms/${roomId}/polls/${pollId}/votes`);
  },

  close(roomId: string, pollId: string): Promise<void> {
    return api.post(`/api/v1/rooms/${roomId}/polls/${pollId}/close`);
  },
};
