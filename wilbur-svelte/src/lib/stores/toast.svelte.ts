/**
 * Toast Store - Svelte 5 Runes
 * Wilbur Trading Room - December 2025
 */

// ============================================================================
// TOAST TYPES
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: ToastType;
	message: string;
	title?: string;
	duration: number;
	dismissible: boolean;
}

// ============================================================================
// TOAST STATE - Svelte 5 Runes
// ============================================================================

class ToastStore {
	toasts = $state<Toast[]>([]);

	private generateId(): string {
		return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	add(options: {
		type?: ToastType;
		message: string;
		title?: string;
		duration?: number;
		dismissible?: boolean;
	}): string {
		const id = this.generateId();
		const toast: Toast = {
			id,
			type: options.type || 'info',
			message: options.message,
			title: options.title,
			duration: options.duration ?? 5000,
			dismissible: options.dismissible ?? true
		};

		this.toasts = [...this.toasts, toast];

		// Auto dismiss
		if (toast.duration > 0) {
			setTimeout(() => {
				this.dismiss(id);
			}, toast.duration);
		}

		return id;
	}

	dismiss(id: string): void {
		this.toasts = this.toasts.filter(t => t.id !== id);
	}

	dismissAll(): void {
		this.toasts = [];
	}

	// Convenience methods
	success(message: string, title?: string): string {
		return this.add({ type: 'success', message, title });
	}

	error(message: string, title?: string): string {
		return this.add({ type: 'error', message, title, duration: 8000 });
	}

	warning(message: string, title?: string): string {
		return this.add({ type: 'warning', message, title });
	}

	info(message: string, title?: string): string {
		return this.add({ type: 'info', message, title });
	}
}

// Export singleton instance
export const toastStore = new ToastStore();
