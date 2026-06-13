import { describe, it, expect, beforeEach } from 'vitest';
import { presenceStore } from './presence.svelte';

beforeEach(() => {
	// Isolate each test: clears typingUsers, onlineUsers, currentRoomId.
	presenceStore.reset();
});

describe('presenceStore.typingText', () => {
	it('returns empty string when nobody is typing', () => {
		expect(presenceStore.typingText).toBe('');
	});

	it('returns "<name> is typing..." for a single typing user', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		expect(presenceStore.typingText).toBe('Alice is typing...');
	});

	it('returns "<a> and <b> are typing..." for two typing users', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		presenceStore.handleTypingEvent('u2', 'Bob', true);
		expect(presenceStore.typingText).toBe('Alice and Bob are typing...');
	});

	it('returns "<first> and N others are typing..." for three or more', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		presenceStore.handleTypingEvent('u2', 'Bob', true);
		presenceStore.handleTypingEvent('u3', 'Carol', true);
		// 3 users -> first name + (length - 1 = 2) others
		expect(presenceStore.typingText).toBe('Alice and 2 others are typing...');

		presenceStore.handleTypingEvent('u4', 'Dave', true);
		expect(presenceStore.typingText).toBe('Alice and 3 others are typing...');
	});
});

describe('presenceStore.handleTypingEvent', () => {
	it('adds a typing user to typingUsersList', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		const list = presenceStore.typingUsersList;
		expect(list).toHaveLength(1);
		expect(list[0].userId).toBe('u1');
		expect(list[0].displayName).toBe('Alice');
		expect(typeof list[0].startedAt).toBe('number');
	});

	it('removes a typing user when isTyping is false', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		presenceStore.handleTypingEvent('u2', 'Bob', true);
		expect(presenceStore.typingUsersList).toHaveLength(2);

		// Removal is keyed by userId; displayName is ignored on remove.
		presenceStore.handleTypingEvent('u1', '', false);
		const list = presenceStore.typingUsersList;
		expect(list).toHaveLength(1);
		expect(list[0].userId).toBe('u2');
		expect(presenceStore.typingText).toBe('Bob is typing...');
	});

	it('overwrites an existing entry when the same user fires another typing event', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		presenceStore.handleTypingEvent('u1', 'Alice Updated', true);
		const list = presenceStore.typingUsersList;
		expect(list).toHaveLength(1);
		expect(list[0].displayName).toBe('Alice Updated');
	});
});

describe('presenceStore.reset', () => {
	it('clears typingUsers and onlineUsers', () => {
		presenceStore.handleTypingEvent('u1', 'Alice', true);
		presenceStore.handlePresenceUpdate({
			userId: 'u1',
			displayName: 'Alice',
			status: 'online',
			lastSeen: new Date().toISOString()
		});
		expect(presenceStore.typingUsersList.length).toBeGreaterThan(0);
		expect(presenceStore.onlineUsersList.length).toBeGreaterThan(0);

		presenceStore.reset();

		expect(presenceStore.typingUsersList).toEqual([]);
		expect(presenceStore.onlineUsersList).toEqual([]);
		expect(presenceStore.typingText).toBe('');
		expect(presenceStore.currentRoomId).toBeNull();
	});
});
