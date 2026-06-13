/**
 * Valibot Validation Schemas
 * Wilbur Trading Room
 *
 * Centralized validation for all user inputs. Same schema names and semantics as
 * before; migrated from Zod to Valibot for a smaller, tree-shakeable footprint.
 */

import * as v from 'valibot';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/** ID validator (UUID format) */
export const uuidSchema = v.pipe(v.string(), v.uuid('Invalid ID format'));

/** Email validator with additional checks */
export const emailSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.email('Invalid email address'),
	v.minLength(5, 'Email too short'),
	v.maxLength(255, 'Email too long')
);

/** Password validator */
export const passwordSchema = v.pipe(
	v.string(),
	v.minLength(8, 'Password must be at least 8 characters'),
	v.maxLength(128, 'Password too long'),
	v.regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
	v.regex(/[a-z]/, 'Password must contain at least one lowercase letter'),
	v.regex(/[0-9]/, 'Password must contain at least one number')
);

/** Display name validator */
export const displayNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(2, 'Display name must be at least 2 characters'),
	v.maxLength(50, 'Display name too long'),
	v.regex(
		/^[a-zA-Z0-9_\-\s]+$/,
		'Display name can only contain letters, numbers, spaces, hyphens, and underscores'
	)
);

/** Safe text content (strips HTML) */
export const safeTextSchema = v.pipe(
	v.string(),
	v.maxLength(5000, 'Content too long'),
	v.transform((val) => val.replace(/<[^>]*>/g, '').trim())
);

/** URL validator */
export const urlSchema = v.pipe(v.string(), v.url('Invalid URL'), v.maxLength(2048, 'URL too long'));

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = v.object({
	email: emailSchema,
	password: v.pipe(v.string(), v.minLength(1, 'Password is required'))
});

export const registerSchema = v.pipe(
	v.object({
		email: emailSchema,
		password: passwordSchema,
		passwordConfirm: v.string(),
		displayName: displayNameSchema
	}),
	v.forward(
		v.check((data) => data.password === data.passwordConfirm, 'Passwords do not match'),
		['passwordConfirm']
	)
);

export const forgotPasswordSchema = v.object({
	email: emailSchema
});

export const resetPasswordSchema = v.pipe(
	v.object({
		token: v.pipe(v.string(), v.minLength(1, 'Token is required')),
		password: passwordSchema,
		passwordConfirm: v.string()
	}),
	v.forward(
		v.check((data) => data.password === data.passwordConfirm, 'Passwords do not match'),
		['passwordConfirm']
	)
);

// ============================================================================
// ROOM SCHEMAS
// ============================================================================

export const roomNameSchema = v.pipe(
	v.string(),
	v.trim(),
	v.toLowerCase(),
	v.minLength(2, 'Room name must be at least 2 characters'),
	v.maxLength(50, 'Room name too long'),
	v.regex(
		/^[a-zA-Z0-9_-]+$/,
		'Room name can only contain letters, numbers, hyphens, and underscores'
	)
);

export const createRoomSchema = v.object({
	name: roomNameSchema,
	title: v.pipe(v.string(), v.trim(), v.minLength(2, 'Title required'), v.maxLength(200, 'Title too long')),
	description: v.optional(v.pipe(v.string(), v.maxLength(1000, 'Description too long'))),
	tags: v.optional(v.pipe(v.array(v.pipe(v.string(), v.maxLength(30))), v.maxLength(10, 'Maximum 10 tags')))
});

export const updateRoomSchema = v.object({
	title: v.optional(v.pipe(v.string(), v.trim(), v.minLength(2), v.maxLength(200))),
	description: v.optional(v.pipe(v.string(), v.maxLength(1000))),
	tags: v.optional(v.pipe(v.array(v.pipe(v.string(), v.maxLength(30))), v.maxLength(10))),
	isActive: v.optional(v.boolean())
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const chatMessageSchema = v.object({
	content: v.pipe(v.string(), v.trim(), v.minLength(1, 'Message cannot be empty'), v.maxLength(5000, 'Message too long')),
	contentType: v.optional(v.picklist(['text', 'image', 'file']), 'text'),
	fileUrl: v.optional(urlSchema)
});

export const pinMessageSchema = v.object({
	messageId: uuidSchema
});

export const deleteMessageSchema = v.object({
	messageId: uuidSchema,
	reason: v.optional(v.pipe(v.string(), v.maxLength(500)))
});

// ============================================================================
// ALERT SCHEMAS
// ============================================================================

export const createAlertSchema = v.pipe(
	v.object({
		title: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(200, 'Title too long'))),
		body: v.pipe(v.string(), v.trim(), v.minLength(1, 'Alert content required'), v.maxLength(5000, 'Content too long')),
		type: v.optional(v.picklist(['text', 'url', 'media']), 'text'),
		isNonTrade: v.optional(v.boolean(), false),
		hasLegalDisclosure: v.optional(v.boolean(), false),
		legalDisclosureText: v.optional(v.pipe(v.string(), v.maxLength(2000)))
	}),
	v.forward(
		v.check(
			(data) => !data.hasLegalDisclosure || Boolean(data.legalDisclosureText),
			'Legal disclosure text required when disclosure is enabled'
		),
		['legalDisclosureText']
	)
);

// ============================================================================
// POLL SCHEMAS
// ============================================================================

export const createPollSchema = v.object({
	title: v.pipe(v.string(), v.trim(), v.minLength(1, 'Title required'), v.maxLength(200, 'Title too long')),
	description: v.optional(v.pipe(v.string(), v.maxLength(1000))),
	options: v.pipe(
		v.array(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200))),
		v.minLength(2, 'At least 2 options required'),
		v.maxLength(10, 'Maximum 10 options')
	),
	expiresAt: v.optional(v.pipe(v.string(), v.isoTimestamp()))
});

export const votePollSchema = v.object({
	pollId: uuidSchema,
	optionIndex: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(9))
});

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

export const moderationActionSchema = v.object({
	targetUserId: uuidSchema,
	action: v.picklist(['kick', 'ban', 'mute', 'warn', 'unban', 'unmute']),
	reason: v.optional(v.pipe(v.string(), v.maxLength(1000))),
	duration: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))) // minutes for temp bans/mutes
});

export const reportContentSchema = v.object({
	contentType: v.picklist(['message', 'alert', 'user', 'room']),
	contentId: uuidSchema,
	reason: v.pipe(v.string(), v.trim(), v.minLength(10, 'Please provide more detail'), v.maxLength(1000, 'Reason too long'))
});

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const updateProfileSchema = v.object({
	displayName: v.optional(displayNameSchema),
	bio: v.optional(v.pipe(v.string(), v.maxLength(500, 'Bio too long'))),
	location: v.optional(v.pipe(v.string(), v.maxLength(100))),
	timezone: v.optional(v.pipe(v.string(), v.maxLength(50)))
});

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = v.object({
	filename: v.pipe(v.string(), v.minLength(1), v.maxLength(255)),
	mimeType: v.pipe(v.string(), v.regex(/^[\w-]+\/[\w-]+$/)),
	fileSize: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(52428800, 'File too large (max 50MB)')),
	folderName: v.optional(v.pipe(v.string(), v.maxLength(100)))
});

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Validate data with a schema and return either parsed output or a flat map of
 * field path -> error message.
 */
export function validateWithSchema<TSchema extends v.GenericSchema>(
	schema: TSchema,
	data: unknown
): { success: true; data: v.InferOutput<TSchema> } | { success: false; errors: Record<string, string> } {
	const result = v.safeParse(schema, data);

	if (result.success) {
		return { success: true, data: result.output };
	}

	const errors: Record<string, string> = {};
	for (const issue of result.issues) {
		const path = issue.path?.map((p) => String((p as { key: unknown }).key)).join('.') ?? '';
		errors[path] = issue.message;
	}

	return { success: false, errors };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginInput = v.InferOutput<typeof loginSchema>;
export type RegisterInput = v.InferOutput<typeof registerSchema>;
export type CreateRoomInput = v.InferOutput<typeof createRoomSchema>;
export type ChatMessageInput = v.InferOutput<typeof chatMessageSchema>;
export type CreateAlertInput = v.InferOutput<typeof createAlertSchema>;
export type CreatePollInput = v.InferOutput<typeof createPollSchema>;
export type ModerationActionInput = v.InferOutput<typeof moderationActionSchema>;
export type ReportContentInput = v.InferOutput<typeof reportContentSchema>;
export type UpdateProfileInput = v.InferOutput<typeof updateProfileSchema>;
