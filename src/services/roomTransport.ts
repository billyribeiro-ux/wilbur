/**
 * Room media transport — WebRTC / SFU integration layer (stub).
 *
 * Third-party SFU (e.g. LiveKit) has been removed. A future backend-owned
 * signaling + media path can plug in here without touching UI call sites
 * that only need connect/disconnect and participant counts.
 */

export interface RoomTransportParticipantInfo {
  readonly identity: string;
  readonly name?: string;
  readonly metadata?: string;
}

export interface RoomTransportState {
  readonly isConnecting: boolean;
  readonly isConnected: boolean;
  readonly error: Error | undefined;
  readonly participants: readonly RoomTransportParticipantInfo[];
  readonly localParticipant: RoomTransportParticipantInfo | undefined;
}

class RoomTransportService {
  private lastError: Error | undefined;

  /** No SFU session — always disconnected. */
  isAvailable(): boolean {
    return false;
  }

  async connect(_token: string): Promise<void> {
    return;
  }

  disconnect(): void {
    this.lastError = undefined;
  }

  /** @returns Always `undefined` until a real transport is wired. */
  getRoom(): null {
    return null;
  }

  getConnectionState(): RoomTransportState {
    return {
      isConnecting: false,
      isConnected: false,
      error: this.lastError,
      participants: [],
      localParticipant: undefined,
    };
  }
}

export const roomTransportService = new RoomTransportService();
