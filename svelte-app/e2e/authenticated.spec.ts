/**
 * Authenticated end-to-end flows against a real PocketBase instance.
 *
 * Requires PocketBase running + seeded:
 *   pnpm db:setup && pnpm db:seed   (see scripts/setup-pocketbase.mjs / seed-pocketbase.mjs)
 *
 * Drives the real login → rooms → room flows (chat, whiteboard tools, polls, alerts)
 * that the smoke tests can't. Self-skips when PocketBase isn't reachable.
 */
import { test, expect, type Page } from '@playwright/test';

const USER = { email: 'trader@wilbur.local', password: 'TraderPass123!' };
const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

let pbReady = false;
test.beforeAll(async () => {
	try {
		const res = await fetch(`${PB_URL}/api/health`);
		pbReady = res.ok;
	} catch {
		pbReady = false;
	}
});
test.beforeEach(() => {
	test.skip(!pbReady, `PocketBase not reachable at ${PB_URL} — run: pnpm db:setup && pnpm db:seed && pnpm pocketbase:start`);
});

async function login(page: Page) {
	await page.goto('/auth/login', { waitUntil: 'networkidle' });
	await page.locator('#email').fill(USER.email);
	await page.locator('#password').fill(USER.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/rooms\/?$/, { timeout: 15000 });
}

async function openDemoRoom(page: Page): Promise<string> {
	await login(page);
	await expect(page.getByText('Demo Trading Room')).toBeVisible({ timeout: 15000 });
	await page.getByText('Demo Trading Room').click();
	await expect(page).toHaveURL(/\/rooms\/[a-z0-9]+/);
	return page.url();
}

async function openWhiteboard(page: Page) {
	const roomUrl = await openDemoRoom(page);
	await page.goto(`${roomUrl}/whiteboard`, { waitUntil: 'networkidle' });
	const canvas = page.locator('canvas.wb-canvas');
	await expect(canvas).toBeVisible();
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
	return canvas;
}

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

test('whiteboard pen: drawing increments the shape count', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	const box = (await canvas.boundingBox())!;
	await page.mouse.move(box.x + 60, box.y + 60);
	await page.mouse.down();
	await page.mouse.move(box.x + 200, box.y + 100, { steps: 12 });
	await page.mouse.up();
	await expect(page.getByText(/^1 shape\b/)).toBeVisible({ timeout: 10000 });
});

test('whiteboard emoji: clicking places an emoji shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await page.locator('button[title="Emoji"]').click();
	const box = (await canvas.boundingBox())!;
	await page.mouse.click(box.x + 100, box.y + 100);
	await expect(page.getByText(/^1 shape\b/)).toBeVisible({ timeout: 10000 });
});

test('whiteboard text: typing commits a text shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await page.locator('button[title="Text"]').click();
	const box = (await canvas.boundingBox())!;
	await page.mouse.click(box.x + 80, box.y + 80);
	const input = page.locator('.wb-text-input');
	await expect(input).toBeVisible();
	await input.fill('GM traders');
	await input.press('Enter');
	await expect(page.getByText(/^1 shape\b/)).toBeVisible({ timeout: 10000 });
});

test('whiteboard select + delete: removes the selected shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	const box = (await canvas.boundingBox())!;
	// Draw a pen stroke (pen is the default tool).
	await page.mouse.move(box.x + 60, box.y + 60);
	await page.mouse.down();
	await page.mouse.move(box.x + 220, box.y + 110, { steps: 12 });
	await page.mouse.up();
	await expect(page.getByText(/^1 shape\b/)).toBeVisible({ timeout: 10000 });

	// Switch to select, click on the stroke, delete it.
	await page.locator('button[title="Select"]').click();
	await page.mouse.click(box.x + 140, box.y + 85);
	await page.keyboard.press('Delete');
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible({ timeout: 10000 });
});

test('polls: create a poll and cast a vote', async ({ page }) => {
	await openDemoRoom(page);
	await page.getByRole('button', { name: 'Polls' }).first().click();
	await page.getByRole('button', { name: '+ New Poll' }).click();

	await page.getByPlaceholder('What do you want to ask?').fill('Long or short on AAPL?');
	await page.getByPlaceholder('Option 1').fill('Long');
	await page.getByPlaceholder('Option 2').fill('Short');
	await page.getByRole('button', { name: 'Create Poll' }).click();

	await expect(page.getByText('Long or short on AAPL?')).toBeVisible({ timeout: 15000 });
	await page.locator('.poll-option', { hasText: 'Long' }).click();
	await expect(page.getByText(/\b1 vote\b/)).toBeVisible({ timeout: 15000 });
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
