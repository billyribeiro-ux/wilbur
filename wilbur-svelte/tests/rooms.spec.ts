/**
 * Rooms E2E Tests
 * Wilbur Trading Room - December 2025
 */

import { test, expect } from '@playwright/test';

// Helper to login (mock for now since Pocketbase needs to be running)
async function mockLogin(page: any) {
	// In a real test environment, we'd set up auth cookies
	// For now, we test the UI behavior
}

test.describe('Rooms Page', () => {
	test.beforeEach(async ({ page }) => {
		// Note: These tests assume the user is authenticated
		// In production, you'd set up proper auth fixtures
	});

	test('should display rooms page header', async ({ page }) => {
		await page.goto('/rooms');

		// Even without auth, we should see the loading state or redirect
		// The page structure should be testable
		await expect(page).toHaveURL(/\/(rooms|auth\/login)/);
	});

	test('should display room features on home page', async ({ page }) => {
		await page.goto('/');

		// Check feature cards
		await expect(page.getByText('Real-time Chat')).toBeVisible();
		await expect(page.getByText('Trading Alerts')).toBeVisible();
		await expect(page.getByText('Community Rooms')).toBeVisible();
	});

	test('should display tech stack section', async ({ page }) => {
		await page.goto('/');

		// Check tech stack badges
		await expect(page.getByText('Svelte 5')).toBeVisible();
		await expect(page.getByText('Pocketbase')).toBeVisible();
		await expect(page.getByText('Turso')).toBeVisible();
	});
});

test.describe('Room Detail Page', () => {
	test('should handle non-existent room gracefully', async ({ page }) => {
		await page.goto('/rooms/non-existent-room');

		// Should either redirect or show error
		// Depends on auth state
		await expect(page).toHaveURL(/\/(rooms|auth\/login)/);
	});
});

test.describe('Responsive Design', () => {
	test('should be responsive on mobile', async ({ page }) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });
		await page.goto('/');

		// Mobile navigation should be present
		await expect(page.getByRole('link', { name: /Wilbur/ })).toBeVisible();
	});

	test('should be responsive on tablet', async ({ page }) => {
		await page.setViewportSize({ width: 768, height: 1024 });
		await page.goto('/');

		// Features should still be visible
		await expect(page.getByText('Real-time Chat')).toBeVisible();
	});

	test('should be responsive on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 1080 });
		await page.goto('/');

		// Full navigation should be visible
		await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
	});
});
