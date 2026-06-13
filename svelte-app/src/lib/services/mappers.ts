/**
 * Shared PocketBase → app-type mappers.
 *
 * Keeps record-shape coercion in one place instead of duplicating the same
 * `record.x as string` boilerplate across the auth, room, and private-chat stores.
 */

import type { User } from '$lib/types';

/** Map a PocketBase user record (or an `expand.user` / `expand.author` record) to the app User. */
export function mapUser(record: Record<string, unknown>): User {
	const email = (record.email as string) ?? '';
	return {
		id: record.id as string,
		email,
		displayName: (record.displayName as string) || email.split('@')[0],
		avatarUrl: record.avatarUrl as string | undefined,
		role: (record.role as User['role']) || 'member',
		createdAt: record.created as string,
		updatedAt: record.updated as string
	};
}
