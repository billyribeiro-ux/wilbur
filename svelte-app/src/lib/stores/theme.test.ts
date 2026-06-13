import { describe, it, expect, beforeEach } from 'vitest';
import { themeStore } from './theme.svelte';

beforeEach(() => {
	themeStore.reset();
});

describe('themeStore', () => {
	it('has sensible defaults', () => {
		expect(themeStore.config.mode).toBe('dark');
		expect(themeStore.config.fontFamily).toBe('Inter');
		expect(themeStore.fontFamily).toBe('Inter');
		expect(themeStore.config.fontSize).toBe('base');
	});

	it('persists the selected font family', () => {
		themeStore.setFontFamily('Roboto');
		expect(themeStore.config.fontFamily).toBe('Roboto');
		expect(themeStore.fontFamily).toBe('Roboto');
	});

	it('updates mode, primary color and font size', () => {
		themeStore.setMode('light');
		themeStore.setPrimaryColor('#ff0000');
		themeStore.setFontSize('lg');
		expect(themeStore.config.mode).toBe('light');
		expect(themeStore.config.primaryColor).toBe('#ff0000');
		expect(themeStore.primaryColor).toBe('#ff0000');
		expect(themeStore.config.fontSize).toBe('lg');
	});

	it('toggles compact mode and reduce motion', () => {
		expect(themeStore.config.compactMode).toBe(false);
		themeStore.toggleCompactMode();
		expect(themeStore.config.compactMode).toBe(true);
		themeStore.toggleReduceMotion();
		expect(themeStore.config.reduceMotion).toBe(true);
	});

	it('reset restores all defaults', () => {
		themeStore.setFontFamily('Poppins');
		themeStore.setMode('light');
		themeStore.reset();
		expect(themeStore.config.fontFamily).toBe('Inter');
		expect(themeStore.config.mode).toBe('dark');
	});
});
