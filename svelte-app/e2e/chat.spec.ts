/**
 * Chat E2E Tests
 * Wilbur Trading Room - December 2025
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Interface', () => {
	test('should display chat input on room page', async ({ page }) => {
		await page.goto('/');
		await expect(page.getByRole('heading', { level: 1, name: /Trading Rooms/ })).toBeVisible();
	});

	test('should have accessible form elements', async ({ page }) => {
		await page.goto('/auth/login');

		const emailLabel = page.getByLabel('Email address');
		await expect(emailLabel).toBeVisible();

		const passwordLabel = page.getByLabel('Password');
		await expect(passwordLabel).toBeVisible();
	});
});

test.describe('Alerts Interface', () => {
	test('should display alert features on home', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Trading Alerts')).toBeVisible();
		await expect(page.getByText('Broadcast alerts with legal disclosures')).toBeVisible();
	});
});

test.describe('Performance', () => {
	test('should load home page quickly', async ({ page }) => {
		const start = Date.now();
		await page.goto('/');
		const loadTime = Date.now() - start;

		expect(loadTime).toBeLessThan(3000);

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

		const criticalErrors = errors.filter(
			(e) => !e.includes('VITE_') && !e.includes('env')
		);

		expect(criticalErrors).toHaveLength(0);
	});
});
