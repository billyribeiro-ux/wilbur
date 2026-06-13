/**
 * LiveKit room client (Svelte 5 runes).
 *
 * Connects to a LiveKit room using a token minted by /api/livekit/token, publishes
 * the local screen-share / camera / mic, and tracks remote video tracks so the UI
 * can render other participants' screens and cameras.
 *
 * If the server reports LiveKit is not configured (no LIVEKIT_* env), `connect`
 * resolves with `configured: false` and callers fall back to a local-only preview.
 *
 * Runtime end-to-end behaviour requires a reachable LiveKit server; the API usage
 * here is type-checked against livekit-client and follows the documented client API.
 */

import {
	Room,
	RoomEvent,
	Track,
	type RemoteTrack,
	type RemoteTrackPublication,
	type RemoteParticipant
} from 'livekit-client';

export interface RemoteVideo {
	sid: string;
	participantId: string;
	name: string;
	isScreenShare: boolean;
	track: RemoteTrack;
}

export interface ConnectResult {
	connected: boolean;
	configured: boolean;
	error?: string;
}

class LiveKitRoom {
	connected = $state(false);
	/** null = unknown (not yet attempted), true/false once the server responds. */
	configured = $state<boolean | null>(null);
	isScreenSharing = $state(false);
	isCameraOn = $state(false);
	error = $state<string | null>(null);
	remoteVideos = $state<RemoteVideo[]>([]);

	#room: Room | null = null;

	async connect(roomName: string, participantName: string): Promise<ConnectResult> {
		this.error = null;
		if (this.connected && this.#room) return { connected: true, configured: true };

		let data: { configured?: boolean; token?: string; url?: string };
		try {
			const res = await fetch('/api/livekit/token', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ roomName, participantName })
			});
			data = await res.json();
		} catch {
			this.configured = false;
			this.error = 'Could not reach the LiveKit token endpoint';
			return { connected: false, configured: false, error: this.error };
		}

		if (!data.configured || !data.token || !data.url) {
			this.configured = false;
			return { connected: false, configured: false };
		}
		this.configured = true;

		const room = new Room({ adaptiveStream: true, dynacast: true });
		room
			.on(RoomEvent.TrackSubscribed, this.#onSubscribed)
			.on(RoomEvent.TrackUnsubscribed, this.#onUnsubscribed)
			.on(RoomEvent.Disconnected, this.#onDisconnected);

		try {
			await room.connect(data.url, data.token);
			this.#room = room;
			this.connected = true;
			return { connected: true, configured: true };
		} catch (e) {
			this.error = e instanceof Error ? e.message : 'Failed to connect to LiveKit';
			return { connected: false, configured: true, error: this.error };
		}
	}

	#onSubscribed = (track: RemoteTrack, _pub: RemoteTrackPublication, participant: RemoteParticipant) => {
		if (track.kind !== Track.Kind.Video || !track.sid) return;
		const entry: RemoteVideo = {
			sid: track.sid,
			participantId: participant.identity,
			name: participant.name || participant.identity,
			isScreenShare: track.source === Track.Source.ScreenShare,
			track
		};
		this.remoteVideos = [...this.remoteVideos.filter((v) => v.sid !== track.sid), entry];
	};

	#onUnsubscribed = (track: RemoteTrack) => {
		if (!track.sid) return;
		this.remoteVideos = this.remoteVideos.filter((v) => v.sid !== track.sid);
	};

	#onDisconnected = () => {
		this.connected = false;
		this.isScreenSharing = false;
		this.isCameraOn = false;
		this.remoteVideos = [];
	};

	async setScreenShare(enabled: boolean): Promise<void> {
		if (!this.#room) return;
		await this.#room.localParticipant.setScreenShareEnabled(enabled);
		this.isScreenSharing = enabled;
	}

	async setCamera(enabled: boolean): Promise<void> {
		if (!this.#room) return;
		await this.#room.localParticipant.setCameraEnabled(enabled);
		this.isCameraOn = enabled;
	}

	async setMicrophone(enabled: boolean): Promise<void> {
		if (!this.#room) return;
		await this.#room.localParticipant.setMicrophoneEnabled(enabled);
	}

	async disconnect(): Promise<void> {
		await this.#room?.disconnect();
		this.#room = null;
		this.connected = false;
		this.isScreenSharing = false;
		this.isCameraOn = false;
		this.remoteVideos = [];
	}
}

export const liveKitRoom = new LiveKitRoom();
