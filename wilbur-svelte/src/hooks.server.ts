/**
 * Server Hooks
 * Wilbur Trading Room - December 2025
 */

import type { Handle } from '@sveltejs/kit';
import PocketBase from 'pocketbase';
import { env } from '$env/dynamic/public';

const POCKETBASE_URL = env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const handle: Handle = async ({ event, resolve }) => {
	// Create Pocketbase instance for this request
	event.locals.pb = new PocketBase(POCKETBASE_URL);

	// Load auth from cookie
	const authCookie = event.cookies.get('pb_auth');
	if (authCookie) {
		try {
			event.locals.pb.authStore.loadFromCookie(`pb_auth=${authCookie}`);

			// Verify and refresh token if valid
			if (event.locals.pb.authStore.isValid) {
				try {
					await event.locals.pb.collection('users').authRefresh();
					event.locals.user = {
						id: event.locals.pb.authStore.model?.id,
						email: event.locals.pb.authStore.model?.email,
						displayName: event.locals.pb.authStore.model?.displayName,
						avatarUrl: event.locals.pb.authStore.model?.avatarUrl,
						role: event.locals.pb.authStore.model?.role || 'member',
						createdAt: event.locals.pb.authStore.model?.created,
						updatedAt: event.locals.pb.authStore.model?.updated
					};
				} catch {
					// Token refresh failed, clear auth
					event.locals.pb.authStore.clear();
					event.locals.user = null;
				}
			}
		} catch {
			// Invalid cookie, clear auth
			event.locals.pb.authStore.clear();
			event.locals.user = null;
		}
	} else {
		event.locals.user = null;
	}

	const response = await resolve(event);

	// Set auth cookie for client
	const isProd = process.env.NODE_ENV === 'production';
	response.headers.set(
		'set-cookie',
		event.locals.pb.authStore.exportToCookie({
			httpOnly: false,
			secure: isProd,
			sameSite: 'lax',
			path: '/'
		})
	);

	return response;
};
