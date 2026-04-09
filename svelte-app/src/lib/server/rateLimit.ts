/**
 * Rate Limiting Middleware
 * Wilbur Trading Room - December 2025
 *
 * Simple in-memory rate limiter for API routes
 * For production, consider Redis-based solution
 */

interface RateLimitEntry {
	count: number;
	resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
	const now = Date.now();
	for (const [key, entry] of rateLimitStore.entries()) {
		if (entry.resetTime < now) {
			rateLimitStore.delete(key);
		}
	}
}, 5 * 60 * 1000);

export interface RateLimitConfig {
	/** Maximum requests allowed in the window */
	maxRequests: number;
	/** Time window in milliseconds */
	windowMs: number;
	/** Identifier prefix (e.g., 'api', 'auth') */
	prefix?: string;
}

export interface RateLimitResult {
	success: boolean;
	remaining: number;
	resetTime: number;
	retryAfter?: number;
}

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
	identifier: string,
	config: RateLimitConfig
): RateLimitResult {
	const key = config.prefix ? `${config.prefix}:${identifier}` : identifier;
	const now = Date.now();
	const entry = rateLimitStore.get(key);

	// No existing entry or expired
	if (!entry || entry.resetTime < now) {
		rateLimitStore.set(key, {
			count: 1,
			resetTime: now + config.windowMs
		});
		return {
			success: true,
			remaining: config.maxRequests - 1,
			resetTime: now + config.windowMs
		};
	}

	// Within window
	if (entry.count >= config.maxRequests) {
		return {
			success: false,
			remaining: 0,
			resetTime: entry.resetTime,
			retryAfter: Math.ceil((entry.resetTime - now) / 1000)
		};
	}

	// Increment count
	entry.count++;
	return {
		success: true,
		remaining: config.maxRequests - entry.count,
		resetTime: entry.resetTime
	};
}

/**
 * Pre-configured rate limiters
 */
export const rateLimiters = {
	/** Strict limit for auth endpoints: 5 requests per minute */
	auth: (identifier: string) =>
		checkRateLimit(identifier, {
			maxRequests: 5,
			windowMs: 60 * 1000,
			prefix: 'auth'
		}),

	/** Standard API limit: 100 requests per minute */
	api: (identifier: string) =>
		checkRateLimit(identifier, {
			maxRequests: 100,
			windowMs: 60 * 1000,
			prefix: 'api'
		}),

	/** Chat messages: 30 per minute */
	chat: (identifier: string) =>
		checkRateLimit(identifier, {
			maxRequests: 30,
			windowMs: 60 * 1000,
			prefix: 'chat'
		}),

	/** Alerts: 10 per minute */
	alerts: (identifier: string) =>
		checkRateLimit(identifier, {
			maxRequests: 10,
			windowMs: 60 * 1000,
			prefix: 'alerts'
		}),

	/** File uploads: 20 per hour */
	uploads: (identifier: string) =>
		checkRateLimit(identifier, {
			maxRequests: 20,
			windowMs: 60 * 60 * 1000,
			prefix: 'uploads'
		})
};

/**
 * Get client identifier from request
 */
export function getClientIdentifier(request: Request, userId?: string): string {
	// Prefer user ID for authenticated requests
	if (userId) return userId;

	// Fall back to IP address
	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) {
		return forwarded.split(',')[0].trim();
	}

	return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Create rate limit error response
 */
export function rateLimitResponse(result: RateLimitResult): Response {
	return new Response(
		JSON.stringify({
			error: 'Too Many Requests',
			message: 'Rate limit exceeded. Please try again later.',
			retryAfter: result.retryAfter
		}),
		{
			status: 429,
			headers: {
				'Content-Type': 'application/json',
				'Retry-After': String(result.retryAfter || 60),
				'X-RateLimit-Remaining': String(result.remaining),
				'X-RateLimit-Reset': String(result.resetTime)
			}
		}
	);
}
