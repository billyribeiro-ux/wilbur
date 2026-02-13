/**
 * roomStore.ts — Unified Room + Tenant Store
 */

import { create } from 'zustand';

import { roomsApi } from '../api/rooms';
import { tenantsApi } from '../api/tenants';
import type {
  Room,
  ChatMessage,
  Alert,
  Poll,
  MediaTrack,
  RoomMembership,
  Tenant,
} from '../types/database.types';

const LAST_ROOM_KEY = 'trading_room_last_active';

export interface RoomMember {
  id: string;
  display_name: string;
  avatar_url: string | undefined;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
}

interface RoomState {
  currentRoom: (Room & { tenant?: Tenant }) | undefined;
  rooms: Room[];
  tenants: Tenant[];
  loading: boolean;
  error: string | undefined;

  messages: ChatMessage[];
  alerts: Alert[];
  polls: Poll[];
  tracks: MediaTrack[];
  members: RoomMember[];
  membership: RoomMembership | undefined;
  viewers: number;
  isRecording: boolean;
  recordingId: string | undefined;
  isMicEnabled: boolean;
  volume: number;
  isMuted: boolean;
  isRefreshing: boolean;
  isRoomReady: boolean;

  canRecord: () => boolean;
  canManageRoom: () => boolean;
  canDelete: () => boolean;

  fetchRooms: (userId: string) => Promise<void>;
  setCurrentRoom: (room: Room | undefined) => Promise<void>;
  clearRoom: () => void;
  createRoom: (name: string, tenantId: string, userId: string) => Promise<Room | undefined>;
  updateRoom: (roomId: string, data: Partial<Room>) => Promise<void>;
  loadTenantData: (tenantId: string) => Promise<Tenant | undefined>;

  setRoomReady: (ready: boolean) => void;
  getLastRoomId: () => string | undefined;
  clearLastRoomId: () => void;

  setMessages: (messages: ChatMessage[]) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  removeMessage: (id: string) => void;

  setAlerts: (alerts: Alert[]) => void;
  addAlert: (alert: Alert) => void;
  removeAlert: (id: string) => void;

  setPolls: (polls: Poll[]) => void;
  addPoll: (poll: Poll) => void;
  removePoll: (id: string) => void;

  setTracks: (tracks: MediaTrack[]) => void;
  addTrack: (track: MediaTrack) => void;
  updateTrack: (id: string, updates: Partial<MediaTrack>) => void;
  removeTrack: (id: string) => void;

  setMembers: (members: RoomMember[]) => void;
  addMember: (member: RoomMember) => void;
  removeMember: (userId: string) => void;
  updateMemberLocation: (userId: string, location: { city?: string; region?: string; country?: string; country_code?: string }) => void;

  setMembership: (membership: RoomMembership | undefined) => void;
  setViewers: (count: number) => void;
  setRecording: (isRecording: boolean, recordingId: string | undefined) => void;
  setMicEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
}

export const useRoomStore = create<RoomState>((set, get) => ({
  currentRoom: undefined,
  rooms: [],
  tenants: [],
  loading: false,
  error: undefined,
  messages: [],
  alerts: [],
  polls: [],
  tracks: [],
  members: [],
  membership: undefined,
  viewers: 0,
  isRecording: false,
  recordingId: undefined,
  isMicEnabled: false,
  volume: 100,
  isMuted: false,
  isRefreshing: false,
  isRoomReady: false,

  canRecord: () => {
    const role = get().membership?.role;
    return role === 'admin' || role === 'member';
  },
  canManageRoom: () => {
    return get().membership?.role === 'admin';
  },
  canDelete: () => {
    return get().membership?.role === 'admin';
  },

  fetchRooms: async (_userId: string) => {
    set({ loading: true, error: undefined });
    try {
      const data = await roomsApi.list();
      set({ rooms: data || [], loading: false });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[roomStore] Failed to fetch rooms:', errorMessage);
      set({ error: errorMessage, loading: false });
    }
  },

  setCurrentRoom: async (room: Room | undefined) => {
    if (!room) {
      set({
        currentRoom: undefined,
        messages: [],
        alerts: [],
        polls: [],
        tracks: [],
      });
      return;
    }

    try {
      set({
        messages: [],
        alerts: [],
        polls: [],
        tracks: [],
      });

      if (room.tenant_id) {
        const tenant = await get().loadTenantData(room.tenant_id);
        set({ currentRoom: { ...room, tenant } });
      } else {
        set({ currentRoom: room });
      }
      localStorage.setItem(LAST_ROOM_KEY, room.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[roomStore] Failed to set current room:', errorMessage);
      set({ error: errorMessage });
    }
  },

  clearRoom: () => {
    set({ currentRoom: undefined });
  },

  createRoom: async (name: string, tenantId: string, _userId: string) => {
    try {
      const data = await roomsApi.create({ name, title: name, tenant_id: tenantId });
      set((state) => ({ rooms: [data, ...state.rooms] }));
      return data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[roomStore] Failed to create room:', errorMessage);
      set({ error: errorMessage });
      return undefined;
    }
  },

  updateRoom: async (roomId: string, data: Partial<Room>) => {
    try {
      await roomsApi.update(roomId, data);
      set((state) => ({
        rooms: state.rooms.map((r) => (r.id === roomId ? { ...r, ...data } : r)),
      }));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[roomStore] Failed to update room:', errorMessage);
      set({ error: errorMessage });
    }
  },

  loadTenantData: async (tenantId: string) => {
    try {
      return await tenantsApi.get(tenantId);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[roomStore] Failed to load tenant:', errorMessage);
      return undefined;
    }
  },

  setRoomReady: (ready: boolean) => set({ isRoomReady: ready }),

  getLastRoomId: () => {
    try {
      const value = localStorage.getItem(LAST_ROOM_KEY);
      return value || undefined;
    } catch {
      return undefined;
    }
  },

  clearLastRoomId: () => {
    try {
      localStorage.removeItem(LAST_ROOM_KEY);
    } catch {
      // Silently fail if localStorage is not available
    }
  },

  setMessages: (messages: ChatMessage[]) => set({ messages }),
  addMessage: (message: ChatMessage) =>
    set((state) => {
      const exists = state.messages.some((m) => m.id === message.id);
      if (exists) return state;
      return { messages: [...state.messages, message] };
    }),
  updateMessage: (id: string, updates: Partial<ChatMessage>) =>
    set((state) => ({
      messages: state.messages.map((msg) => (msg.id === id ? { ...msg, ...updates } : msg)),
    })),
  removeMessage: (id: string) => set((state) => ({ messages: state.messages.filter((m) => m.id !== id) })),

  setAlerts: (alerts: Alert[]) => set({ alerts }),
  addAlert: (alert: Alert) =>
    set((state) => {
      const exists = state.alerts.some((a) => a.id === alert.id);
      if (exists) return state;
      return { alerts: [...state.alerts, alert] };
    }),
  removeAlert: (id: string) => set((state) => ({ alerts: state.alerts.filter((a) => a.id !== id) })),

  setPolls: (polls: Poll[]) => set({ polls }),
  addPoll: (poll: Poll) =>
    set((state) => {
      const exists = state.polls.some((p) => p.id === poll.id);
      if (exists) return state;
      return { polls: [...state.polls, poll] };
    }),
  removePoll: (id: string) => set((state) => ({ polls: state.polls.filter((p) => p.id !== id) })),

  setTracks: (tracks: MediaTrack[]) => set({ tracks }),
  addTrack: (track: MediaTrack) => set((state) => ({ tracks: [...state.tracks, track] })),
  updateTrack: (id: string, updates: Partial<MediaTrack>) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  removeTrack: (id: string) => set((state) => ({ tracks: state.tracks.filter((t) => t.id !== id) })),

  setMembers: (members: RoomMember[]) => set({ members }),
  addMember: (member: RoomMember) =>
    set((state) => {
      const exists = state.members.some((m) => m.id === member.id);
      if (exists) return state;
      return { members: [...state.members, member] };
    }),
  removeMember: (userId: string) =>
    set((state) => ({ members: state.members.filter((m) => m.id !== userId) })),
  updateMemberLocation: (userId: string, location: { city?: string; region?: string; country?: string; country_code?: string }) =>
    set((state) => ({
      members: state.members.map((m) =>
        m.id === userId ? { ...m, ...location } : m
      ),
    })),

  setMembership: (membership: RoomMembership | undefined) => {
    set({ membership });
  },
  setViewers: (count: number) => set({ viewers: count }),
  setRecording: (isRecording: boolean, recordingId: string | undefined) => set({ isRecording, recordingId }),
  setMicEnabled: (enabled: boolean) => set({ isMicEnabled: enabled }),
  setVolume: (volume: number) => set({ volume }),
  setMuted: (muted: boolean) => set({ isMuted: muted }),
  setRefreshing: (refreshing: boolean) => set({ isRefreshing: refreshing }),
}));
