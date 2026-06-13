/**
 * Client-side validation E2E (Valibot) — verifies the schemas wired into the auth
 * forms actually reject bad input in a real browser, with no backend involved.
 */

import { test, expect } from '@playwright/test';

test.describe('Register form — Valibot validation', () => {
	async function fillRegister(
		page: import('@playwright/test').Page,
		opts: { password: string; passwordConfirm: string }
	) {
		// Wait for hydration so the client-side onsubmit/validation is wired before we interact.
		await page.goto('/auth/register', { waitUntil: 'networkidle' });
		await page.locator('#displayName').fill('Trader Joe');
		await page.locator('#email').fill('trader@example.com');
		await page.locator('#password').fill(opts.password);
		await page.locator('#passwordConfirm').fill(opts.passwordConfirm);
		await page.locator('#terms').check(); // required checkbox gates HTML5 submit
		await page.getByRole('button', { name: 'Create account' }).click();
	}

	test('rejects a too-short password and stays on the page', async ({ page }) => {
		await fillRegister(page, { password: 'Abc1', passwordConfirm: 'Abc1' });
		await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
		await expect(page).toHaveURL(/\/auth\/register/);
	});

	test('rejects mismatched passwords', async ({ page }) => {
		await fillRegister(page, { password: 'Abcd1234', passwordConfirm: 'Abcd9999' });
		await expect(page.getByText('Passwords do not match')).toBeVisible();
		await expect(page).toHaveURL(/\/auth\/register/);
	});

	test('clears the field error as the user edits it', async ({ page }) => {
		await fillRegister(page, { password: 'Abc1', passwordConfirm: 'Abc1' });
		await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
		// oninput clears errors.password
		await page.locator('#password').fill('Abcd1234');
		await expect(page.getByText('Password must be at least 8 characters')).toHaveCount(0);
	});
});
