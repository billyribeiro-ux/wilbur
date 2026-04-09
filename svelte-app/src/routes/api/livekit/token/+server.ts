/**
 * LiveKit Token Generation API
 * Wilbur Trading Room - December 2025
 *
 * NOTE: LiveKit integration is a placeholder for the coming week.
 * Full implementation will be added when you set up your own LiveKit server.
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

// LiveKit token generation will use @livekit/server-sdk when fully implemented
// For now, this is a placeholder that returns appropriate responses

export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		throw error(401, 'Authentication required');
	}

	try {
		const { roomName, participantName } = await request.json();

		if (!roomName || !participantName) {
			throw error(400, 'Room name and participant name are required');
		}

		// Check if LiveKit is configured
		const livekitUrl = env.LIVEKIT_URL;
		const livekitApiKey = env.LIVEKIT_API_KEY;
		const livekitApiSecret = env.LIVEKIT_API_SECRET;

		if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
			// LiveKit not configured - return placeholder response
			return json({
				success: false,
				message: 'LiveKit is not configured yet. Coming soon!',
				configured: false
			});
		}

		// When LiveKit is configured, generate actual token:
		// import { AccessToken } from 'livekit-server-sdk';
		//
		// const at = new AccessToken(livekitApiKey, livekitApiSecret, {
		//   identity: locals.user.id,
		//   name: participantName,
		// });
		//
		// at.addGrant({
		//   room: roomName,
		//   roomJoin: true,
		//   canPublish: true,
		//   canSubscribe: true,
		// });
		//
		// const token = at.toJwt();

		return json({
			success: true,
			token: 'placeholder-token-replace-when-livekit-configured',
			url: livekitUrl,
			configured: true
		});
	} catch (err) {
		console.error('LiveKit token error:', err);
		throw error(500, 'Failed to generate LiveKit token');
	}
};
