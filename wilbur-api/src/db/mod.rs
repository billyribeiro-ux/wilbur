// Database query modules
// Each module provides typed query functions for a specific table.
// All queries use SQLx compile-time checked macros.

pub mod alerts;
pub mod config;
pub mod media_tracks;
pub mod messages;
pub mod moderation;
pub mod notifications;
pub mod polls;
pub mod private_chats;
pub mod room_files;
pub mod room_memberships;
pub mod rooms;
pub mod sessions;
pub mod tenants;
pub mod user_integrations;
pub mod user_themes;
pub mod users;
