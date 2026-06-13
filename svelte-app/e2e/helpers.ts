/**
 * Shared E2E helpers (auth, navigation, and canvas pixel inspection).
 *
 * The canvas helpers read real device pixels via getImageData so tests can assert
 * what was actually painted — not just that a store counter changed.
 */
import { expect, type Page, type Locator } from '@playwright/test';

export const TEST_USER = { email: 'trader@wilbur.local', password: 'TraderPass123!' };
export const PB_URL = process.env.PUBLIC_POCKETBASE_URL || 'http://127.0.0.1:8090';

export async function pbHealthy(): Promise<boolean> {
	try {
		return (await fetch(`${PB_URL}/api/health`)).ok;
	} catch {
		return false;
	}
}

export async function login(page: Page): Promise<void> {
	await page.goto('/auth/login', { waitUntil: 'networkidle' });
	await page.locator('#email').fill(TEST_USER.email);
	await page.locator('#password').fill(TEST_USER.password);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page).toHaveURL(/\/rooms\/?$/, { timeout: 15000 });
}

export async function openDemoRoom(page: Page): Promise<string> {
	await login(page);
	await expect(page.getByText('Demo Trading Room')).toBeVisible({ timeout: 15000 });
	await page.getByText('Demo Trading Room').click();
	await expect(page).toHaveURL(/\/rooms\/[a-z0-9]+/);
	return page.url();
}

export async function openWhiteboard(page: Page): Promise<Locator> {
	const roomUrl = await openDemoRoom(page);
	await page.goto(`${roomUrl}/whiteboard`, { waitUntil: 'networkidle' });
	const canvas = page.locator('canvas.wb-canvas');
	await expect(canvas).toBeVisible();
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
	return canvas;
}

export type Pixel = { r: number; g: number; b: number; a: number };

/** One device pixel at canvas-relative CSS coords (accounts for devicePixelRatio). */
export function pixelAt(canvas: Locator, cssX: number, cssY: number): Promise<Pixel> {
	return canvas.evaluate((cv: HTMLCanvasElement, p: { x: number; y: number }) => {
		const ctx = cv.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;
		const d = ctx.getImageData(Math.round(p.x * dpr), Math.round(p.y * dpr), 1, 1).data;
		return { r: d[0], g: d[1], b: d[2], a: d[3] };
	}, { x: cssX, y: cssY });
}

/** Count painted (alpha > 0) pixels inside a canvas-relative CSS rectangle. */
export function paintedPixels(canvas: Locator, x0: number, y0: number, x1: number, y1: number): Promise<number> {
	return canvas.evaluate((cv: HTMLCanvasElement, r: { x0: number; y0: number; x1: number; y1: number }) => {
		const ctx = cv.getContext('2d')!;
		const dpr = window.devicePixelRatio || 1;
		const dx = Math.round(r.x0 * dpr), dy = Math.round(r.y0 * dpr);
		const w = Math.max(1, Math.round((r.x1 - r.x0) * dpr));
		const h = Math.max(1, Math.round((r.y1 - r.y0) * dpr));
		const data = ctx.getImageData(dx, dy, w, h).data;
		let n = 0;
		for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++;
		return n;
	}, { x0, y0, x1, y1 });
}

export const selectTool = (page: Page, title: string) => page.locator(`button[title="${title}"]`).click();
export const pickColor = (page: Page, hex: string) => page.locator(`button.color-swatch[aria-label="Select color ${hex}"]`).click();

/** Drag a freehand stroke across the canvas using real pointer events (canvas-relative CSS points). */
export async function drawStroke(page: Page, canvas: Locator, points: Array<[number, number]>): Promise<void> {
	const box = (await canvas.boundingBox())!;
	await page.mouse.move(box.x + points[0][0], box.y + points[0][1]);
	await page.mouse.down();
	for (let i = 1; i < points.length; i++) {
		await page.mouse.move(box.x + points[i][0], box.y + points[i][1], { steps: 8 });
	}
	await page.mouse.up();
}

export async function clickCanvas(page: Page, canvas: Locator, x: number, y: number): Promise<void> {
	const box = (await canvas.boundingBox())!;
	await page.mouse.click(box.x + x, box.y + y);
}
