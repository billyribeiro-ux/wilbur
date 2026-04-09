/**
 * Whiteboard Store - Svelte 5 Runes
 * Wilbur Trading Room - April 2026
 */

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

interface HistoryEntry { shapes: Map<string, WBShape>; timestamp: number; action: string; }

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
	shapes = $state<Map<string, WBShape>>(new Map());
	selectedIds = $state<Set<string>>(new Set());

	// Viewport
	viewport = $state<WBViewport>({ panX: 0, panY: 0, zoom: 1 });

	// History
	private history = $state<HistoryEntry[]>([{ shapes: new Map(), timestamp: Date.now(), action: 'init' }]);
	private historyIndex = $state(0);
	private maxHistory = 100;

	// Laser
	laserTrail = $state<Array<{ x: number; y: number; timestamp: number }>>([]);
	laserVisible = $state(false);
	laserColor = $state('#FF0000');

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

	// ============================================================================
	// SHAPE ACTIONS
	// ============================================================================

	addShape(shape: WBShape): void {
		this.shapes = new Map(this.shapes).set(shape.id, shape);
		this.pushHistory('add');
	}

	updateShape(id: string, updates: Partial<WBShape>): void {
		const shape = this.shapes.get(id);
		if (!shape) return;
		const updated = { ...shape, ...updates, updatedAt: Date.now() };
		this.shapes = new Map(this.shapes).set(id, updated);
	}

	deleteShape(id: string): void {
		const next = new Map(this.shapes);
		next.delete(id);
		this.shapes = next;
		const sel = new Set(this.selectedIds);
		sel.delete(id);
		this.selectedIds = sel;
		this.pushHistory('delete');
	}

	clearShapes(): void {
		this.shapes = new Map();
		this.selectedIds = new Set();
		this.pushHistory('clear');
	}

	// ============================================================================
	// SELECTION
	// ============================================================================

	select(id: string): void { this.selectedIds = new Set(this.selectedIds).add(id); }
	deselect(id: string): void { const s = new Set(this.selectedIds); s.delete(id); this.selectedIds = s; }
	clearSelection(): void { this.selectedIds = new Set(); }
	selectAll(): void { this.selectedIds = new Set(this.shapes.keys()); }

	// ============================================================================
	// HISTORY
	// ============================================================================

	pushHistory(action: string): void {
		const h = this.history.slice(0, this.historyIndex + 1);
		h.push({ shapes: new Map(this.shapes), timestamp: Date.now(), action });
		while (h.length > this.maxHistory) h.shift();
		this.history = h;
		this.historyIndex = h.length - 1;
	}

	undo(): void {
		if (!this.canUndo) return;
		this.historyIndex--;
		this.shapes = new Map(this.history[this.historyIndex].shapes);
	}

	redo(): void {
		if (!this.canRedo) return;
		this.historyIndex++;
		this.shapes = new Map(this.history[this.historyIndex].shapes);
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
		this.shapes = new Map(); this.selectedIds = new Set();
		this.history = [{ shapes: new Map(), timestamp: Date.now(), action: 'reset' }];
		this.historyIndex = 0; this.viewport = { panX: 0, panY: 0, zoom: 1 };
		this.laserTrail = []; this.laserVisible = false;
	}
}

export const whiteboardStore = new WhiteboardStore();
