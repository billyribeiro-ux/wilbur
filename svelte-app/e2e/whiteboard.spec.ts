/**
 * Whiteboard — hard-evidence E2E for every tool.
 *
 * Each test drives real pointer events and then inspects the actual canvas pixels
 * (getImageData) to prove the *correct* output: red ink for the pen, semi-transparent
 * for the highlighter, real erasure for the eraser, hollow outlines for rectangle/
 * circle, panning that moves content, etc. Requires a seeded PocketBase (auto-skips
 * if it isn't running).
 */
import { test, expect } from '@playwright/test';
import {
	pbHealthy, openWhiteboard, pixelAt, paintedPixels,
	selectTool, pickColor, drawStroke, clickCanvas
} from './helpers';

const RED = { hex: '#ef4444', r: 239 }; // tailwind red-500

let pbReady = false;
test.beforeAll(async () => { pbReady = await pbHealthy(); });
test.beforeEach(() => { test.skip(!pbReady, 'PocketBase not running — run db:setup && db:seed && pocketbase:start'); });

async function setSize(page: import('@playwright/test').Page, px: string) {
	await page.locator('.size-group select').selectOption(px);
}

test('pen: draws an opaque colored stroke', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await pickColor(page, RED.hex);
	await setSize(page, '12');
	await drawStroke(page, canvas, [[60, 100], [150, 100], [240, 100]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 60, 90, 240, 112)).toBeGreaterThan(200);
	const px = await pixelAt(canvas, 150, 100);
	expect(px.a).toBe(255);                 // opaque
	expect(px.r).toBeGreaterThan(180);      // red
	expect(px.g).toBeLessThan(120);
	expect(px.b).toBeLessThan(120);
});

test('highlighter: visible but semi-transparent (not opaque)', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Highlighter');
	await pickColor(page, RED.hex);
	await setSize(page, '12');
	await drawStroke(page, canvas, [[60, 100], [240, 100]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 60, 80, 240, 120)).toBeGreaterThan(200); // visible
	const px = await pixelAt(canvas, 150, 100);
	expect(px.a).toBeGreaterThan(0);
	expect(px.a).toBeLessThan(220);         // clearly translucent, unlike the pen
});

test('eraser: actually removes previously-drawn pixels', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await pickColor(page, RED.hex);
	await setSize(page, '12');
	await drawStroke(page, canvas, [[60, 100], [240, 100]]);
	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => pixelAt(canvas, 150, 100).then((p) => p.a)).toBe(255); // ink present

	await selectTool(page, 'Eraser');
	await drawStroke(page, canvas, [[60, 100], [240, 100]]);
	await expect(page.getByText(/^2 shapes\b/)).toBeVisible();
	// The pixel under the eraser path is now transparent — true erasure.
	await expect.poll(() => pixelAt(canvas, 150, 100).then((p) => p.a)).toBe(0);
});

test('rectangle: hollow outline (edges drawn, interior empty)', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Rectangle');
	await pickColor(page, RED.hex);
	await drawStroke(page, canvas, [[60, 60], [200, 160]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 56, 56, 204, 64)).toBeGreaterThan(0);  // top edge
	await expect.poll(() => paintedPixels(canvas, 56, 156, 204, 164)).toBeGreaterThan(0); // bottom edge
	expect(await paintedPixels(canvas, 110, 100, 150, 120)).toBe(0);                       // hollow centre
});

test('circle: hollow ellipse outline', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Circle');
	await drawStroke(page, canvas, [[60, 60], [200, 160]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 56, 56, 204, 164)).toBeGreaterThan(0);   // outline present
	expect(await paintedPixels(canvas, 120, 105, 140, 115)).toBe(0);                       // hollow centre
});

test('line: paints along the diagonal', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Line');
	await setSize(page, '8');
	await drawStroke(page, canvas, [[60, 60], [200, 160]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	// Midpoint of the diagonal (130,110) is on the line; a far corner is not.
	await expect.poll(() => paintedPixels(canvas, 122, 102, 138, 118)).toBeGreaterThan(0);
	expect(await paintedPixels(canvas, 180, 60, 200, 80)).toBe(0);
});

test('arrow: line plus an arrowhead at the tip', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Arrow');
	await setSize(page, '8');
	await drawStroke(page, canvas, [[60, 100], [220, 100]]);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 120, 96, 140, 104)).toBeGreaterThan(0); // shaft
	// Arrowhead adds pixels above/below the tip that a plain line wouldn't have.
	await expect.poll(() => paintedPixels(canvas, 195, 80, 222, 120)).toBeGreaterThan(0);
});

test('text: typed text is rendered to the canvas', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Text');
	await pickColor(page, RED.hex);
	await clickCanvas(page, canvas, 80, 100);
	const input = page.locator('.wb-text-input');
	await expect(input).toBeVisible();
	await input.fill('LONG');
	await input.press('Enter');

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 78, 80, 200, 105)).toBeGreaterThan(20);
});

test('emoji: clicking stamps a visible glyph', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Emoji');
	await clickCanvas(page, canvas, 120, 120);

	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 110, 90, 170, 130)).toBeGreaterThan(20);
});

test('hand: panning moves the drawn content', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await pickColor(page, RED.hex);
	await setSize(page, '12');
	await drawStroke(page, canvas, [[90, 100], [110, 100]]); // a blob near x=100
	await expect.poll(() => paintedPixels(canvas, 85, 90, 120, 112)).toBeGreaterThan(0);

	await selectTool(page, 'Pan'); // the hand/pan tool is labelled "Pan"
	await drawStroke(page, canvas, [[100, 100], [180, 100]]); // pan +~80px right

	// Original location is now clear; the blob moved right by ~80px.
	await expect.poll(() => paintedPixels(canvas, 85, 90, 120, 112)).toBe(0);
	await expect.poll(() => paintedPixels(canvas, 165, 90, 200, 112)).toBeGreaterThan(0);
});

test('laser: shows while pressed and leaves no shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await selectTool(page, 'Laser');
	const box = (await canvas.boundingBox())!;
	await page.mouse.move(box.x + 60, box.y + 100);
	await page.mouse.down();
	await page.mouse.move(box.x + 200, box.y + 100, { steps: 12 });
	// While still pressed, the red laser trail is on the canvas.
	await expect.poll(() => paintedPixels(canvas, 60, 92, 200, 108)).toBeGreaterThan(0);
	const px = await pixelAt(canvas, 190, 100);
	expect(px.r).toBeGreaterThan(180);
	expect(px.g).toBeLessThan(90);
	await page.mouse.up();
	// Laser is ephemeral — no shape is committed.
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
});

test('select + delete: removes the shape and clears its pixels', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await pickColor(page, RED.hex);
	await setSize(page, '12');
	await drawStroke(page, canvas, [[60, 100], [220, 100]]);
	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 60, 90, 220, 112)).toBeGreaterThan(0);

	await selectTool(page, 'Select');
	await clickCanvas(page, canvas, 140, 100); // click on the stroke to select it
	await page.keyboard.press('Delete');

	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
	await expect.poll(() => paintedPixels(canvas, 60, 90, 220, 112)).toBe(0); // pixels gone
});

test('undo / redo restore the shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await drawStroke(page, canvas, [[60, 100], [200, 100]]);
	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
	await page.locator('button[title="Undo"]').click();
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
	await page.locator('button[title="Redo"]').click();
	await expect(page.getByText(/^1 shape\b/)).toBeVisible();
});

test('clear all removes every shape', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await drawStroke(page, canvas, [[60, 80], [200, 80]]);
	await drawStroke(page, canvas, [[60, 140], [200, 140]]);
	await expect(page.getByText(/^2 shapes\b/)).toBeVisible();
	await page.locator('button[title="Clear"]').click();
	await page.getByRole('button', { name: 'Clear All' }).click();
	await expect(page.getByText(/^0 shapes\b/)).toBeVisible();
});

test('wheel zoom updates the viewport', async ({ page }) => {
	const canvas = await openWhiteboard(page);
	await expect(page.getByText('Zoom: 100%')).toBeVisible();
	const box = (await canvas.boundingBox())!;
	await page.mouse.move(box.x + 150, box.y + 150);
	await page.mouse.wheel(0, -120); // zoom in
	await expect(page.getByText(/Zoom: 1\d\d%/)).toBeVisible(); // > 100%
});
