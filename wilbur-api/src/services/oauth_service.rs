use serde::{Deserialize, Serialize};

use crate::config::AppConfig;

#[derive(Debug, Serialize)]
pub struct OAuthConfig {
    pub client_id: String,
    pub auth_url: String,
    pub scopes: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct SpotifyTokenResponse {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_in: i64,
    pub token_type: String,
}

#[derive(Debug, Deserialize)]
pub struct SpotifyProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
}

pub struct OAuthService;

impl OAuthService {
    pub fn spotify_config(config: &AppConfig) -> OAuthConfig {
        OAuthConfig {
            client_id: config.spotify_client_id.clone(),
            auth_url: "https://accounts.spotify.com/authorize".to_string(),
            scopes: vec![
                "user-read-playback-state".to_string(),
                "user-modify-playback-state".to_string(),
                "user-read-currently-playing".to_string(),
                "streaming".to_string(),
            ],
        }
    }

    /// Exchange a Spotify authorization code for tokens.
    pub async fn spotify_exchange(
        config: &AppConfig,
        code: &str,
        redirect_uri: &str,
    ) -> Result<SpotifyTokenResponse, String> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://accounts.spotify.com/api/token")
            .basic_auth(&config.spotify_client_id, Some(&config.spotify_client_secret))
            .form(&[
                ("grant_type", "authorization_code"),
                ("code", code),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await
            .map_err(|e| format!("Spotify exchange error: {e}"))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Spotify exchange failed: {text}"));
        }

        resp.json()
            .await
            .map_err(|e| format!("Spotify parse error: {e}"))
    }

    /// Refresh a Spotify access token.
    pub async fn spotify_refresh(
        config: &AppConfig,
        refresh_token: &str,
    ) -> Result<SpotifyTokenResponse, String> {
        let client = reqwest::Client::new();
        let resp = client
            .post("https://accounts.spotify.com/api/token")
            .basic_auth(&config.spotify_client_id, Some(&config.spotify_client_secret))
            .form(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", refresh_token),
            ])
            .send()
            .await
            .map_err(|e| format!("Spotify refresh error: {e}"))?;

        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(format!("Spotify refresh failed: {text}"));
        }

        resp.json()
            .await
            .map_err(|e| format!("Spotify parse error: {e}"))
    }

    /// Get the Spotify user profile.
    pub async fn spotify_profile(access_token: &str) -> Result<SpotifyProfile, String> {
        let client = reqwest::Client::new();
        let resp = client
            .get("https://api.spotify.com/v1/me")
            .bearer_auth(access_token)
            .send()
            .await
            .map_err(|e| format!("Spotify profile error: {e}"))?;

        resp.json()
            .await
            .map_err(|e| format!("Spotify profile parse error: {e}"))
    }
}
