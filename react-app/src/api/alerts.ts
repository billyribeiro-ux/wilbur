/**
 * Alerts API module.
 */

import { api } from './client';

interface Alert {
  id: string;
  room_id: string;
  author_id: string;
  title: string;
  body: string | undefined;
  alert_type: string;
  ticker_symbol: string | undefined;
  entry_price: number | undefined;
  stop_loss: number | undefined;
  take_profit: number | undefined;
  media_url: string | undefined;
  legal_disclosure: string | undefined;
  is_active: boolean;
  created_at: string;
}

interface CreateAlertRequest {
  title: string;
  body?: string;
  alert_type?: string;
  ticker_symbol?: string;
  entry_price?: number;
  stop_loss?: number;
  take_profit?: number;
  legal_disclosure?: string;
}

export const alertsApi = {
  list(roomId: string): Promise<Alert[]> {
    return api.get<Alert[]>(`/api/v1/rooms/${roomId}/alerts`);
  },

  create(roomId: string, data: CreateAlertRequest): Promise<Alert> {
    return api.post<Alert>(`/api/v1/rooms/${roomId}/alerts`, data);
  },

  delete(roomId: string, alertId: string): Promise<void> {
    return api.delete(`/api/v1/rooms/${roomId}/alerts/${alertId}`);
  },

  uploadMedia(roomId: string, alertId: string, file: File): Promise<{ media_url: string }> {
    return api.upload(`/api/v1/rooms/${roomId}/alerts/${alertId}/media`, file);
  },
};
