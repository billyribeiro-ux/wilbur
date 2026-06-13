import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toastStore } from './toast.svelte';

beforeEach(() => {
	vi.useFakeTimers();
	toastStore.dismissAll();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('toastStore', () => {
	it('adds a toast and returns its id', () => {
		const id = toastStore.add({ message: 'hello', duration: 0 });
		expect(toastStore.toasts).toHaveLength(1);
		expect(toastStore.toasts[0].id).toBe(id);
		expect(toastStore.toasts[0].message).toBe('hello');
		expect(toastStore.toasts[0].type).toBe('info'); // default
	});

	it('auto-dismisses after the duration elapses', () => {
		toastStore.add({ message: 'temp', duration: 1000 });
		expect(toastStore.toasts).toHaveLength(1);
		vi.advanceTimersByTime(1000);
		expect(toastStore.toasts).toHaveLength(0);
	});

	it('does not auto-dismiss when duration is 0', () => {
		toastStore.add({ message: 'sticky', duration: 0 });
		vi.advanceTimersByTime(60_000);
		expect(toastStore.toasts).toHaveLength(1);
	});

	it('dismiss removes only the targeted toast', () => {
		const a = toastStore.add({ message: 'a', duration: 0 });
		toastStore.add({ message: 'b', duration: 0 });
		toastStore.dismiss(a);
		expect(toastStore.toasts).toHaveLength(1);
		expect(toastStore.toasts[0].message).toBe('b');
	});

	it('convenience methods set the right type and error gets a longer duration', () => {
		toastStore.success('ok');
		toastStore.error('boom');
		const [success, error] = toastStore.toasts;
		expect(success.type).toBe('success');
		expect(error.type).toBe('error');
		expect(error.duration).toBe(8000);
		expect(success.duration).toBe(5000);
	});

	it('dismissAll clears everything', () => {
		toastStore.add({ message: '1', duration: 0 });
		toastStore.add({ message: '2', duration: 0 });
		toastStore.dismissAll();
		expect(toastStore.toasts).toHaveLength(0);
	});
});
