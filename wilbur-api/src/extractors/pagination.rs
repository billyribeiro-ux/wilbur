use axum::extract::Query;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
}

impl PaginationParams {
    pub fn offset(&self) -> i64 {
        let page = self.page.unwrap_or(1).max(1);
        let per_page = self.per_page();
        ((page - 1) * per_page) as i64
    }

    pub fn per_page(&self) -> u32 {
        self.per_page.unwrap_or(50).min(100)
    }

    pub fn limit(&self) -> i64 {
        self.per_page() as i64
    }
}

pub type Pagination = Query<PaginationParams>;
