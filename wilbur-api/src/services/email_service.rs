use lettre::message::header::ContentType;
use lettre::transport::smtp::authentication::Credentials;
use lettre::{AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor};

use crate::config::AppConfig;

pub struct EmailService {
    mailer: AsyncSmtpTransport<Tokio1Executor>,
    from: String,
}

impl EmailService {
    pub fn new(config: &AppConfig) -> Result<Self, String> {
        if config.smtp_host.is_empty() {
            return Err("SMTP not configured".to_string());
        }

        let creds = Credentials::new(
            config.smtp_username.clone(),
            config.smtp_password.clone(),
        );

        let mailer = AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&config.smtp_host)
            .map_err(|e| format!("SMTP error: {e}"))?
            .port(config.smtp_port)
            .credentials(creds)
            .build();

        Ok(Self {
            mailer,
            from: config.smtp_from.clone(),
        })
    }

    pub async fn send_verification_email(
        &self,
        to: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), String> {
        let verify_url = format!("{base_url}/api/v1/auth/verify-email?token={token}");
        let body = format!(
            "Welcome to Wilbur!\n\nPlease verify your email by clicking the link below:\n\n{verify_url}\n\nThis link expires in 24 hours."
        );

        let email = Message::builder()
            .from(self.from.parse().map_err(|e| format!("Invalid from: {e}"))?)
            .to(to.parse().map_err(|e| format!("Invalid to: {e}"))?)
            .subject("Verify your Wilbur account")
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| format!("Email build error: {e}"))?;

        self.mailer
            .send(email)
            .await
            .map_err(|e| format!("Email send error: {e}"))?;

        Ok(())
    }

    pub async fn send_password_reset_email(
        &self,
        to: &str,
        token: &str,
        base_url: &str,
    ) -> Result<(), String> {
        let reset_url = format!("{base_url}/reset-password?token={token}");
        let body = format!(
            "You requested a password reset for your Wilbur account.\n\nClick the link below to reset your password:\n\n{reset_url}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email."
        );

        let email = Message::builder()
            .from(self.from.parse().map_err(|e| format!("Invalid from: {e}"))?)
            .to(to.parse().map_err(|e| format!("Invalid to: {e}"))?)
            .subject("Reset your Wilbur password")
            .header(ContentType::TEXT_PLAIN)
            .body(body)
            .map_err(|e| format!("Email build error: {e}"))?;

        self.mailer
            .send(email)
            .await
            .map_err(|e| format!("Email send error: {e}"))?;

        Ok(())
    }
}
