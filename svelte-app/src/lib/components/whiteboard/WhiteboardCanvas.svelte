<script lang="ts">
	import { whiteboardStore, shapeBounds, type WBPoint, type WBShape } from '$lib/stores';

	let canvas: HTMLCanvasElement | undefined = $state();
	let isDrawing = $state(false);
	let currentPoints: WBPoint[] = $state([]);

	// Select-tool drag state (world coords of last pointer position).
	let selectDrag: { lastX: number; lastY: number; moved: boolean } | null = null;
	// Inline text-entry overlay state (world position + screen position for the input).
	let textInput = $state<{ wx: number; wy: number; left: number; top: number; value: string } | null>(null);

	// Render-on-demand: this effect re-runs whenever any reactive state it reads
	// (viewport, shapes, selection, in-progress stroke, laser, resizeTick) changes —
	// no perpetual requestAnimationFrame loop.
	$effect(() => {
		if (!canvas) return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		draw(ctx);
	});

	// Redraw + re-fit whenever the canvas element's own size changes (window resize,
	// container/side-panel layout changes, etc.). ResizeObserver is the correct API
	// for observing element size and is more robust than a window 'resize' listener.
	function trackSize(node: HTMLCanvasElement) {
		const observer = new ResizeObserver(() => {
			const ctx = node.getContext('2d');
			if (ctx) draw(ctx);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}

	function getPoint(e: PointerEvent): WBPoint {
		const rect = canvas!.getBoundingClientRect();
		const { panX, panY, zoom } = whiteboardStore.viewport;
		return { x: (e.clientX - rect.left - panX) / zoom, y: (e.clientY - rect.top - panY) / zoom, pressure: e.pressure };
	}

	function cursorForTool(tool: string): string {
		if (tool === 'hand') return 'grab';
		if (tool === 'text') return 'text';
		if (tool === 'select') return 'default';
		return 'crosshair';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (textInput) return; // typing into the text overlay
		if ((e.key === 'Delete' || e.key === 'Backspace') && whiteboardStore.selectedIds.size > 0) {
			e.preventDefault();
			whiteboardStore.deleteSelected();
		} else if (e.key === 'Escape') {
			whiteboardStore.clearSelection();
		}
	}

	function handlePointerDown(e: PointerEvent) {
		if (!canvas) return;
		const tool = whiteboardStore.tool;
		const pt = getPoint(e);

		if (tool === 'hand') return;
		if (tool === 'laser') { canvas.setPointerCapture(e.pointerId); whiteboardStore.laserVisible = true; return; }

		if (tool === 'select') {
			const hit = whiteboardStore.hitTest(pt.x, pt.y);
			if (hit) {
				if (!e.shiftKey && !whiteboardStore.selectedIds.has(hit)) whiteboardStore.clearSelection();
				whiteboardStore.select(hit);
				selectDrag = { lastX: pt.x, lastY: pt.y, moved: false };
				canvas.setPointerCapture(e.pointerId);
			} else {
				whiteboardStore.clearSelection();
			}
			return;
		}

		if (tool === 'text') {
			const rect = canvas.getBoundingClientRect();
			textInput = { wx: pt.x, wy: pt.y, left: e.clientX - rect.left, top: e.clientY - rect.top, value: '' };
			return;
		}

		if (tool === 'emoji') {
			whiteboardStore.addEmoji(pt.x, pt.y);
			return;
		}

		// Freehand / shape drawing tools
		canvas.setPointerCapture(e.pointerId);
		isDrawing = true;
		currentPoints = [pt];
	}

	function handlePointerMove(e: PointerEvent) {
		if (!canvas) return;
		const tool = whiteboardStore.tool;

		if (tool === 'laser') { if (whiteboardStore.laserVisible) whiteboardStore.updateLaser(getPoint(e)); return; }
		if (tool === 'hand' && e.buttons === 1) {
			whiteboardStore.setPan(whiteboardStore.viewport.panX + e.movementX, whiteboardStore.viewport.panY + e.movementY);
			return;
		}
		if (tool === 'select' && selectDrag) {
			const pt = getPoint(e);
			const dx = pt.x - selectDrag.lastX, dy = pt.y - selectDrag.lastY;
			if (dx !== 0 || dy !== 0) {
				for (const id of whiteboardStore.selectedIds) whiteboardStore.moveShape(id, dx, dy);
				selectDrag = { lastX: pt.x, lastY: pt.y, moved: true };
			}
			return;
		}
		if (!isDrawing) return;
		// Reassign (not push) so the render effect's dependency on currentPoints fires.
		currentPoints = [...currentPoints, getPoint(e)];
	}

	function handlePointerUp() {
		const tool = whiteboardStore.tool;
		if (tool === 'laser') { whiteboardStore.laserVisible = false; whiteboardStore.clearLaser(); return; }
		if (tool === 'select') {
			if (selectDrag?.moved) whiteboardStore.pushHistory('move');
			selectDrag = null;
			return;
		}
		if (!isDrawing) return;

		const pts = currentPoints;
		const now = Date.now();
		const base = { id: crypto.randomUUID(), x: 0, y: 0, createdAt: now, updatedAt: now, color: whiteboardStore.color, size: whiteboardStore.size, opacity: whiteboardStore.opacity };

		if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
			if (pts.length >= 1) whiteboardStore.addShape({ ...base, type: tool, points: [...pts] });
		} else if ((tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') && pts.length >= 2) {
			const p0 = pts[0], pN = pts[pts.length - 1];
			whiteboardStore.addShape({ ...base, type: tool, points: [p0, pN], width: Math.abs(pN.x - p0.x), height: Math.abs(pN.y - p0.y), stroke: whiteboardStore.color, strokeWidth: whiteboardStore.size });
		}
		isDrawing = false;
		currentPoints = [];
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const { panX, panY, zoom } = whiteboardStore.viewport;
		const factor = e.deltaY > 0 ? 0.9 : 1.1;
		const newZoom = Math.max(0.1, Math.min(10, zoom * factor));
		// Keep the world point under the cursor fixed while zooming.
		const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
		const wx = (cx - panX) / zoom, wy = (cy - panY) / zoom;
		whiteboardStore.setZoom(newZoom);
		whiteboardStore.setPan(cx - wx * newZoom, cy - wy * newZoom);
	}

	function commitText() {
		if (!textInput) return;
		whiteboardStore.addText(textInput.wx, textInput.wy, textInput.value);
		textInput = null;
	}

	function handleTextKey(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); commitText(); }
		else if (e.key === 'Escape') { e.preventDefault(); textInput = null; }
	}

	/** Draw the whole scene. Self-fits the backing store to the element + DPR each call. */
	function draw(ctx: CanvasRenderingContext2D) {
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		const bw = Math.round(rect.width * dpr), bh = Math.round(rect.height * dpr);
		if (canvas.width !== bw || canvas.height !== bh) {
			canvas.width = bw;
			canvas.height = bh;
		}
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		const { panX, panY, zoom } = whiteboardStore.viewport;
		const w = rect.width, h = rect.height;
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		ctx.translate(panX, panY);
		ctx.scale(zoom, zoom);

		for (const shape of whiteboardStore.shapesArray) drawShape(ctx, shape);

		if (isDrawing && currentPoints.length > 0) {
			drawStroke(ctx, currentPoints, whiteboardStore.color, whiteboardStore.size, whiteboardStore.opacity, whiteboardStore.tool === 'highlighter');
		}

		// Selection outlines (world space)
		if (whiteboardStore.selectedIds.size > 0) {
			ctx.save();
			ctx.strokeStyle = '#3b82f6';
			ctx.lineWidth = 1 / zoom;
			ctx.setLineDash([6 / zoom, 4 / zoom]);
			for (const id of whiteboardStore.selectedIds) {
				const s = whiteboardStore.shapes.get(id);
				if (!s) continue;
				const b = shapeBounds(s);
				ctx.strokeRect(b.minX - 4, b.minY - 4, b.maxX - b.minX + 8, b.maxY - b.minY + 8);
			}
			ctx.restore();
		}

		ctx.restore();

		// Laser overlay (screen space)
		if (whiteboardStore.laserVisible && whiteboardStore.laserTrail.length > 1) {
			ctx.save();
			ctx.strokeStyle = whiteboardStore.laserColor;
			ctx.lineWidth = 3;
			ctx.globalAlpha = 0.8;
			ctx.lineCap = 'round';
			ctx.beginPath();
			const trail = whiteboardStore.laserTrail;
			ctx.moveTo(trail[0].x * zoom + panX, trail[0].y * zoom + panY);
			for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x * zoom + panX, trail[i].y * zoom + panY);
			ctx.stroke();
			ctx.restore();
		}
	}

	function drawShape(c: CanvasRenderingContext2D, s: WBShape) {
		if (s.type === 'pen' || s.type === 'highlighter' || s.type === 'eraser') {
			drawStroke(c, s.points ?? [], s.color ?? '#000', s.size ?? 3, s.opacity ?? 1, s.type === 'highlighter');
		} else if (s.type === 'rectangle') {
			c.strokeStyle = s.stroke ?? s.color ?? '#000';
			c.lineWidth = s.strokeWidth ?? s.size ?? 2;
			c.globalAlpha = s.opacity ?? 1;
			const p = s.points ?? [];
			if (p.length >= 2) c.strokeRect(Math.min(p[0].x, p[1].x), Math.min(p[0].y, p[1].y), Math.abs(p[1].x - p[0].x), Math.abs(p[1].y - p[0].y));
			c.globalAlpha = 1;
		} else if (s.type === 'circle') {
			c.strokeStyle = s.stroke ?? s.color ?? '#000';
			c.lineWidth = s.strokeWidth ?? s.size ?? 2;
			c.globalAlpha = s.opacity ?? 1;
			const p = s.points ?? [];
			if (p.length >= 2) { const cx = (p[0].x + p[1].x) / 2, cy = (p[0].y + p[1].y) / 2, rx = Math.abs(p[1].x - p[0].x) / 2, ry = Math.abs(p[1].y - p[0].y) / 2; c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); c.stroke(); }
			c.globalAlpha = 1;
		} else if (s.type === 'line' || s.type === 'arrow') {
			c.strokeStyle = s.stroke ?? s.color ?? '#000';
			c.lineWidth = s.strokeWidth ?? s.size ?? 2;
			c.globalAlpha = s.opacity ?? 1;
			const p = s.points ?? [];
			if (p.length >= 2) { c.beginPath(); c.moveTo(p[0].x, p[0].y); c.lineTo(p[1].x, p[1].y); c.stroke(); }
			if (s.type === 'arrow' && p.length >= 2) drawArrowHead(c, p[0], p[1], s.strokeWidth ?? s.size ?? 2);
			c.globalAlpha = 1;
		} else if (s.type === 'text') {
			c.globalAlpha = s.opacity ?? 1;
			c.font = `${s.fontSize ?? 16}px ${s.fontFamily ?? 'sans-serif'}`;
			c.fillStyle = s.color ?? '#000';
			c.textBaseline = 'alphabetic';
			c.fillText(s.content ?? '', s.x, s.y);
			c.globalAlpha = 1;
		} else if (s.type === 'emoji') {
			c.globalAlpha = s.opacity ?? 1;
			c.font = `${s.size ?? 32}px serif`;
			c.textBaseline = 'alphabetic';
			c.fillText(s.emoji ?? '', s.x, s.y);
			c.globalAlpha = 1;
		}
	}

	function drawStroke(c: CanvasRenderingContext2D, pts: WBPoint[], color: string, size: number, opacity: number, isHighlighter: boolean) {
		if (pts.length === 0) return;
		c.save();
		c.globalAlpha = isHighlighter ? 0.35 : opacity;
		c.globalCompositeOperation = isHighlighter ? 'multiply' : 'source-over';
		c.strokeStyle = color;
		c.fillStyle = color;
		const lw = isHighlighter ? size * 3 : size;
		c.lineWidth = lw;
		c.lineCap = 'round';
		c.lineJoin = 'round';
		if (pts.length === 1) {
			// Single tap → a dot.
			c.beginPath();
			c.arc(pts[0].x, pts[0].y, Math.max(0.5, lw / 2), 0, Math.PI * 2);
			c.fill();
		} else {
			c.beginPath();
			c.moveTo(pts[0].x, pts[0].y);
			for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
			c.stroke();
		}
		c.restore();
	}

	function drawArrowHead(c: CanvasRenderingContext2D, from: WBPoint, to: WBPoint, size: number) {
		const angle = Math.atan2(to.y - from.y, to.x - from.x);
		const headLen = Math.max(10, size * 3);
		c.beginPath();
		c.moveTo(to.x - headLen * Math.cos(angle - Math.PI / 6), to.y - headLen * Math.sin(angle - Math.PI / 6));
		c.lineTo(to.x, to.y);
		c.lineTo(to.x - headLen * Math.cos(angle + Math.PI / 6), to.y - headLen * Math.sin(angle + Math.PI / 6));
		c.stroke();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="wb-wrap">
	<canvas
		bind:this={canvas}
		{@attach trackSize}
		class="wb-canvas"
		style:cursor={cursorForTool(whiteboardStore.tool)}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onwheel={handleWheel}
	></canvas>

	{#if textInput}
		<input
			class="wb-text-input"
			style:left="{textInput.left}px"
			style:top="{textInput.top}px"
			style:color={whiteboardStore.color}
			bind:value={textInput.value}
			onkeydown={handleTextKey}
			onblur={commitText}
			{@attach (node) => node.focus()}
			placeholder="Type…"
		/>
	{/if}
</div>

<style>
	.wb-wrap { position: relative; width: 100%; height: 100%; }
	.wb-canvas { width: 100%; height: 100%; display: block; touch-action: none; background: white; border-radius: 8px; }
	.wb-text-input {
		position: absolute;
		transform: translateY(-1em);
		min-width: 80px;
		background: transparent;
		border: 1px dashed #3b82f6;
		outline: none;
		font-size: 1rem;
		padding: 0 2px;
	}
</style>
