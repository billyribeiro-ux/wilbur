import { describe, it, expect, beforeEach } from 'vitest';
import { whiteboardStore, shapeBounds, type WBShape } from './whiteboard.svelte';

function strokeShape(points: { x: number; y: number }[]): WBShape {
	const now = Date.now();
	return { id: crypto.randomUUID(), type: 'pen', x: 0, y: 0, points, createdAt: now, updatedAt: now };
}

beforeEach(() => {
	whiteboardStore.reset();
});

describe('shapeBounds', () => {
	it('computes bounds from points', () => {
		expect(shapeBounds(strokeShape([{ x: 10, y: 20 }, { x: 40, y: 5 }]))).toEqual({
			minX: 10, minY: 5, maxX: 40, maxY: 20
		});
	});

	it('computes bounds for text relative to its baseline', () => {
		const b = shapeBounds({
			id: 't', type: 'text', x: 100, y: 50, content: 'hello', fontSize: 20,
			createdAt: 0, updatedAt: 0
		});
		expect(b.minX).toBe(100);
		expect(b.minY).toBe(30); // y - fontSize
		expect(b.maxY).toBe(50);
		expect(b.maxX).toBeGreaterThan(100);
	});

	it('computes a square-ish box for emoji', () => {
		const b = shapeBounds({ id: 'e', type: 'emoji', x: 5, y: 80, emoji: '🔥', size: 40, createdAt: 0, updatedAt: 0 });
		expect(b).toEqual({ minX: 5, minY: 40, maxX: 45, maxY: 80 });
	});
});

describe('whiteboardStore shapes + history', () => {
	it('adds shapes and tracks count', () => {
		expect(whiteboardStore.shapeCount).toBe(0);
		whiteboardStore.addShape(strokeShape([{ x: 0, y: 0 }, { x: 1, y: 1 }]));
		expect(whiteboardStore.shapeCount).toBe(1);
	});

	it('undoes and redoes an add', () => {
		whiteboardStore.addShape(strokeShape([{ x: 0, y: 0 }, { x: 1, y: 1 }]));
		expect(whiteboardStore.canUndo).toBe(true);
		whiteboardStore.undo();
		expect(whiteboardStore.shapeCount).toBe(0);
		expect(whiteboardStore.canRedo).toBe(true);
		whiteboardStore.redo();
		expect(whiteboardStore.shapeCount).toBe(1);
	});
});

describe('text tool', () => {
	it('ignores blank content', () => {
		expect(whiteboardStore.addText(10, 10, '   ')).toBeNull();
		expect(whiteboardStore.shapeCount).toBe(0);
	});

	it('places a text shape with content', () => {
		const id = whiteboardStore.addText(10, 10, 'GM traders');
		expect(id).not.toBeNull();
		const shape = whiteboardStore.shapes.get(id!);
		expect(shape?.type).toBe('text');
		expect(shape?.content).toBe('GM traders');
	});
});

describe('emoji tool', () => {
	it('places the current emoji', () => {
		whiteboardStore.setEmoji('🚀');
		const id = whiteboardStore.addEmoji(20, 30);
		expect(whiteboardStore.shapes.get(id)?.emoji).toBe('🚀');
	});
});

describe('select tool: hit-test + move + delete', () => {
	it('hit-tests the topmost shape and misses empty space', () => {
		const a = strokeShape([{ x: 0, y: 0 }, { x: 50, y: 50 }]);
		const b = strokeShape([{ x: 10, y: 10 }, { x: 60, y: 60 }]);
		whiteboardStore.addShape(a);
		whiteboardStore.addShape(b);
		// (30,30) is inside both → topmost (b, added last) wins
		expect(whiteboardStore.hitTest(30, 30)).toBe(b.id);
		// far away → miss
		expect(whiteboardStore.hitTest(1000, 1000)).toBeNull();
	});

	it('moves a shape and its points by a delta', () => {
		const s = strokeShape([{ x: 0, y: 0 }, { x: 10, y: 10 }]);
		whiteboardStore.addShape(s);
		whiteboardStore.moveShape(s.id, 5, -3);
		const moved = whiteboardStore.shapes.get(s.id)!;
		expect(moved.x).toBe(5);
		expect(moved.y).toBe(-3);
		expect(moved.points).toEqual([{ x: 5, y: -3 }, { x: 15, y: 7 }]);
	});

	it('deletes all selected shapes in one history step', () => {
		const s1 = strokeShape([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
		const s2 = strokeShape([{ x: 2, y: 2 }, { x: 3, y: 3 }]);
		whiteboardStore.addShape(s1);
		whiteboardStore.addShape(s2);
		whiteboardStore.select(s1.id);
		whiteboardStore.select(s2.id);
		whiteboardStore.deleteSelected();
		expect(whiteboardStore.shapeCount).toBe(0);
		whiteboardStore.undo();
		expect(whiteboardStore.shapeCount).toBe(2);
	});
});
