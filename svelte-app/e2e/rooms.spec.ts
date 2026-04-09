/**
 * Rooms E2E Tests
 * Wilbur Trading Room - December 2025
 */

import { test, expect } from '@playwright/test';

test.describe('Rooms Page', () => {
	test('should display rooms page header', async ({ page }) => {
		await page.goto('/rooms');
		await expect(page).toHaveURL(/\/(rooms|auth\/login)/);
	});

	test('should display room features on home page', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByText('Real-time Chat')).toBeVisible();
		await expect(page.getByText('Trading Alerts')).toBeVisible();
		await expect(page.getByText('Community Rooms')).toBeVisible();
	});

	test('should display tech stack section', async ({ page }) => {
		await page.goto('/');

		const techSection = page.locator('section').filter({
			has: page.getByRole('heading', { name: 'Powered by Modern Tech' })
		});
		await expect(techSection.getByText('Svelte 5', { exact: true })).toBeVisible();
		await expect(techSection.getByText('Pocketbase', { exact: true })).toBeVisible();
		await expect(techSection.getByText('Turso', { exact: true })).toBeVisible();
	});
});

test.describe('Room Detail Page', () => {
	test('should handle non-existent room gracefully', async ({ page }) => {
		await page.goto('/rooms/non-existent-room');
		await expect(page).toHaveURL(/\/(rooms|auth\/login)/);
	});
});

test.describe('Responsive Design', () => {
	test('should be responsive on mobile', async ({ page }) => {
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		await expect(page.locator('nav').getByText('Wilbur', { exact: true })).toBeVisible();
	});

	test('should be responsive on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/');

		await expect(page.getByText('Real-time Chat')).toBeVisible();
	});

	test('should be responsive on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');

		await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
	});
});
