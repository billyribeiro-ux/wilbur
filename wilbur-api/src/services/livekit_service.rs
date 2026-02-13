use crate::config::AppConfig;

pub struct LiveKitService;

impl LiveKitService {
    /// Generate a LiveKit access token for a participant.
    pub fn generate_token(
        config: &AppConfig,
        room_name: &str,
        participant_identity: &str,
        participant_name: &str,
        can_publish: bool,
        can_subscribe: bool,
    ) -> Result<String, String> {
        use livekit_api::access_token::{AccessToken, VideoGrants};

        let grants = VideoGrants {
            room_join: true,
            room: room_name.to_string(),
            can_publish,
            can_subscribe,
            can_publish_data: true,
            can_update_own_metadata: can_publish,
            ..Default::default()
        };

        let token = AccessToken::with_api_key(&config.livekit_api_key, &config.livekit_api_secret)
            .with_identity(participant_identity)
            .with_name(participant_name)
            .with_grants(grants)
            .to_jwt()
            .map_err(|e| format!("Failed to generate LiveKit token: {e}"))?;

        Ok(token)
    }
}
