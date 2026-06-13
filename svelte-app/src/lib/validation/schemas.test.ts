import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import {
	emailSchema,
	passwordSchema,
	registerSchema,
	chatMessageSchema,
	createPollSchema,
	createAlertSchema,
	validateWithSchema
} from './schemas';

describe('emailSchema', () => {
	it('trims and lowercases a valid email', () => {
		expect(v.parse(emailSchema, '  USER@Example.COM ')).toBe('user@example.com');
	});
	it('rejects an invalid email', () => {
		expect(v.safeParse(emailSchema, 'nope').success).toBe(false);
	});
});

describe('passwordSchema', () => {
	it('accepts a strong password', () => {
		expect(v.safeParse(passwordSchema, 'Abcd1234').success).toBe(true);
	});
	it('rejects a password without an uppercase letter', () => {
		const r = v.safeParse(passwordSchema, 'abcd1234');
		expect(r.success).toBe(false);
	});
	it('rejects a too-short password', () => {
		expect(v.safeParse(passwordSchema, 'Ab1').success).toBe(false);
	});
});

describe('registerSchema cross-field check', () => {
	it('flags mismatched passwords on the passwordConfirm path', () => {
		const res = validateWithSchema(registerSchema, {
			email: 'a@b.com',
			password: 'Abcd1234',
			passwordConfirm: 'Abcd9999',
			displayName: 'Trader Joe'
		});
		expect(res.success).toBe(false);
		if (!res.success) expect(res.errors.passwordConfirm).toBe('Passwords do not match');
	});
	it('passes when passwords match', () => {
		const res = validateWithSchema(registerSchema, {
			email: 'a@b.com',
			password: 'Abcd1234',
			passwordConfirm: 'Abcd1234',
			displayName: 'Trader Joe'
		});
		expect(res.success).toBe(true);
	});
});

describe('chatMessageSchema', () => {
	it('rejects empty content', () => {
		expect(v.safeParse(chatMessageSchema, { content: '   ' }).success).toBe(false);
	});
	it('defaults contentType to text', () => {
		const r = v.parse(chatMessageSchema, { content: 'gm' });
		expect(r.contentType).toBe('text');
	});
});

describe('createPollSchema', () => {
	it('requires at least 2 options', () => {
		expect(v.safeParse(createPollSchema, { title: 'P', options: ['only one'] }).success).toBe(false);
	});
	it('accepts a valid poll', () => {
		expect(v.safeParse(createPollSchema, { title: 'P', options: ['a', 'b'] }).success).toBe(true);
	});
});

describe('createAlertSchema conditional disclosure', () => {
	it('requires disclosure text when disclosure is enabled', () => {
		const res = validateWithSchema(createAlertSchema, {
			body: 'Buy now',
			hasLegalDisclosure: true
		});
		expect(res.success).toBe(false);
		if (!res.success) expect(res.errors.legalDisclosureText).toContain('Legal disclosure');
	});
	it('passes without disclosure', () => {
		expect(v.safeParse(createAlertSchema, { body: 'Buy now' }).success).toBe(true);
	});
});
