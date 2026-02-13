use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::Type, PartialEq)]
#[sqlx(type_name = "poll_status", rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum PollStatus {
    Active,
    Closed,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct Poll {
    pub id: Uuid,
    pub room_id: Uuid,
    pub creator_id: Uuid,
    pub question: String,
    pub options: serde_json::Value,
    pub status: PollStatus,
    pub closes_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct PollVote {
    pub id: Uuid,
    pub poll_id: Uuid,
    pub user_id: Uuid,
    pub option_index: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct CreatePollRequest {
    #[validate(length(min = 1, max = 500))]
    pub question: String,
    #[validate(length(min = 2, max = 20))]
    pub options: Vec<String>,
    pub closes_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize, Validate)]
pub struct VoteRequest {
    #[validate(range(min = 0))]
    pub option_index: i32,
}

/// Poll response including vote counts.
#[derive(Debug, Serialize)]
pub struct PollResponse {
    pub id: Uuid,
    pub room_id: Uuid,
    pub creator_id: Uuid,
    pub question: String,
    pub options: serde_json::Value,
    pub status: PollStatus,
    pub closes_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub total_votes: i64,
}

impl From<Poll> for PollResponse {
    fn from(p: Poll) -> Self {
        Self {
            id: p.id,
            room_id: p.room_id,
            creator_id: p.creator_id,
            question: p.question,
            options: p.options,
            status: p.status,
            closes_at: p.closes_at,
            created_at: p.created_at,
            total_votes: 0,
        }
    }
}
