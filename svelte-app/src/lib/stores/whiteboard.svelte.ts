/**
 * Whiteboard Store - Svelte 5 Runes
 * Wilbur Trading Room - April 2026
 */

import { SvelteMap, SvelteSet } from 'svelte/reactivity';

// ============================================================================
// TYPES
// ============================================================================

export type WhiteboardTool = 'select' | 'hand' | 'pen' | 'highlighter' | 'eraser'
	| 'text' | 'rectangle' | 'circle' | 'arrow' | 'line' | 'laser' | 'emoji';

export interface WBPoint { x: number; y: number; pressure?: number; }

export interface WBShape {
	id: string; type: string; x: number; y: number;
	points?: WBPoint[]; color?: string; size?: number; opacity?: number;
	content?: string; emoji?: string; width?: number; height?: number;
	fill?: string; stroke?: string; strokeWidth?: number;
	fontSize?: number; fontFamily?: string;
	createdAt: number; updatedAt: number;
}

export interface WBViewport { panX: number; panY: number; zoom: number; }

interface HistoryEntry { shapes: SvelteMap<string, WBShape>; timestamp: number; action: string; }

export interface WBBounds { minX: number; minY: number; maxX: number; maxY: number; }

/**
 * Axis-aligned bounding box of a shape in world coordinates. Pure function so it
 * can be unit-tested and reused for hit-testing and selection rendering.
 */
export function shapeBounds(s: WBShape): WBBounds {
	if (s.points && s.points.length > 0) {
		let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
		for (const p of s.points) {
			minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
			maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
		}
		return { minX, minY, maxX, maxY };
	}
	if (s.type === 'text') {
		const fs = s.fontSize ?? 16;
		const w = Math.max(1, (s.content?.length ?? 1)) * fs * 0.6;
		return { minX: s.x, minY: s.y - fs, maxX: s.x + w, maxY: s.y };
	}
	if (s.type === 'emoji') {
		const sz = s.size ?? 32;
		return { minX: s.x, minY: s.y - sz, maxX: s.x + sz, maxY: s.y };
	}
	return { minX: s.x, minY: s.y, maxX: s.x, maxY: s.y };
}

// ============================================================================
// STORE
// ============================================================================

class WhiteboardStore {
	// Tool state
	tool = $state<WhiteboardTool>('pen');
	color = $state('#000000');
	size = $state(3);
	opacity = $state(1);

	// Canvas state
	shapes = $state<SvelteMap<string, WBShape>>(new SvelteMap());
	selectedIds = $state<SvelteSet<string>>(new SvelteSet());

	// Viewport
	viewport = $state<WBViewport>({ panX: 0, panY: 0, zoom: 1 });

	// History
	private history = $state<HistoryEntry[]>([
		{ shapes: new SvelteMap(), timestamp: Date.now(), action: 'init' }
	]);
	private historyIndex = $state(0);
	private maxHistory = 100;

	// Laser
	laserTrail = $state<Array<{ x: number; y: number; timestamp: number }>>([]);
	laserVisible = $state(false);
	laserColor = $state('#FF0000');

	// Emoji currently selected for the emoji tool
	currentEmoji = $state('⭐');

	// Derived
	get shapeCount(): number { return this.shapes.size; }
	get canUndo(): boolean { return this.historyIndex > 0; }
	get canRedo(): boolean { return this.historyIndex < this.history.length - 1; }
	get shapesArray(): WBShape[] { return Array.from(this.shapes.values()); }

	// ============================================================================
	// TOOL ACTIONS
	// ============================================================================

	setTool(t: WhiteboardTool): void {
		this.tool = t;
		if (t !== 'laser') { this.laserTrail = []; this.laserVisible = false; }
	}

	setColor(c: string): void { this.color = c; }
	setSize(s: number): void { this.size = Math.max(1, Math.min(100, s)); }
	setOpacity(o: number): void { this.opacity = Math.max(0, Math.min(1, o)); }
	setEmoji(e: string): void { this.currentEmoji = e; }

	// ============================================================================
	// SHAPE ACTIONS
	// ============================================================================

	addShape(shape: WBShape): void {
		this.shapes.set(shape.id, shape);
		this.pushHistory('add');
	}

	updateShape(id: string, updates: Partial<WBShape>): void {
		const shape = this.shapes.get(id);
		if (!shape) return;
		const updated = { ...shape, ...updates, updatedAt: Date.now() };
		this.shapes.set(id, updated);
	}

	deleteShape(id: string): void {
		this.shapes.delete(id);
		this.selectedIds.delete(id);
		this.pushHistory('delete');
	}

	clearShapes(): void {
		this.shapes.clear();
		this.selectedIds.clear();
		this.pushHistory('clear');
	}

	/** Place a text shape at world (x, y). No-op for blank content. Returns the id (or null). */
	addText(x: number, y: number, content: string): string | null {
		if (!content.trim()) return null;
		const now = Date.now();
		const id = crypto.randomUUID();
		this.addShape({
			id, type: 'text', x, y, content,
			color: this.color, opacity: this.opacity,
			fontSize: Math.max(12, this.size * 6), fontFamily: 'sans-serif',
			createdAt: now, updatedAt: now
		});
		return id;
	}

	/** Place an emoji shape at world (x, y). Returns the id. */
	addEmoji(x: number, y: number, emoji = this.currentEmoji): string {
		const now = Date.now();
		const id = crypto.randomUUID();
		this.addShape({
			id, type: 'emoji', x, y, emoji,
			size: Math.max(24, this.size * 8),
			createdAt: now, updatedAt: now
		});
		return id;
	}

	/** Translate a shape (and its points) by (dx, dy) without pushing history. */
	moveShape(id: string, dx: number, dy: number): void {
		const s = this.shapes.get(id);
		if (!s) return;
		const moved: WBShape = { ...s, x: s.x + dx, y: s.y + dy, updatedAt: Date.now() };
		if (s.points) moved.points = s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy }));
		this.shapes.set(id, moved);
	}

	/** Delete every selected shape in a single history step. */
	deleteSelected(): void {
		if (this.selectedIds.size === 0) return;
		for (const id of this.selectedIds) this.shapes.delete(id);
		this.selectedIds.clear();
		this.pushHistory('delete-selected');
	}

	/** Topmost shape id whose padded bounds contain world (x, y), or null. */
	hitTest(x: number, y: number, pad = 6): string | null {
		const arr = this.shapesArray;
		for (let i = arr.length - 1; i >= 0; i--) {
			const b = shapeBounds(arr[i]);
			if (x >= b.minX - pad && x <= b.maxX + pad && y >= b.minY - pad && y <= b.maxY + pad) {
				return arr[i].id;
			}
		}
		return null;
	}

	// ============================================================================
	// SELECTION
	// ============================================================================

	select(id: string): void { this.selectedIds.add(id); }
	deselect(id: string): void { this.selectedIds.delete(id); }
	clearSelection(): void { this.selectedIds.clear(); }
	selectAll(): void {
		this.selectedIds.clear();
		for (const id of this.shapes.keys()) this.selectedIds.add(id);
	}

	// ============================================================================
	// HISTORY
	// ============================================================================

	pushHistory(action: string): void {
		const h = this.history.slice(0, this.historyIndex + 1);
		h.push({ shapes: new SvelteMap(this.shapes), timestamp: Date.now(), action });
		while (h.length > this.maxHistory) h.shift();
		this.history = h;
		this.historyIndex = h.length - 1;
	}

	undo(): void {
		if (!this.canUndo) return;
		this.historyIndex--;
		this.shapes = new SvelteMap(this.history[this.historyIndex].shapes);
	}

	redo(): void {
		if (!this.canRedo) return;
		this.historyIndex++;
		this.shapes = new SvelteMap(this.history[this.historyIndex].shapes);
	}

	// ============================================================================
	// VIEWPORT
	// ============================================================================

	setPan(x: number, y: number): void { this.viewport = { ...this.viewport, panX: x, panY: y }; }
	setZoom(z: number): void { this.viewport = { ...this.viewport, zoom: Math.max(0.1, Math.min(10, z)) }; }
	resetViewport(): void { this.viewport = { panX: 0, panY: 0, zoom: 1 }; }

	// Laser
	updateLaser(pt: { x: number; y: number }): void {
		const now = Date.now();
		this.laserTrail = [...this.laserTrail.filter(p => now - p.timestamp < 500), { ...pt, timestamp: now }];
	}
	clearLaser(): void { this.laserTrail = []; }

	// Reset
	reset(): void {
		this.tool = 'pen'; this.color = '#000000'; this.size = 3; this.opacity = 1;
		this.shapes.clear();
		this.selectedIds.clear();
		this.history = [{ shapes: new SvelteMap(), timestamp: Date.now(), action: 'reset' }];
		this.historyIndex = 0; this.viewport = { panX: 0, panY: 0, zoom: 1 };
		this.laserTrail = []; this.laserVisible = false;
	}
}

export const whiteboardStore = new WhiteboardStore();
