/**
 * Zod Validation Schemas
 * Wilbur Trading Room - December 2025
 *
 * Centralized validation for all user inputs
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

/** UUID v4 validator */
export const uuidSchema = z.string().uuid('Invalid ID format');

/** Email validator with additional checks */
export const emailSchema = z
	.string()
	.email('Invalid email address')
	.min(5, 'Email too short')
	.max(255, 'Email too long')
	.toLowerCase()
	.trim();

/** Password validator */
export const passwordSchema = z
	.string()
	.min(8, 'Password must be at least 8 characters')
	.max(128, 'Password too long')
	.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
	.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
	.regex(/[0-9]/, 'Password must contain at least one number');

/** Display name validator */
export const displayNameSchema = z
	.string()
	.min(2, 'Display name must be at least 2 characters')
	.max(50, 'Display name too long')
	.regex(/^[a-zA-Z0-9_\-\s]+$/, 'Display name can only contain letters, numbers, spaces, hyphens, and underscores')
	.trim();

/** Safe text content (no HTML/scripts) */
export const safeTextSchema = z
	.string()
	.max(5000, 'Content too long')
	.transform((val) => val.replace(/<[^>]*>/g, '').trim());

/** URL validator */
export const urlSchema = z
	.string()
	.url('Invalid URL')
	.max(2048, 'URL too long');

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
	email: emailSchema,
	password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
	passwordConfirm: z.string(),
	displayName: displayNameSchema
}).refine((data) => data.password === data.passwordConfirm, {
	message: 'Passwords do not match',
	path: ['passwordConfirm']
});

export const forgotPasswordSchema = z.object({
	email: emailSchema
});

export const resetPasswordSchema = z.object({
	token: z.string().min(1, 'Token is required'),
	password: passwordSchema,
	passwordConfirm: z.string()
}).refine((data) => data.password === data.passwordConfirm, {
	message: 'Passwords do not match',
	path: ['passwordConfirm']
});

// ============================================================================
// ROOM SCHEMAS
// ============================================================================

export const roomNameSchema = z
	.string()
	.min(2, 'Room name must be at least 2 characters')
	.max(50, 'Room name too long')
	.regex(/^[a-zA-Z0-9_-]+$/, 'Room name can only contain letters, numbers, hyphens, and underscores')
	.toLowerCase()
	.trim();

export const createRoomSchema = z.object({
	name: roomNameSchema,
	title: z.string().min(2, 'Title required').max(200, 'Title too long').trim(),
	description: z.string().max(1000, 'Description too long').optional(),
	tags: z.array(z.string().max(30)).max(10, 'Maximum 10 tags').optional()
});

export const updateRoomSchema = z.object({
	title: z.string().min(2).max(200).trim().optional(),
	description: z.string().max(1000).optional(),
	tags: z.array(z.string().max(30)).max(10).optional(),
	isActive: z.boolean().optional()
});

// ============================================================================
// CHAT SCHEMAS
// ============================================================================

export const chatMessageSchema = z.object({
	content: z
		.string()
		.min(1, 'Message cannot be empty')
		.max(5000, 'Message too long')
		.trim(),
	contentType: z.enum(['text', 'image', 'file']).default('text'),
	fileUrl: urlSchema.optional()
});

export const pinMessageSchema = z.object({
	messageId: uuidSchema
});

export const deleteMessageSchema = z.object({
	messageId: uuidSchema,
	reason: z.string().max(500).optional()
});

// ============================================================================
// ALERT SCHEMAS
// ============================================================================

export const createAlertSchema = z.object({
	title: z.string().max(200, 'Title too long').trim().optional(),
	body: z.string().min(1, 'Alert content required').max(5000, 'Content too long').trim(),
	type: z.enum(['text', 'url', 'media']).default('text'),
	isNonTrade: z.boolean().default(false),
	hasLegalDisclosure: z.boolean().default(false),
	legalDisclosureText: z.string().max(2000).optional()
}).refine(
	(data) => !data.hasLegalDisclosure || (data.hasLegalDisclosure && data.legalDisclosureText),
	{
		message: 'Legal disclosure text required when disclosure is enabled',
		path: ['legalDisclosureText']
	}
);

// ============================================================================
// POLL SCHEMAS
// ============================================================================

export const createPollSchema = z.object({
	title: z.string().min(1, 'Title required').max(200, 'Title too long').trim(),
	description: z.string().max(1000).optional(),
	options: z
		.array(z.string().min(1).max(200).trim())
		.min(2, 'At least 2 options required')
		.max(10, 'Maximum 10 options'),
	expiresAt: z.string().datetime().optional()
});

export const votePollSchema = z.object({
	pollId: uuidSchema,
	optionIndex: z.number().int().min(0).max(9)
});

// ============================================================================
// MODERATION SCHEMAS
// ============================================================================

export const moderationActionSchema = z.object({
	targetUserId: uuidSchema,
	action: z.enum(['kick', 'ban', 'mute', 'warn', 'unban', 'unmute']),
	reason: z.string().max(1000).optional(),
	duration: z.number().int().positive().optional() // Duration in minutes for temp bans/mutes
});

export const reportContentSchema = z.object({
	contentType: z.enum(['message', 'alert', 'user', 'room']),
	contentId: uuidSchema,
	reason: z.string().min(10, 'Please provide more detail').max(1000, 'Reason too long').trim()
});

// ============================================================================
// USER PROFILE SCHEMAS
// ============================================================================

export const updateProfileSchema = z.object({
	displayName: displayNameSchema.optional(),
	bio: z.string().max(500, 'Bio too long').optional(),
	location: z.string().max(100).optional(),
	timezone: z.string().max(50).optional()
});

// ============================================================================
// FILE UPLOAD SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
	filename: z.string().min(1).max(255),
	mimeType: z.string().regex(/^[\w-]+\/[\w-]+$/),
	fileSize: z.number().int().positive().max(52428800, 'File too large (max 50MB)'),
	folderName: z.string().max(100).optional()
});

// ============================================================================
// HELPER FUNCTION
// ============================================================================

/**
 * Validate data with a schema and return formatted errors
 */
export function validateWithSchema<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
	const result = schema.safeParse(data);

	if (result.success) {
		return { success: true, data: result.data };
	}

	const errors: Record<string, string> = {};
	for (const error of result.error.errors) {
		const path = error.path.join('.');
		errors[path] = error.message;
	}

	return { success: false, errors };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type CreatePollInput = z.infer<typeof createPollSchema>;
export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
export type ReportContentInput = z.infer<typeof reportContentSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
