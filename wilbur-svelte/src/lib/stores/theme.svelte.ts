/**
 * Theme Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

import { browser } from '$app/environment';

// ============================================================================
// THEME TYPES
// ============================================================================

export interface ThemeConfig {
	mode: 'dark' | 'light' | 'system';
	primaryColor: string;
	accentColor: string;
	fontSize: 'sm' | 'base' | 'lg';
	compactMode: boolean;
	reduceMotion: boolean;
}

const DEFAULT_THEME: ThemeConfig = {
	mode: 'dark',
	primaryColor: '#3b82f6',
	accentColor: '#8b5cf6',
	fontSize: 'base',
	compactMode: false,
	reduceMotion: false
};

// ============================================================================
// THEME STATE - Svelte 5 Runes
// ============================================================================

class ThemeStore {
	config = $state<ThemeConfig>(DEFAULT_THEME);

	constructor() {
		if (browser) {
			this.loadFromStorage();
			this.applyTheme();
		}
	}

	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem('wilbur-theme');
			if (stored) {
				this.config = { ...DEFAULT_THEME, ...JSON.parse(stored) };
			}
		} catch {
			// Use defaults
		}
	}

	private saveToStorage(): void {
		if (browser) {
			localStorage.setItem('wilbur-theme', JSON.stringify(this.config));
		}
	}

	private applyTheme(): void {
		if (!browser) return;

		const root = document.documentElement;

		// Apply mode
		if (this.config.mode === 'system') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			root.classList.toggle('dark', prefersDark);
		} else {
			root.classList.toggle('dark', this.config.mode === 'dark');
		}

		// Apply custom properties
		root.style.setProperty('--color-primary', this.config.primaryColor);
		root.style.setProperty('--color-accent', this.config.accentColor);

		// Apply font size
		const fontSizes = { sm: '14px', base: '16px', lg: '18px' };
		root.style.setProperty('--font-size-base', fontSizes[this.config.fontSize]);

		// Apply compact mode
		root.classList.toggle('compact', this.config.compactMode);

		// Apply reduce motion
		root.classList.toggle('reduce-motion', this.config.reduceMotion);
	}

	setMode(mode: ThemeConfig['mode']): void {
		this.config = { ...this.config, mode };
		this.saveToStorage();
		this.applyTheme();
	}

	setPrimaryColor(color: string): void {
		this.config = { ...this.config, primaryColor: color };
		this.saveToStorage();
		this.applyTheme();
	}

	setAccentColor(color: string): void {
		this.config = { ...this.config, accentColor: color };
		this.saveToStorage();
		this.applyTheme();
	}

	setFontSize(fontSize: ThemeConfig['fontSize']): void {
		this.config = { ...this.config, fontSize };
		this.saveToStorage();
		this.applyTheme();
	}

	toggleCompactMode(): void {
		this.config = { ...this.config, compactMode: !this.config.compactMode };
		this.saveToStorage();
		this.applyTheme();
	}

	toggleReduceMotion(): void {
		this.config = { ...this.config, reduceMotion: !this.config.reduceMotion };
		this.saveToStorage();
		this.applyTheme();
	}

	reset(): void {
		this.config = DEFAULT_THEME;
		this.saveToStorage();
		this.applyTheme();
	}
}

// Export singleton instance
export const themeStore = new ThemeStore();
