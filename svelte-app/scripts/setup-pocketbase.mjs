/**
 * PocketBase schema + seed setup for local dev / E2E.
 *
 * Creates the collections the app expects (derived from the stores' create/map calls)
 * with permissive, AUTHENTICATED-ONLY rules suitable for development and end-to-end
 * tests. NOT production-hardened rules — tighten before shipping.
 *
 * Usage:
 *   PB_URL=http://127.0.0.1:8090 PB_ADMIN_EMAIL=admin@wilbur.local PB_ADMIN_PASS=... \
 *     node scripts/setup-pocketbase.mjs
 *
 * Idempotent: skips collections/fields/records that already exist.
 */
import PocketBase from 'pocketbase';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@wilbur.local';
const ADMIN_PASS = process.env.PB_ADMIN_PASS || 'AdminPass123!';
const AUTHED = '@request.auth.id != ""';

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

const log = (...a) => console.log('[setup]', ...a);

async function getCollection(name) {
	try {
		return await pb.collections.getOne(name);
	} catch {
		return null;
	}
}

async function upsertCollection(def) {
	const existing = await getCollection(def.name);
	if (existing) {
		log(`collection "${def.name}" exists — skipping`);
		return existing;
	}
	const created = await pb.collections.create(def);
	log(`created collection "${def.name}"`);
	return created;
}

const autodates = [
	{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
	{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }
];

async function main() {
	await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASS);
	log('authenticated as superuser');

	// --- users: add app-specific fields + allow signup/read ---------------------
	const users = await pb.collections.getOne('users');
	const userFieldNames = new Set(users.fields.map((f) => f.name));
	const extraUserFields = [
		{ name: 'displayName', type: 'text' },
		{ name: 'role', type: 'select', values: ['admin', 'host', 'moderator', 'member'], maxSelect: 1 },
		{ name: 'avatarUrl', type: 'url' }
	].filter((f) => !userFieldNames.has(f.name));
	if (extraUserFields.length) {
		users.fields = [...users.fields, ...extraUserFields];
		users.createRule = ''; // allow open sign-up
		users.listRule = AUTHED;
		users.viewRule = AUTHED;
		await pb.collections.update(users.id, users);
		log(`users: added [${extraUserFields.map((f) => f.name).join(', ')}] + signup/read rules`);
	} else {
		log('users: app fields already present');
	}
	const usersId = users.id;

	const rules = { listRule: AUTHED, viewRule: AUTHED, createRule: AUTHED, updateRule: AUTHED, deleteRule: AUTHED };
	const rel = (name, collectionId, required = false) => ({ name, type: 'relation', collectionId, maxSelect: 1, required });

	const rooms = await upsertCollection({
		name: 'rooms', type: 'base', ...rules,
		fields: [
			{ name: 'name', type: 'text', required: true },
			{ name: 'title', type: 'text', required: true },
			{ name: 'description', type: 'text' },
			{ name: 'tenant', type: 'text' },
			rel('createdBy', usersId),
			{ name: 'isActive', type: 'bool' },
			{ name: 'tags', type: 'json' },
			{ name: 'iconUrl', type: 'text' },
			{ name: 'branding', type: 'json' },
			...autodates
		]
	});

	await upsertCollection({
		name: 'room_memberships', type: 'base', ...rules,
		fields: [
			rel('room', rooms.id, true),
			rel('user', usersId, true),
			{ name: 'role', type: 'select', values: ['admin', 'host', 'moderator', 'member'], maxSelect: 1 },
			{ name: 'location', type: 'json' },
			...autodates
		]
	});

	await upsertCollection({
		name: 'chat_messages', type: 'base', ...rules,
		fields: [
			rel('room', rooms.id, true),
			rel('user', usersId, true),
			{ name: 'content', type: 'text' },
			{ name: 'contentType', type: 'select', values: ['text', 'image', 'file'], maxSelect: 1 },
			{ name: 'fileUrl', type: 'text' },
			{ name: 'isDeleted', type: 'bool' },
			{ name: 'isOffTopic', type: 'bool' },
			{ name: 'isPinned', type: 'bool' },
			{ name: 'pinnedBy', type: 'text' },
			{ name: 'pinnedAt', type: 'text' },
			{ name: 'deletedBy', type: 'text' },
			{ name: 'deletedAt', type: 'text' },
			...autodates
		]
	});

	await upsertCollection({
		name: 'alerts', type: 'base', ...rules,
		fields: [
			rel('room', rooms.id, true),
			rel('author', usersId),
			{ name: 'title', type: 'text' },
			{ name: 'body', type: 'text' },
			{ name: 'type', type: 'select', values: ['text', 'url', 'media'], maxSelect: 1 },
			{ name: 'isNonTrade', type: 'bool' },
			{ name: 'hasLegalDisclosure', type: 'bool' },
			{ name: 'legalDisclosureText', type: 'text' },
			...autodates
		]
	});

	const polls = await upsertCollection({
		name: 'polls', type: 'base', ...rules,
		fields: [
			rel('room', rooms.id, true),
			rel('createdBy', usersId),
			{ name: 'title', type: 'text', required: true },
			{ name: 'description', type: 'text' },
			{ name: 'options', type: 'json' },
			{ name: 'isActive', type: 'bool' },
			{ name: 'expiresAt', type: 'text' },
			...autodates
		]
	});

	await upsertCollection({
		name: 'poll_votes', type: 'base', ...rules,
		fields: [
			rel('poll', polls.id, true),
			rel('userId', usersId, true),
			{ name: 'optionIndex', type: 'number' },
			...autodates
		]
	});

	log('schema ready ✓');
}

main().catch((e) => {
	console.error('[setup] FAILED:', e?.response?.data ?? e?.message ?? e);
	process.exit(1);
});
