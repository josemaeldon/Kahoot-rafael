use async_trait::async_trait;
use axum::extract::ws::Message;
use futures::{Stream, StreamExt};
use serde::Serialize;

use crate::ws::api::Action;

pub trait ToMessageExt {
    fn to_message(&self) -> Message;
}

impl<T> ToMessageExt for T
where
    T: Serialize,
{
    fn to_message(&self) -> Message {
        let text = serde_json::to_string(self).unwrap();

        Message::Text(text)
    }
}

#[async_trait]
pub trait NextActionExt {
    async fn next_action(&mut self) -> Option<Action>;
}

#[async_trait]
impl<S, E> NextActionExt for S
where
    S: Stream<Item = Result<Message, E>> + Unpin + Send,
{
    async fn next_action(&mut self) -> Option<Action> {
        loop {
            let msg = self.next().await?.ok()?;

            if let Ok(text) = msg.to_text() {
                if let Ok(action) = serde_json::from_str(text) {
                    return Some(action);
                }
            }
        }
    }
}