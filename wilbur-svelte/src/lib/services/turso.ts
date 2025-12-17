/**
 * Turso Database Client
 * Edge-first SQLite for global low-latency reads
 * Wilbur Trading Room - December 2025
 */

import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';

// ============================================================================
// TURSO CLIENT CONFIGURATION
// ============================================================================

let tursoClient: Client | null = null;

export function getTursoClient(): Client {
	if (!tursoClient) {
		const url = env.TURSO_DATABASE_URL;
		const authToken = env.TURSO_AUTH_TOKEN;

		if (!url) {
			throw new Error('TURSO_DATABASE_URL environment variable is required');
		}

		tursoClient = createClient({
			url,
			authToken
		});
	}

	return tursoClient;
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

export async function query<T = unknown>(sql: string, args?: unknown[]): Promise<T[]> {
	const client = getTursoClient();
	const result = await client.execute({ sql, args: args || [] });
	return result.rows as T[];
}

export async function queryOne<T = unknown>(sql: string, args?: unknown[]): Promise<T | null> {
	const rows = await query<T>(sql, args);
	return rows[0] || null;
}

export async function execute(sql: string, args?: unknown[]) {
	const client = getTursoClient();
	return await client.execute({ sql, args: args || [] });
}

export async function batchExecute(statements: { sql: string; args?: unknown[] }[]) {
	const client = getTursoClient();
	return await client.batch(statements);
}

// ============================================================================
// ANALYTICS QUERIES (Read-heavy, benefit from edge)
// ============================================================================

export async function getRoomAnalytics(roomId: string) {
	return await queryOne<{
		messageCount: number;
		alertCount: number;
		memberCount: number;
		activeMemberCount: number;
	}>(`
		SELECT
			(SELECT COUNT(*) FROM chat_messages WHERE room_id = ?) as messageCount,
			(SELECT COUNT(*) FROM alerts WHERE room_id = ?) as alertCount,
			(SELECT COUNT(*) FROM room_memberships WHERE room_id = ?) as memberCount,
			(SELECT COUNT(*) FROM room_memberships WHERE room_id = ? AND last_activity > datetime('now', '-1 hour')) as activeMemberCount
	`, [roomId, roomId, roomId, roomId]);
}

export async function getUserActivityStats(userId: string) {
	return await queryOne<{
		totalMessages: number;
		totalAlerts: number;
		roomsJoined: number;
		firstActivity: string;
		lastActivity: string;
	}>(`
		SELECT
			(SELECT COUNT(*) FROM chat_messages WHERE user_id = ?) as totalMessages,
			(SELECT COUNT(*) FROM alerts WHERE author_id = ?) as totalAlerts,
			(SELECT COUNT(*) FROM room_memberships WHERE user_id = ?) as roomsJoined,
			(SELECT MIN(created_at) FROM chat_messages WHERE user_id = ?) as firstActivity,
			(SELECT MAX(created_at) FROM chat_messages WHERE user_id = ?) as lastActivity
	`, [userId, userId, userId, userId, userId]);
}

export async function getTopActiveRooms(limit: number = 10) {
	return await query<{
		roomId: string;
		roomName: string;
		messageCount: number;
		memberCount: number;
	}>(`
		SELECT
			r.id as roomId,
			r.name as roomName,
			COUNT(DISTINCT cm.id) as messageCount,
			COUNT(DISTINCT rm.user_id) as memberCount
		FROM rooms r
		LEFT JOIN chat_messages cm ON cm.room_id = r.id AND cm.created_at > datetime('now', '-24 hours')
		LEFT JOIN room_memberships rm ON rm.room_id = r.id
		WHERE r.is_active = 1
		GROUP BY r.id
		ORDER BY messageCount DESC
		LIMIT ?
	`, [limit]);
}

export async function searchMessages(query: string, roomId?: string, limit: number = 50) {
	const sql = roomId
		? `SELECT * FROM chat_messages WHERE room_id = ? AND content LIKE ? ORDER BY created_at DESC LIMIT ?`
		: `SELECT * FROM chat_messages WHERE content LIKE ? ORDER BY created_at DESC LIMIT ?`;

	const args = roomId ? [roomId, `%${query}%`, limit] : [`%${query}%`, limit];
	return await query(sql, args);
}

// ============================================================================
// LEADERBOARD QUERIES
// ============================================================================

export async function getMessageLeaderboard(roomId: string, days: number = 7, limit: number = 10) {
	return await query<{
		userId: string;
		displayName: string;
		messageCount: number;
	}>(`
		SELECT
			u.id as userId,
			u.display_name as displayName,
			COUNT(cm.id) as messageCount
		FROM users u
		JOIN chat_messages cm ON cm.user_id = u.id
		WHERE cm.room_id = ?
			AND cm.created_at > datetime('now', '-${days} days')
			AND cm.is_deleted = 0
		GROUP BY u.id
		ORDER BY messageCount DESC
		LIMIT ?
	`, [roomId, limit]);
}

export async function getAlertLeaderboard(roomId: string, days: number = 30, limit: number = 10) {
	return await query<{
		userId: string;
		displayName: string;
		alertCount: number;
	}>(`
		SELECT
			u.id as userId,
			u.display_name as displayName,
			COUNT(a.id) as alertCount
		FROM users u
		JOIN alerts a ON a.author_id = u.id
		WHERE a.room_id = ?
			AND a.created_at > datetime('now', '-${days} days')
		GROUP BY u.id
		ORDER BY alertCount DESC
		LIMIT ?
	`, [roomId, limit]);
}

// ============================================================================
// SYNC UTILITIES
// ============================================================================

/**
 * Sync data from Pocketbase to Turso for analytics
 * This would typically be called by a background job
 */
export async function syncChatMessage(message: {
	id: string;
	roomId: string;
	userId: string;
	content: string;
	createdAt: string;
	isDeleted: boolean;
}) {
	await execute(`
		INSERT OR REPLACE INTO chat_messages (id, room_id, user_id, content, created_at, is_deleted)
		VALUES (?, ?, ?, ?, ?, ?)
	`, [message.id, message.roomId, message.userId, message.content, message.createdAt, message.isDeleted ? 1 : 0]);
}

export async function syncAlert(alert: {
	id: string;
	roomId: string;
	authorId: string;
	title: string;
	body: string;
	createdAt: string;
}) {
	await execute(`
		INSERT OR REPLACE INTO alerts (id, room_id, author_id, title, body, created_at)
		VALUES (?, ?, ?, ?, ?, ?)
	`, [alert.id, alert.roomId, alert.authorId, alert.title, alert.body, alert.createdAt]);
}

// ============================================================================
// SCHEMA INITIALIZATION
// ============================================================================

export async function initializeTursoSchema() {
	await batchExecute([
		{
			sql: `CREATE TABLE IF NOT EXISTS chat_messages (
				id TEXT PRIMARY KEY,
				room_id TEXT NOT NULL,
				user_id TEXT NOT NULL,
				content TEXT,
				created_at TEXT NOT NULL,
				is_deleted INTEGER DEFAULT 0
			)`
		},
		{
			sql: `CREATE TABLE IF NOT EXISTS alerts (
				id TEXT PRIMARY KEY,
				room_id TEXT NOT NULL,
				author_id TEXT NOT NULL,
				title TEXT,
				body TEXT,
				created_at TEXT NOT NULL
			)`
		},
		{
			sql: `CREATE TABLE IF NOT EXISTS rooms (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				is_active INTEGER DEFAULT 1,
				created_at TEXT NOT NULL
			)`
		},
		{
			sql: `CREATE TABLE IF NOT EXISTS room_memberships (
				id TEXT PRIMARY KEY,
				room_id TEXT NOT NULL,
				user_id TEXT NOT NULL,
				last_activity TEXT
			)`
		},
		{
			sql: `CREATE TABLE IF NOT EXISTS users (
				id TEXT PRIMARY KEY,
				display_name TEXT,
				email TEXT UNIQUE
			)`
		},
		// Indexes for fast queries
		{ sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id)` },
		{ sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id)` },
		{ sql: `CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at)` },
		{ sql: `CREATE INDEX IF NOT EXISTS idx_alerts_room ON alerts(room_id)` },
		{ sql: `CREATE INDEX IF NOT EXISTS idx_room_memberships_room ON room_memberships(room_id)` }
	]);
}
