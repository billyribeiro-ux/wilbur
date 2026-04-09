<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { whiteboardStore, type WBPoint, type WBShape } from '$lib/stores';

	let canvas: HTMLCanvasElement | undefined = $state();
	let ctx: CanvasRenderingContext2D | null = $state(null);
	let isDrawing = $state(false);
	let currentPoints: WBPoint[] = $state([]);
	let animId = 0;

	onMount(() => {
		if (!canvas) return;
		ctx = canvas.getContext('2d');
		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);
		render();
	});

	onDestroy(() => {
		window.removeEventListener('resize', resizeCanvas);
		cancelAnimationFrame(animId);
	});

	function resizeCanvas() {
		if (!canvas) return;
		const dpr = window.devicePixelRatio || 1;
		const rect = canvas.getBoundingClientRect();
		canvas.width = rect.width * dpr;
		canvas.height = rect.height * dpr;
		ctx?.scale(dpr, dpr);
	}

	function getPoint(e: PointerEvent): WBPoint {
		const rect = canvas!.getBoundingClientRect();
		const { panX, panY, zoom } = whiteboardStore.viewport;
		return { x: (e.clientX - rect.left - panX) / zoom, y: (e.clientY - rect.top - panY) / zoom, pressure: e.pressure };
	}

	function handlePointerDown(e: PointerEvent) {
		if (!canvas) return;
		canvas.setPointerCapture(e.pointerId);
		const tool = whiteboardStore.tool;
		if (tool === 'hand') return;
		if (tool === 'laser') { whiteboardStore.laserVisible = true; return; }
		isDrawing = true;
		currentPoints = [getPoint(e)];
	}

	function handlePointerMove(e: PointerEvent) {
		if (!canvas) return;
		const tool = whiteboardStore.tool;
		if (tool === 'laser') { whiteboardStore.updateLaser(getPoint(e)); return; }
		if (tool === 'hand' && e.buttons === 1) {
			whiteboardStore.setPan(whiteboardStore.viewport.panX + e.movementX, whiteboardStore.viewport.panY + e.movementY);
			return;
		}
		if (!isDrawing) return;
		currentPoints = [...currentPoints, getPoint(e)];
	}

	function handlePointerUp(e: PointerEvent) {
		if (whiteboardStore.tool === 'laser') { whiteboardStore.laserVisible = false; whiteboardStore.clearLaser(); return; }
		if (!isDrawing || currentPoints.length < 2) { isDrawing = false; return; }
		const tool = whiteboardStore.tool;
		const id = crypto.randomUUID();
		const now = Date.now();
		const base = { id, x: 0, y: 0, createdAt: now, updatedAt: now, color: whiteboardStore.color, size: whiteboardStore.size, opacity: whiteboardStore.opacity };

		if (tool === 'pen' || tool === 'highlighter' || tool === 'eraser') {
			whiteboardStore.addShape({ ...base, type: tool, points: currentPoints });
		} else if (tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'arrow') {
			const p0 = currentPoints[0], pN = currentPoints[currentPoints.length - 1];
			whiteboardStore.addShape({ ...base, type: tool, points: [p0, pN], width: Math.abs(pN.x - p0.x), height: Math.abs(pN.y - p0.y), stroke: whiteboardStore.color, strokeWidth: whiteboardStore.size });
		}
		isDrawing = false;
		currentPoints = [];
	}

	function handleWheel(e: WheelEvent) {
		e.preventDefault();
		const delta = e.deltaY > 0 ? 0.9 : 1.1;
		whiteboardStore.setZoom(whiteboardStore.viewport.zoom * delta);
	}

	function render() {
		if (!ctx || !canvas) { animId = requestAnimationFrame(render); return; }
		const { panX, panY, zoom } = whiteboardStore.viewport;
		const w = canvas.clientWidth, h = canvas.clientHeight;
		ctx.clearRect(0, 0, w, h);
		ctx.save();
		ctx.translate(panX, panY);
		ctx.scale(zoom, zoom);

		// Draw committed shapes
		for (const shape of whiteboardStore.shapesArray) drawShape(ctx!, shape);

		// Draw current stroke in progress
		if (isDrawing && currentPoints.length > 1) {
			drawStroke(ctx!, currentPoints, whiteboardStore.color, whiteboardStore.size, whiteboardStore.opacity, whiteboardStore.tool === 'highlighter');
		}

		ctx.restore();

		// Draw laser overlay (in screen space)
		if (whiteboardStore.laserVisible && whiteboardStore.laserTrail.length > 1) {
			ctx.save();
			ctx.strokeStyle = whiteboardStore.laserColor;
			ctx.lineWidth = 3;
			ctx.globalAlpha = 0.8;
			ctx.beginPath();
			const trail = whiteboardStore.laserTrail;
			ctx.moveTo(trail[0].x * zoom + panX, trail[0].y * zoom + panY);
			for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x * zoom + panX, trail[i].y * zoom + panY);
			ctx.stroke();
			ctx.restore();
		}

		animId = requestAnimationFrame(render);
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
			c.fillText(s.content ?? '', s.x, s.y);
			c.globalAlpha = 1;
		} else if (s.type === 'emoji') {
			c.font = `${s.size ?? 32}px serif`;
			c.fillText(s.emoji ?? '', s.x, s.y);
		}
	}

	function drawStroke(c: CanvasRenderingContext2D, pts: WBPoint[], color: string, size: number, opacity: number, isHighlighter: boolean) {
		if (pts.length < 2) return;
		c.save();
		c.globalAlpha = isHighlighter ? 0.35 : opacity;
		c.globalCompositeOperation = isHighlighter ? 'multiply' : 'source-over';
		c.strokeStyle = color;
		c.lineWidth = isHighlighter ? size * 3 : size;
		c.lineCap = 'round';
		c.lineJoin = 'round';
		c.beginPath();
		c.moveTo(pts[0].x, pts[0].y);
		for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
		c.stroke();
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
<canvas
	bind:this={canvas}
	class="wb-canvas"
	onpointerdown={handlePointerDown}
	onpointermove={handlePointerMove}
	onpointerup={handlePointerUp}
	onwheel={handleWheel}
></canvas>

<style>
	.wb-canvas { width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair; background: white; border-radius: 8px; }
</style>
