/**
 * Seed a minimal dataset for local dev / E2E: one verified user, one room they
 * own + belong to, and a welcome message. Idempotent. Run after setup-pocketbase.mjs.
 *
 *   PB_URL=... PB_ADMIN_EMAIL=... PB_ADMIN_PASS=... node scripts/seed-pocketbase.mjs
 *
 * Prints the seeded test-user credentials for use in E2E.
 */
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@wilbur.local';
const ADMIN_PASS = process.env.PB_ADMIN_PASS || 'AdminPass123!';

export const TEST_USER = { email: 'trader@wilbur.local', password: 'TraderPass123!', displayName: 'Trader Joe' };

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);
const log = (...a) => console.log('[seed]', ...a);

async function firstOrNull(collection, filter) {
	try {
		return await pb.collection(collection).getFirstListItem(filter);
	} catch {
		return null;
	}
}

async function main() {
	await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);

	let user = await firstOrNull('users', `email = "${TEST_USER.email}"`);
	if (!user) {
		user = await pb.collection('users').create({
			email: TEST_USER.email,
			password: TEST_USER.password,
			passwordConfirm: TEST_USER.password,
			displayName: TEST_USER.displayName,
			role: 'admin',
			emailVisibility: true,
			verified: true
		});
		log('created user', TEST_USER.email);
	} else {
		log('user already exists', TEST_USER.email);
	}

	let room = await firstOrNull('rooms', `name = "demo-room"`);
	if (!room) {
		room = await pb.collection('rooms').create({
			name: 'demo-room',
			title: 'Demo Trading Room',
			description: 'Seeded room for development and E2E.',
			tenant: 'default-tenant',
			createdBy: user.id,
			isActive: true,
			tags: ['demo']
		});
		log('created room demo-room');
	} else {
		log('room demo-room already exists');
	}

	const membership = await firstOrNull('room_memberships', `room = "${room.id}" && user = "${user.id}"`);
	if (!membership) {
		await pb.collection('room_memberships').create({ room: room.id, user: user.id, role: 'admin' });
		log('created membership');
	}

	const msg = await firstOrNull('chat_messages', `room = "${room.id}"`);
	if (!msg) {
		await pb.collection('chat_messages').create({
			room: room.id,
			user: user.id,
			content: 'Welcome to the demo room!',
			contentType: 'text',
			isDeleted: false,
			isOffTopic: false,
			isPinned: false
		});
		log('created welcome message');
	}

	log(`done ✓  test user: ${TEST_USER.email} / ${TEST_USER.password}`);
}

main().catch((e) => {
	console.error('[seed] FAILED:', e?.response?.data ?? e?.message ?? e);
	process.exit(1);
});
