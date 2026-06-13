import { describe, it, expect } from 'vitest';
import { mapUser } from './mappers';

describe('mapUser', () => {
	it('maps PocketBase record fields to the app User shape', () => {
		const u = mapUser({
			id: 'u1',
			email: 'a@b.com',
			displayName: 'Trader Joe',
			avatarUrl: 'http://x/y.png',
			role: 'moderator',
			created: '2026-01-01',
			updated: '2026-02-02'
		});
		expect(u).toEqual({
			id: 'u1',
			email: 'a@b.com',
			displayName: 'Trader Joe',
			avatarUrl: 'http://x/y.png',
			role: 'moderator',
			createdAt: '2026-01-01',
			updatedAt: '2026-02-02'
		});
	});

	it('falls back to the email local-part when displayName is missing', () => {
		expect(mapUser({ id: 'u2', email: 'gm@wilbur.io' }).displayName).toBe('gm');
	});

	it('defaults role to member', () => {
		expect(mapUser({ id: 'u3', email: 'x@y.z' }).role).toBe('member');
	});
});
