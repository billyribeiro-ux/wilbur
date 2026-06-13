/**
 * LiveKit access-token endpoint.
 *
 * Mints a real LiveKit JWT (via livekit-server-sdk) for the authenticated user so
 * the client can join a room and publish/subscribe to screen-share, camera, and
 * mic tracks. If the LiveKit server env vars are not set, responds with
 * { configured: false } so the client can fall back to a local-only preview.
 *
 * Required private env: LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { AccessToken } from 'livekit-server-sdk';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	const { roomName, participantName } = await request.json();
	if (!roomName || !participantName) {
		throw error(400, 'Room name and participant name are required');
	}

	const livekitUrl = env.LIVEKIT_URL;
	const apiKey = env.LIVEKIT_API_KEY;
	const apiSecret = env.LIVEKIT_API_SECRET;

	if (!livekitUrl || !apiKey || !apiSecret) {
		return json({ success: false, configured: false, message: 'LiveKit is not configured.' });
	}

	try {
		const at = new AccessToken(apiKey, apiSecret, {
			identity: locals.user.id,
			name: participantName,
			ttl: '1h'
		});
		at.addGrant({
			room: roomName,
			roomJoin: true,
			canPublish: true,
			canSubscribe: true,
			canPublishData: true
		});

		const token = await at.toJwt();
		return json({ success: true, configured: true, token, url: livekitUrl });
	} catch (err) {
		console.error('LiveKit token error:', err);
		throw error(500, 'Failed to generate LiveKit token');
	}
};
