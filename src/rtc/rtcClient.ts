/**
 * Headless RTC adapter — noop until a backend-owned media path is integrated.
 */

export interface RtcClient {
  publishPrimaryVideoTrack(track: MediaStreamTrack): Promise<void>;
  stopPrimaryVideo(): Promise<void>;
  setMicrophoneEnabled(enabled: boolean): Promise<void>;
  replacePrimaryVideoTrack(track: MediaStreamTrack): Promise<void>;
}

class NoopClient implements RtcClient {
  async publishPrimaryVideoTrack(_: MediaStreamTrack): Promise<void> {
    return;
  }
  async stopPrimaryVideo(): Promise<void> {
    return;
  }
  async setMicrophoneEnabled(_enabled: boolean): Promise<void> {
    return;
  }
  async replacePrimaryVideoTrack(_: MediaStreamTrack): Promise<void> {
    return;
  }
}

class RtcClientHolder {
  private client: RtcClient = new NoopClient();
  set(client: RtcClient) {
    this.client = client;
  }
  get(): RtcClient {
    return this.client;
  }
}

export const rtcClient = new RtcClientHolder();
