-- Migration 020: Create performance indexes
-- These indexes supplement inline indexes created in earlier migrations.

-- Rooms: look up rooms by tenant
CREATE INDEX idx_rooms_tenant_id ON rooms (tenant_id);

-- Room memberships: look up memberships by user or by room
CREATE INDEX idx_room_memberships_user_id ON room_memberships (user_id);
CREATE INDEX idx_room_memberships_room_id ON room_memberships (room_id);

-- Chat messages: paginate messages in a room (newest first)
CREATE INDEX idx_chatmessages_room_created_desc ON chatmessages (room_id, created_at DESC);

-- Alerts: paginate alerts in a room (newest first)
CREATE INDEX idx_alerts_room_created_desc ON alerts (room_id, created_at DESC);

-- Media tracks: find active tracks in a room
CREATE INDEX idx_media_tracks_room_active ON media_tracks (room_id, is_active);

-- Notifications: find unread notifications for a user
CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- Sessions: look up sessions by user and clean up expired sessions
CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

-- Refresh tokens: look up by user and clean up expired tokens
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
