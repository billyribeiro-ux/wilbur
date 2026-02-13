-- Migration 001: Create PostgreSQL enum types
-- These enums define constrained value sets used across the schema.

CREATE TYPE user_role AS ENUM ('admin', 'host', 'moderator', 'member');

CREATE TYPE content_type AS ENUM ('text', 'image', 'file');

CREATE TYPE track_type AS ENUM ('audio', 'video', 'screen');

CREATE TYPE integration_type AS ENUM ('spotify', 'x', 'linkedin');

CREATE TYPE alert_type AS ENUM ('buy', 'sell', 'info', 'warning');

CREATE TYPE member_status AS ENUM ('active', 'inactive', 'banned');

CREATE TYPE member_role AS ENUM ('host', 'moderator', 'member');

CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'dismissed');

CREATE TYPE poll_status AS ENUM ('active', 'closed');
