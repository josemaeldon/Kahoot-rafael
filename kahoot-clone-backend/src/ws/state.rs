use super::api::RoomId;

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};

use tokio::sync::{mpsc, watch, oneshot};

// `Arc` is an "atomic reference counter" which allows multiple ownership
// of values across threads.
//
// Relevant: https://doc.rust-lang.org/book/ch15-00-smart-pointers.html
//           https://doc.rust-lang.org/std/sync/struct.Arc.html
pub type SharedState = Arc<State>;

/// Structure representing the state of our program
pub struct State {
    // A `Mutex` is used when you want to share mutability across threads.
    //
    // Relevant: https://doc.rust-lang.org/book/ch16-03-shared-state.html
    pub rooms: Mutex<HashMap<RoomId, Arc<Room>>>,
}

pub struct Room {
    pub users: Users,
    pub action_stream: mpsc::Sender<PlayerAnswer>,
    pub result_stream: watch::Receiver<GameEvent>,
}

pub struct Users {
    pub users: Arc<Mutex<UserMap>>,
    event_stream: mpsc::Sender<PlayerEvent>,
}

type UserMap = HashSet<String>;

pub struct UserPresence(String, Arc<Mutex<UserMap>>, Option<oneshot::Sender<()>>);

pub struct PlayerAnswer {
    pub username: String,
    pub choice: usize,
}

#[derive(Clone)]
pub enum GameEvent {
    InLobby,
    RoundBegin {
        choices: Vec<String>,
    },
    RoundEnd {
        point_gains: Arc<HashMap<String, u32>>,
    },
    GameEnd,
}

pub enum PlayerEvent {
    Joined(String),
    Left(String),
}

impl State {
    pub fn insert_room(&self, room: Arc<Room>) -> RoomId {
        let mut rooms = self.rooms.lock().unwrap();
        let id: RoomId = rand::random();

        rooms.insert(id, room);

        id
    }

    pub async fn remove_room(&self, room_id: &RoomId) {
        let mut rooms = self.rooms.lock().unwrap();
        if rooms.remove(&room_id).is_none() {
            tracing::debug!("Room `{room_id}` doesn't exist");
            return;
        }
    }

    pub fn find_room(&self, room_id: &RoomId) -> Option<Arc<Room>> {
        self.rooms.lock().unwrap().get(room_id).map(Arc::clone)
    }
}

impl Users {
    pub fn new() -> (Self, mpsc::Receiver<PlayerEvent>) {
        let (tx, rx) = mpsc::channel(30);

        let users = Arc::new(Mutex::new(HashSet::new()));

        let users = Self {
            users,
            event_stream: tx,
        };

        (users, rx)
    }

    pub fn player_count(&self) -> usize {
        self.users.lock().unwrap().len()
    }

    /// Tries to add a user to the user map.
    /// Returns a `Some(UserPresence)` on success and `None` on failure.
    pub async fn join_user(&self, name: String) -> Option<UserPresence> {
        {
            tracing::debug!("Accquiring users lock to add new user...");
            let mut users = self.users.lock().unwrap();
            tracing::debug!("Lock accquired.");

            if users.contains(&name) {
                return None;
            }

            tracing::debug!("Adding `{name}`...");
            let name = name.clone();
            users.insert(name);

            tracing::debug!("User added.");
        }

        // Emitting join event
        let _ = self
            .event_stream
            .send(PlayerEvent::Joined(name.clone()))
            .await;

        // Copy the necessary values
        let user_map = Arc::clone(&self.users);
        let event_stream = self.event_stream.clone();
        let username = name.clone();
        
        // Set up oneshot channel for leave message
        let (leave_tx, leave_rx) = oneshot::channel();
        tokio::spawn(async move {
            // Wait for oneshot leave message
            let _ = leave_rx.await;
            // Emit player event to host
            let _ = event_stream.send(PlayerEvent::Left(username)).await;
        });

        Some(UserPresence(name, user_map, Some(leave_tx)))
    }
}

impl Drop for UserPresence {
    /// Removes user from user map and emits a signal.
    fn drop(&mut self) {
        let UserPresence(name, user_map, leave_tx) = self;

        // Emit event and ignore any errors
        if let Some(tx) = leave_tx.take() {
            let _ = tx.send(());
        }

        // Remove from user map
        let mut user_map = user_map.lock().unwrap();
        user_map.remove(name);
    }
}
