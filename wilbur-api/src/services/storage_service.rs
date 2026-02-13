use aws_sdk_s3::primitives::ByteStream;
use uuid::Uuid;

use crate::config::AppConfig;

pub struct StorageService;

impl StorageService {
    /// Upload a file to S3/R2.
    pub async fn upload(
        s3: &aws_sdk_s3::Client,
        config: &AppConfig,
        bucket_prefix: &str,
        file_name: &str,
        content_type: &str,
        data: Vec<u8>,
    ) -> Result<String, String> {
        let key = format!("{}/{}/{}", bucket_prefix, Uuid::new_v4(), file_name);

        s3.put_object()
            .bucket(&config.s3_bucket)
            .key(&key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await
            .map_err(|e| format!("S3 upload error: {e}"))?;

        Ok(key)
    }

    /// Delete a file from S3/R2.
    pub async fn delete(
        s3: &aws_sdk_s3::Client,
        config: &AppConfig,
        key: &str,
    ) -> Result<(), String> {
        s3.delete_object()
            .bucket(&config.s3_bucket)
            .key(key)
            .send()
            .await
            .map_err(|e| format!("S3 delete error: {e}"))?;

        Ok(())
    }

    /// Generate a presigned URL for serving a file.
    pub async fn presign_get(
        s3: &aws_sdk_s3::Client,
        config: &AppConfig,
        key: &str,
        expires_in_secs: u64,
    ) -> Result<String, String> {
        let presigning_config = aws_sdk_s3::presigning::PresigningConfig::expires_in(
            std::time::Duration::from_secs(expires_in_secs),
        )
        .map_err(|e| format!("Presign config error: {e}"))?;

        let presigned = s3
            .get_object()
            .bucket(&config.s3_bucket)
            .key(key)
            .presigned(presigning_config)
            .await
            .map_err(|e| format!("Presign error: {e}"))?;

        Ok(presigned.uri().to_string())
    }
}
