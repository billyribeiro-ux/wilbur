/**
 * Authenticated end-to-end flows against a real PocketBase instance.
 *
 * Requires PocketBase running + seeded:
 *   pnpm db:setup && pnpm db:seed   (see scripts/setup-pocketbase.mjs / seed-pocketbase.mjs)
 *
 * Drives the real login → rooms → room flows (chat, polls, alerts) that the smoke
 * tests can't. Whiteboard tools are covered with pixel-level evidence in
 * whiteboard.spec.ts. Self-skips when PocketBase isn't reachable.
 */
import { test, expect } from '@playwright/test';
import { pbHealthy, openDemoRoom } from './helpers';

let pbReady = false;
test.beforeAll(async () => { pbReady = await pbHealthy(); });
test.beforeEach(() => {
	test.skip(!pbReady, 'PocketBase not reachable — run: pnpm db:setup && pnpm db:seed && pnpm pocketbase:start');
});

test('chat: open the seeded room and send a message', async ({ page }) => {
	await openDemoRoom(page);
	await expect(page.getByText('Welcome to the demo room!')).toBeVisible({ timeout: 15000 });

	const text = `Hello from Playwright ${Date.now()}`;
	const input = page.getByPlaceholder('Type a message...');
	await input.fill(text);
	await input.press('Enter');
	// Optimistic + realtime copies can briefly coexist; assert at least one is shown.
	await expect(page.getByText(text).first()).toBeVisible({ timeout: 15000 });
});

test('polls: create a poll and cast a vote', async ({ page }) => {
	await openDemoRoom(page);
	await page.getByRole('button', { name: 'Polls' }).first().click();
	await page.getByRole('button', { name: '+ New Poll' }).click();

	// Unique title so repeated runs don't collide on a shared PocketBase instance.
	const question = `Long or short on AAPL? ${Date.now()}`;
	await page.getByPlaceholder('What do you want to ask?').fill(question);
	await page.getByPlaceholder('Option 1').fill('Long');
	await page.getByPlaceholder('Option 2').fill('Short');
	await page.getByRole('button', { name: 'Create Poll' }).click();

	const poll = page.locator('.poll-card', { hasText: question });
	await expect(poll).toBeVisible({ timeout: 15000 });
	await poll.locator('.poll-option', { hasText: 'Long' }).click();
	await expect(poll.getByText(/\b1 vote\b/)).toBeVisible({ timeout: 15000 });
});

test('alerts: enforce the disclosure rule, then post an alert', async ({ page }) => {
	await openDemoRoom(page);
	await page.getByRole('button', { name: 'Alerts' }).first().click();
	await page.getByRole('button', { name: 'Post Alert' }).click(); // header opens the modal

	const modal = page.locator('.fixed.inset-0');
	const body = `AAPL breakout ${Date.now()}`;
	await modal.locator('#alertBody').fill(body);

	// Enable disclosure but leave the text empty -> Valibot conditional rule fires.
	await modal.getByText('Add disclosure').click();
	await modal.getByRole('button', { name: 'Post Alert' }).click();
	await expect(page.getByText(/Legal disclosure text required/)).toBeVisible({ timeout: 10000 });

	// Provide the text -> the alert posts and appears in the list.
	await modal.locator('#legalDisclosure').fill('Not financial advice.');
	await modal.getByRole('button', { name: 'Post Alert' }).click();
	await expect(page.getByText(body)).toBeVisible({ timeout: 15000 });
});
