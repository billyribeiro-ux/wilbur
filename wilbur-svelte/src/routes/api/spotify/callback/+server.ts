/**
 * Spotify OAuth Callback Handler
 * Wilbur Trading Room - December 2025
 */

import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');

	if (error) {
		console.error('Spotify OAuth error:', error);
		throw redirect(302, '/settings?error=spotify_denied');
	}

	if (!code) {
		throw redirect(302, '/settings?error=spotify_no_code');
	}

	// Verify state (CSRF protection) - in production, compare with stored state
	// For now, we just check it exists
	if (!state) {
		throw redirect(302, '/settings?error=spotify_invalid_state');
	}

	try {
		// Exchange code for tokens
		const clientId = env.SPOTIFY_CLIENT_ID;
		const clientSecret = env.SPOTIFY_CLIENT_SECRET;
		const redirectUri = `${url.origin}/api/spotify/callback`;

		const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
			},
			body: new URLSearchParams({
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.json();
			console.error('Spotify token exchange failed:', errorData);
			throw redirect(302, '/settings?error=spotify_token_failed');
		}

		const tokens = await tokenResponse.json();

		// Store tokens securely (in production, save to database via Pocketbase)
		// For now, set in cookie (encrypted in production)
		cookies.set('spotify_access_token', tokens.access_token, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			maxAge: tokens.expires_in
		});

		if (tokens.refresh_token) {
			cookies.set('spotify_refresh_token', tokens.refresh_token, {
				path: '/',
				httpOnly: true,
				secure: true,
				sameSite: 'lax',
				maxAge: 60 * 60 * 24 * 30 // 30 days
			});
		}

		throw redirect(302, '/settings?spotify=connected');
	} catch (err) {
		if (err instanceof Response) throw err;
		console.error('Spotify callback error:', err);
		throw redirect(302, '/settings?error=spotify_error');
	}
};
