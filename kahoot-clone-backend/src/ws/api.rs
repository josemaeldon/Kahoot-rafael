use std::collections::HashMap;

use axum::extract::ws::Message;
// `serde` is a library used for serializing and deserializing Rust types into
// from various data representations, namely JSON.
//
// Relevant: https://serde.rs/
use serde::{Deserialize, Serialize};

/// Messages sent by the client to "do" something.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
// `tag = "type"`:
// Add a "type" field to the serialization with the same value as the enum tag.
// eg. CreateRoom { ... } => { "type": "createRoom", ... }
//
// `rename_all = "camelCase"`:
// Renames the tags using camelCase when serializing, and converts camelCase
// back into PascalCase upon deserializing.
//
// Relevant: https://serde.rs/container-attrs.html
//           https://serde.rs/enum-representations.html
#[serde(tag = "type", rename_all = "camelCase")]
pub enum Action {
    // Initial message
    CreateRoom { questions: Vec<Question> },
    #[serde(rename_all = "camelCase")] // Renames fields as camelCase
    JoinRoom { room_id: RoomId, username: String },

    // Player only
    Answer { choice: usize },

    // Host only
    BeginRound,
    EndRound,
}

/// Messages sent by the server to the room host.
#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum HostEvent {
    /// Sent after the client sends a create room message.
    #[serde(rename_all = "camelCase")]
    RoomCreated {
        room_id: RoomId,
    },

    /// Sent whenever a user joins the room.
    UserJoined {
        username: String,
    },
    /// Sent whenever a user leaves the room.
    UserLeft {
        username: String,
    },
    /// Sent whenever a user answers a question.
    ///
    /// Duplicate answers are automatically handled by the server, so the host
    /// does not need to deal with it.
    UserAnswered {
        username: String,
    },

    /// Sent when a new round begins.
    RoundBegin {
        question: Question,
    },
    /// Sent when the round ends.
    ///
    /// Rounds will automatically end after the specified time duration or when
    /// all players have answered, so the client does not need to deal with it.
    #[serde(rename_all = "camelCase")]
    RoundEnd {
        /// The amount of points each player gains.
        ///
        /// If they aren't in the object, they got the question wrong or
        /// didn't answer.
        point_gains: HashMap<String, u32>,
    },
    /// Sent if there are no more questions.
    ///
    /// The websocket connection will close after this message is sent.
    GameEnd,
}

/// Messages sent by the server to a player.
#[derive(Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum UserEvent {
    /// Sent when the user successfully joins.
    Joined,
    /// Sent when the user couldn't join.
    JoinFailed { reason: String },

    /// Sent when a new round begins.
    ///
    /// The user is only sent information about how many choices there are.
    #[serde(rename_all = "camelCase")]
    RoundBegin { choices: Vec<String> },

    /// Sent when the round ends.
    ///
    /// The point gain field is a `number` if the player answered correctly,
    /// otherwise it is `null`.
    #[serde(rename_all = "camelCase")]
    RoundEnd { point_gain: Option<u32> },

    /// Sent when the game is over.
    GameEnd,
}

/// A type alias representing a room's id.
//
// Type aliases are useful for reducing duplication and for improving clarity.
//
// Relevant: https://doc.rust-lang.org/reference/items/type-aliases.html
pub type RoomId = u32;

/// A structure containing all relevant information of a question.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Question {
    pub question: String,
    /// All of the valid choices.
    pub choices: Vec<String>,
    /// The index of the correct answer.
    pub answer: usize,
    /// The maximum number of seconds for this question.
    pub time: u16,
}

// Trait implementation stuff. Doesn't matter too much.
impl TryFrom<Message> for Action {
    type Error = ();

    fn try_from(msg: Message) -> Result<Action, Self::Error> {
        let text = msg.to_text().map_err(|_| ())?;
        serde_json::from_str(text).map_err(|_| ())
    }
}
