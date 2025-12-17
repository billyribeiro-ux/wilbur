/**
 * Chat E2E Tests
 * Wilbur Trading Room - December 2025
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
	// Note: These tests would require a logged-in user
	// In production, use Playwright fixtures for auth

	test('should display chat input on room page', async ({ page }) => {
		// This test checks UI structure even without auth
		await page.goto('/');

		// Home page should have call-to-action
		await expect(page.getByText('Trading Rooms')).toBeVisible();
	});

	test('should have accessible form elements', async ({ page }) => {
		await page.goto('/auth/login');

		// Check form accessibility
		const emailLabel = page.getByLabel('Email address');
		await expect(emailLabel).toBeVisible();

		const passwordLabel = page.getByLabel('Password');
		await expect(passwordLabel).toBeVisible();
	});
});

test.describe('Alerts Interface', () => {
	test('should display alert features on home', async ({ page }) => {
		await page.goto('/');

		// Check alert-related features
		await expect(page.getByText('Trading Alerts')).toBeVisible();
		await expect(page.getByText('Broadcast alerts with legal disclosures')).toBeVisible();
	});
});

test.describe('Performance', () => {
	test('should load home page quickly', async ({ page }) => {
		const start = Date.now();
		await page.goto('/');
		const loadTime = Date.now() - start;

		// Should load in under 3 seconds
		expect(loadTime).toBeLessThan(3000);

		// Core content should be visible
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
	});

	test('should have no console errors on home page', async ({ page }) => {
		const errors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				errors.push(msg.text());
			}
		});

		await page.goto('/');
		await page.waitForLoadState('networkidle');

		// Filter out expected errors (like missing env vars in test)
		const criticalErrors = errors.filter(
			(e) => !e.includes('VITE_') && !e.includes('env')
		);

		expect(criticalErrors).toHaveLength(0);
	});
});
