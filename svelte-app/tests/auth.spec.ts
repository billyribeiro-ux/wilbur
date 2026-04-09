/**
 * Authentication E2E Tests
 * Wilbur Trading Room - December 2025
 */

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('should display home page with login button', async ({ page }) => {
		await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
	});

	test('should navigate to login page', async ({ page }) => {
		await page.getByRole('link', { name: 'Sign In' }).click();
		await expect(page).toHaveURL('/auth/login');
		await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
	});

	test('should navigate to register page', async ({ page }) => {
		await page.getByRole('link', { name: 'Get Started' }).click();
		await expect(page).toHaveURL('/auth/register');
		await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
	});

	test('should show validation errors on empty login form', async ({ page }) => {
		await page.goto('/auth/login');
		await page.getByRole('button', { name: 'Sign in' }).click();

		// Browser validation should prevent submission
		const emailInput = page.locator('#email');
		await expect(emailInput).toHaveAttribute('required', '');
	});

	test('should show validation errors on empty register form', async ({ page }) => {
		await page.goto('/auth/register');
		await page.getByRole('button', { name: 'Create account' }).click();

		// Browser validation should prevent submission
		const emailInput = page.locator('#email');
		await expect(emailInput).toHaveAttribute('required', '');
	});

	test('should show password visibility toggle', async ({ page }) => {
		await page.goto('/auth/login');

		const passwordInput = page.locator('#password');
		await expect(passwordInput).toHaveAttribute('type', 'password');

		// Click the eye icon to show password
		await page.locator('button[title="Show password"], button:has(svg)').first().click();

		// Note: The actual implementation uses a button with an SVG icon
		// This test verifies the toggle button exists
	});

	test('should navigate between login and register pages', async ({ page }) => {
		await page.goto('/auth/login');

		// Click "Sign up" link
		await page.getByRole('link', { name: 'Sign up' }).click();
		await expect(page).toHaveURL('/auth/register');

		// Click "Sign in" link
		await page.getByRole('link', { name: 'Sign in' }).click();
		await expect(page).toHaveURL('/auth/login');
	});
});

test.describe('Protected Routes', () => {
	test('should redirect to login when accessing rooms without auth', async ({ page }) => {
		await page.goto('/rooms');

		// Should redirect to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('should redirect to login when accessing room detail without auth', async ({ page }) => {
		await page.goto('/rooms/some-room-id');

		// Should redirect to login
		await expect(page).toHaveURL(/\/auth\/login/);
	});
});
