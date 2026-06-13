/**
 * Authenticated end-to-end flows against a real PocketBase instance.
 *
 * Requires PocketBase running + seeded:
 *   pnpm db:setup && pnpm db:seed   (see scripts/setup-pocketbase.mjs / seed-pocketbase.mjs)
 *
 * Verifies the real login → rooms → room → chat + whiteboard flows the smoke tests can't.
 */
import { test, expect, type Page } from '@playwright/test';

const USER = { email: 'trader@wilbur.local', password: 'TraderPass123!' };
const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

// These flows need a running, seeded PocketBase. Skip gracefully when it isn't up
// so a plain `pnpm test:e2e` still runs the smoke + validation suites.
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

test('chat: open the seeded room and send a message', async ({ page }) => {
	await openDemoRoom(page);

	// Seeded message proves fetchMessages() hit the real backend.
	await expect(page.getByText('Welcome to the demo room!')).toBeVisible({ timeout: 15000 });

	const text = `Hello from Playwright ${Date.now()}`;
	const input = page.getByPlaceholder('Type a message...');
	await input.fill(text);
	await input.press('Enter');
	await expect(page.getByText(text)).toBeVisible({ timeout: 15000 });
});

test('whiteboard: drawing with the pen increments the shape count', async ({ page }) => {
	const roomUrl = await openDemoRoom(page);
	await page.goto(`${roomUrl}/whiteboard`, { waitUntil: 'networkidle' });

	const canvas = page.locator('canvas.wb-canvas');
	await expect(canvas).toBeVisible();
	await expect(page.getByText(/^0 shapes/)).toBeVisible(); // starts empty

	// Pen is the default tool — draw a stroke with real pointer movement.
	const box = await canvas.boundingBox();
	if (!box) throw new Error('canvas has no bounding box');
	await page.mouse.move(box.x + 60, box.y + 60);
	await page.mouse.down();
	await page.mouse.move(box.x + 160, box.y + 120, { steps: 12 });
	await page.mouse.move(box.x + 240, box.y + 90, { steps: 12 });
	await page.mouse.up();

	// The status bar reflects the committed shape.
	await expect(page.getByText(/^1 shape\b/)).toBeVisible({ timeout: 10000 });
});
