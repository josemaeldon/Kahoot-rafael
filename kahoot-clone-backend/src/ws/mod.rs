/// Contains the schema of the websocket api.
///
/// All messages, both server -> client and client -> server, are in the form:
/// ```json
/// {
///     "type": "<message_type>",
///     "<field>": "<value>",
///     ...
/// }
/// ```
pub mod api;

/// Contains data for representing game states.
pub mod state;

use api::{Action, HostEvent, Question, RoomId, UserEvent};

use state::{GameEvent, PlayerAnswer, Room, SharedState, Users};

use crate::ext::{ToMessageExt, NextActionExt};

use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::extract::ws::{WebSocket, Message};
use axum::extract::WebSocketUpgrade;
use axum::response::Response;
use axum::routing::get;
use axum::{Extension, Router};

use tokio::sync::{mpsc, watch};

use futures::{SinkExt, StreamExt};

use self::state::State;

/// Websocket api router.
pub fn router() -> Router {
    let rooms = Mutex::new(HashMap::new());
    let state = Arc::new(State { rooms });

    Router::new()
        // GET /
        .route("/", get(handle_ws_connection))
        // Includes the shared state in routes
        .layer(Extension(state))
}

/// Passes an upgraded websocket to `handle_socket`.
//
// Here, `WebSocketUpgrade` and `Extension` are "extractors" from the `axum`
// framework, and they allow `axum` to automatically detect how to parse web
// requests based on the type parameters of the function.
async fn handle_ws_connection(
    // Since this function has a `WebSocketUpgrade` paremeter, `axum` knows it
    // should accept websocket connections on this route.
    ws: WebSocketUpgrade,
    // This is an example of "destructuring"
    //
    // You can do something similar with tuples like
    // `let (a, b) = (1, 2);` which sets a = 1, and b = 2
    //
    // Relevant: https://doc.rust-lang.org/rust-by-example/flow_control/match/destructuring.html
    Extension(state): Extension<SharedState>,
) -> Response {
    ws.on_upgrade(|socket| handle_ws(socket, state))
}

/// Deals with an upgraded websocket.
async fn handle_ws(mut socket: WebSocket, state: SharedState) {
    let action = if let Some(action) = socket.next_action().await {
        action
    } else {
        tracing::error!("Couldn't parse initial action");
        return;
    };

    match action {
        Action::CreateRoom { questions } => create_room(socket, state, questions).await,
        Action::JoinRoom { room_id, username } => join_room(socket, state, room_id, username).await,
        action => tracing::error!("Invalid first action {action:?}"),
    };
}

/// Handles room creation.
///
/// The websocket will be treated as the "host" from now on.
async fn create_room(mut host: WebSocket, state: SharedState, questions: Vec<Question>) {
    tracing::debug!("Creating room...");

    let (action_tx, mut action_rx) = mpsc::channel(20);
    let (result_tx, result_rx) = watch::channel(GameEvent::InLobby);
    let (users, mut player_event_rx) = Users::new();

    // Create an empty room
    let room = Room {
        users,
        result_stream: result_rx,
        action_stream: action_tx,
    };

    // Put the room into an `Arc`
    let room = Arc::new(room);

    let room_id = state.insert_room(Arc::clone(&room));

    // Room creation event
    tracing::debug!("Sending room id: `{room_id}`");
    {
        let event = HostEvent::RoomCreated { room_id };
        let _ = host.send(event.to_message()).await;
    }

    let (mut host_tx, mut host_rx) = host.split();

    // Wrap the host transmitter with an `mpsc`
    let host_tx = {
        let (host_tx_mpsc, mut rx) = mpsc::channel::<Message>(30);

        tokio::spawn(async move {
            while let Some(msg) = rx.recv().await {
                // If socket is closed
                if host_tx.send(msg).await.is_err() {
                    return;
                }
            }

            // Close connection
            let _ = host_tx.close().await;
        });

        host_tx_mpsc
    };

    // Forward player leave/join to host
    {
        let host_tx = host_tx.clone();
        tokio::spawn(async move {
            while let Some(event) = player_event_rx.recv().await {
                let event = match event {
                    state::PlayerEvent::Joined(username) => HostEvent::UserJoined { username },
                    state::PlayerEvent::Left(username) => HostEvent::UserLeft { username },
                };

                // Stop if receiver is closed
                if host_tx.send(event.to_message()).await.is_err() {
                    break;
                }
            }
        });
    }

    // Ping the host every 25 seconds to keep the socket alive
    let heartbeat = {
        let host_tx = host_tx.clone();
        tokio::spawn(async move {
            while host_tx.send(Message::Ping(vec![])).await.is_ok() {
                tracing::debug!("Pinging host");
                tokio::time::sleep(Duration::from_secs(25)).await;
            }
        })
    };

    // Wait until host begins room and there is at least one player in lobby
    loop {
        match host_rx.next_action().await {
            // If action is begin round and there is at least one player
            Some(Action::BeginRound) if room.users.player_count() > 0 => break,
            // If received action but does not match above, ignore
            Some(_) => (),

            // If host dc's, close room
            None => {
                tracing::debug!("Closing room...");
                state.remove_room(&room_id).await;
                return;
            }
        }
    }

    tracing::debug!("Starting game...");

    for question in questions.into_iter() {
        let mut point_gains = HashMap::new();
        let mut answered = HashSet::new();
        let mut points = 1000;

        // Save values
        let question_time = question.time as u64;
        let choices = question.choices.clone();
        let answer = question.answer;

        // Alert host that the round began
        tracing::debug!("Alerting host that round began...");
        let _ = host_tx.send(HostEvent::RoundBegin { question }.to_message()).await;

        // Alert players a round began
        tracing::debug!("Alerting players that round began...");
        let _ = result_tx.send(GameEvent::RoundBegin { choices });

        // Keep taking from stream until it is empty
        while let Ok(_) = action_rx.try_recv() { }

        // Wait for round end event
        let time_task = tokio::time::sleep(Duration::from_secs(question_time));
        tokio::pin!(time_task);
        loop {
            // Pick whichever future resolves first
            tokio::select! {
                // Host force end
                act = host_rx.next_action() => {
                    match act {
                        // If the host sent an end round action, exit loop
                        Some(Action::EndRound) => {
                            tracing::debug!("Host forcefully ended round");
                            break;
                        }
                        // Ignore all other actions
                        Some(_) => (),

                        // If the action is none, the socket must have dc'd
                        None => {
                            tracing::debug!("Host disconnected...");
                            state.remove_room(&room_id).await;
                            return;
                        }
                    }
                }

                // Timeout
                _ = (&mut time_task) => {
                    tracing::debug!("Question timeout");
                    break;
                }

                // User answers
                Some(PlayerAnswer { username, choice }) = action_rx.recv() => {
                    if answered.contains(&username) {
                        continue;
                    }

                    answered.insert(username.clone());

                    // Tell host user answered
                    let _ = host_tx.send(HostEvent::UserAnswered {
                            username: username.clone()
                        }.to_message())
                        .await;

                    tracing::debug!("`{username}` answered {choice}");

                    // If the choice is correct
                    if choice == answer {
                        // Update points log
                        tracing::debug!("`{username}` +{points}");
                        point_gains.insert(username, points);

                        // Decrease next point gain
                        points = (points * 10 / 11).max(1);
                    }

                    // Has every player answered
                    let all_answered = room
                        .users
                        .users
                        .lock()
                        .unwrap()
                        .iter()
                        .all(|name| answered.contains(name));

                    // If everyone has answered, leave loop
                    if all_answered {
                        break;
                    }
                }
            };
        }
        drop(time_task);

        tracing::debug!("End of round...");

        // Tell host that the round ended
        tracing::debug!("Alerting host that round ended...");
        let _ = host_tx
            .send(HostEvent::RoundEnd {
                point_gains: point_gains.clone(),
            }.to_message())
            .await;

        // Alert players round ended
        tracing::debug!("Alerting players that round ended...");
        let _ = result_tx.send(GameEvent::RoundEnd {
            point_gains: Arc::new(point_gains),
        });

        // Wait until host begins next round
        loop {
            match host_rx.next_action().await {
                // If action is begin round, break loop
                Some(Action::BeginRound) => break,
                
                // If host sends irrelevant message, ignore
                Some(_) => (),

                // If host dc's, close room
                None => {
                    tracing::debug!("Closing room...");
                    state.remove_room(&room_id).await;
                    return;
                }
            }
        }
    }

    tracing::debug!("Game is over!");

    // Alert host that the game ended
    tracing::debug!("Alerting host that game has ended...");
    let _ = host_tx.send(HostEvent::GameEnd.to_message()).await;

    // Stop sending heartbeat to host
    heartbeat.abort();

    // Alert players game ended
    let _ = result_tx.send(GameEvent::GameEnd);

    state.remove_room(&room_id).await;
}

/// Handles room joining.
///
/// The websocket will be treated as a "player" from now on.
async fn join_room(mut socket: WebSocket, state: SharedState, room_id: RoomId, username: String) {
    tracing::debug!("Finding room `{room_id}`...");
    let room = if let Some(room) = state.find_room(&room_id) {
        room
    } else {
        tracing::error!("Couldn't find room `{room_id}`, disconnecting...");
        let event = UserEvent::JoinFailed { reason: String::from("Room does not exist") };
        let _ = socket.send(event.to_message()).await;
        return;
    };

    tracing::debug!("Joining room...");

    let (mut user_tx, mut user_rx) = socket.split();
    // Whenever the presence gets dropped (when the function returns),
    // a leave message is automatically sent to the host.
    let _presence = if let Some(presence) = room.users.join_user(username.clone()).await {
        presence
    } else {
        tracing::error!("User `{username}` already exists, disconnecting...");
        let event = UserEvent::JoinFailed { reason: String::from("Duplicate user") };
        let _ = user_tx.send(event.to_message()).await;
        return;
    };

    // Emit joined event to user
    let event = UserEvent::Joined;
    let _ = user_tx.send(event.to_message()).await;

    // Watch for game status updates
    let mut game_event_task = {
        let mut event_watch = room.result_stream.clone();
        let username = username.clone();
        tokio::spawn(async move {
            loop {
                let heartbeat = tokio::time::sleep(Duration::from_secs(25));
                tokio::pin!(heartbeat);
                // Depending on which happens first
                tokio::select! {
                    // Game status changed
                    res = event_watch.changed() => {
                        // Host dc'd
                        if res.is_err() {
                            // Close connection
                            let _ = user_tx.close().await;
                            return;
                        }

                        // Get event
                        let event = { event_watch.borrow().clone() };
                        match event {
                            GameEvent::GameEnd => {
                                tracing::debug!("Game ended, closing user connection...");
                                let event = UserEvent::GameEnd;
                                let _ = user_tx.send(event.to_message()).await;
                                
                                // Close connection
                                let _ = user_tx.close().await;
                                return;
                            }
                            GameEvent::RoundBegin { choices } => {
                                let event = UserEvent::RoundBegin { choices };
                                let _ = user_tx.send(event.to_message()).await;
                            }
                            GameEvent::RoundEnd { point_gains } => {
                                let point_gain = point_gains.get(&username).copied();
                                let event = UserEvent::RoundEnd { point_gain };
                                let _ = user_tx.send(event.to_message()).await;
                            }
                            GameEvent::InLobby => (),
                        }
                    }
                    // Heartbeat timer went off
                    _ = (&mut heartbeat) => {
                        tracing::debug!("Pinging player");
                        let _ = user_tx.send(Message::Ping(vec![])).await;
                    }
                }
            }
        })
    };

    // Feed user answers into action stream for the host to deal with
    let mut user_action_task = {
        let action_stream = room.action_stream.clone();
        tokio::spawn(async move {
            while let Some(action) = user_rx.next_action().await {
                if let Action::Answer { choice } = action {
                    let _ = action_stream
                        .send(PlayerAnswer {
                            username: username.clone(),
                            choice,
                        })
                        .await;
                }
            }
        })
    };

    // Wait until either task ends
    tokio::select! {
        _ = (&mut game_event_task) => user_action_task.abort(),
        _ = (&mut user_action_task) => game_event_task.abort(),
    };
}

/// Websocket api testing
#[cfg(test)]
mod tests {
    use crate::ws::router;
    use crate::ws::api::{Action, HostEvent, UserEvent, Question};

    use std::collections::HashSet;
    use std::sync::atomic::{AtomicU16, Ordering};
    use std::{net::SocketAddr, time::Duration};
    use tokio::net::TcpStream;
    use tokio_tungstenite::{connect_async, tungstenite::Message, WebSocketStream, MaybeTlsStream};
    use futures::{StreamExt, SinkExt};
    use serde::Serialize;

    // `let_assert` is a useful testing macro asserting a specific enum variant
    // and destructuring the variant to get its inner value.
    use assert2::let_assert;

    use super::api::RoomId;

    static PORT: AtomicU16 = AtomicU16::new(3001);

    struct TestServer {
        port: u16,
    }

    struct HostSocket(SocketStream);
    struct UserSocket(SocketStream);

    type SocketStream = WebSocketStream<MaybeTlsStream<TcpStream>>;

    impl TestServer {
        async fn new() -> Self {
            let port = PORT.fetch_add(1, Ordering::Relaxed);

            tokio::spawn(async move {
                axum::Server::bind(&SocketAddr::from(([127, 0, 0, 1], port)))
                    .serve(router().into_make_service())
                    .await
                    .unwrap();
            });

            // Wait a bit so server can start
            // TODO: Make this wait for the server to open, not for a specific amount of time
            tokio::time::sleep(Duration::from_secs(1)).await;

            Self { port }
        }

        async fn connect(&self) -> SocketStream {
            let (ws, _) = connect_async(format!("ws://127.0.0.1:{}", self.port))
                .await
                .unwrap();

            ws
        }

        async fn create_room(&self, questions: Vec<Question>) -> (HostSocket, RoomId) {
            let mut ws = self.connect().await;

            // Send create room action
            ws.send(serial(&Action::CreateRoom { questions })).await.unwrap();

            // Response must be a text message with no errors
            let_assert!(Some(Ok(Message::Text(s))) = ws.next().await);

            // Parse response
            let event: HostEvent = serde_json::from_str(&s).unwrap();

            // Response must be a room created event
            let_assert!(HostEvent::RoomCreated { room_id } = event);

            (HostSocket(ws), room_id)
        }

        async fn join_room(&self, room_id: RoomId, username: String) -> UserSocket {
            // Establish connection
            let mut ws = self.connect().await;

            // Send join room message
            ws.send(serial(&Action::JoinRoom {
                room_id,
                username,
            })).await.unwrap();

            UserSocket(ws)
        }
    }

    impl HostSocket {
        async fn recv(&mut self) -> Option<HostEvent> {
            loop {
                if let Message::Text(x) = self.0.next().await?.ok()? {
                    if let Ok(event) = serde_json::from_str(&x) {
                        return Some(event);
                    }
                }
            }
        }

        async fn send(&mut self, action: &Action) {
            self.0.send(serial(action)).await.unwrap();
        }
    }

    impl UserSocket {
        async fn recv(&mut self) -> Option<UserEvent> {
            loop {
                if let Message::Text(x) = self.0.next().await?.ok()? {
                    if let Ok(event) = serde_json::from_str(&x) {
                        return Some(event);
                    }
                }
            }
        }

        async fn send(&mut self, action: &Action) {
            self.0.send(serial(action)).await.unwrap();
        }

        async fn leave(mut self) {
            self.0.close(None).await.unwrap();
        }
    }

    // Macro magic, don't bother understanding
    macro_rules! question {
        ($ques:expr , time: $time:expr => [ $($correct:expr => $choice:expr),+ $(,)? ]) => {
            {
                let mut answer = 0;
                let mut answer_count = 0;
                let mut choices = Vec::new();

                $(
                    choices.push(String::from($choice));
                    if $correct {
                        answer_count += 1;
                    } else {
                        answer += 1;
                    }
                )+

                assert!(answer_count == 1, "Must have one correct answer");

                Question {
                    question: String::from($ques),
                    time: $time,
                    choices,
                    answer,
                }
            }
        };
    }

    /// Tests a simple situation where there is one player and only one question.
    #[tokio::test]
    async fn one_player_and_question() {
        // Start server
        let server = TestServer::new().await;

        // Sample question
        let question = question! {
            "Fish?", time: 30 => [
                true => "foo",
                false => "bar",
            ]
        };

        // Start room
        let (mut host_ws, room_id) = server.create_room(vec![question.clone()]).await;

        // Host tests
        let question_clone = question.clone();
        let host_task = tokio::spawn(async move {
            // User joined event
            let_assert!(HostEvent::UserJoined { username } = host_ws.recv().await.unwrap());

            // Username matches
            assert_eq!("Johnny", &username);

            // Send begin round action
            host_ws.send(&Action::BeginRound).await;

            // Round begin event
            let_assert!(HostEvent::RoundBegin { question } = host_ws.recv().await.unwrap());

            // Check if the question is the same
            assert_eq!(question_clone, question);

            // User answered event
            let_assert!(HostEvent::UserAnswered { username } = host_ws.recv().await.unwrap());

            // Username matches
            assert_eq!("Johnny", &username);

            // Round end event
            let_assert!(HostEvent::RoundEnd { point_gains } = host_ws.recv().await.unwrap());

            // Johnny gained 1000 points
            assert_eq!(point_gains.get("Johnny"), Some(&1000));

            // Send begin round action
            host_ws.send(&Action::BeginRound).await;

            // Game end event
            let_assert!(HostEvent::GameEnd = host_ws.recv().await.unwrap());
        });

        // Player tests
        let mut user_ws = server.join_room(room_id, String::from("Johnny")).await;
        let user_task = tokio::spawn(async move {
            // Joined event
            assert_eq!(user_ws.recv().await.unwrap(), UserEvent::Joined);

            // Round begin event
            let_assert!(UserEvent::RoundBegin { choices } = user_ws.recv().await.unwrap());

            // Has correct choice count
            assert_eq!(question.choices, choices);

            // Send correct answer
            user_ws.send(&Action::Answer { choice: question.answer }).await;

            // Round end event
            let_assert!(UserEvent::RoundEnd { point_gain: Some(point_gain) } = user_ws.recv().await.unwrap());

            // Gained 1000 points
            assert_eq!(point_gain, 1000);

            // Game end event
            let_assert!(UserEvent::GameEnd = user_ws.recv().await.unwrap());
        });

        // Wait for both tasks to complete
        tokio::try_join!(host_task, user_task).unwrap();
    }

    #[tokio::test]
    async fn join_leave() {
        let server = TestServer::new().await;

        let (mut host_ws, room_id) = server.create_room(vec![
            question! {
                "Fish?", time: 30 => [
                    true => "foo",
                    false => "bar",
                ]
            }
        ]).await;

        // Host tests
        let host_task = tokio::spawn(async move {
            let mut joined = HashSet::new();
            let mut left = HashSet::new();

            let mut i = 0;
            while let Some(event) = host_ws.recv().await {
                match event {
                    HostEvent::UserJoined { username } => {
                        assert!(joined.insert(username.clone()), "{username} joined twice");
                    }
                    HostEvent::UserLeft { username } => {
                        assert!(joined.contains(&username), "{username} left before joining");
                        assert!(left.insert(username.clone()), "{username} left twice");
                    }
                    _ => panic!("Unexpected event {event:?}"),
                }

                i += 1;
                if i >= 6 {
                    break;
                }
            }

            let names = HashSet::from([
                String::from("Alice"),
                String::from("Bob"),
                String::from("Chris"),
            ]);
            assert_eq!(joined, names);
            assert_eq!(left, names);
        });

        // Alice join
        tokio::time::sleep(Duration::from_millis(200)).await;
        let alice = server.join_room(room_id, String::from("Alice")).await;

        // Bob join
        tokio::time::sleep(Duration::from_millis(200)).await;
        let bob = server.join_room(room_id, String::from("Bob")).await;

        // Alice leave
        tokio::time::sleep(Duration::from_millis(200)).await;
        alice.leave().await;

        // Chris join
        tokio::time::sleep(Duration::from_millis(200)).await;
        let chris = server.join_room(room_id, String::from("Chris")).await;

        // Chris leave
        tokio::time::sleep(Duration::from_millis(200)).await;
        chris.leave().await;

        // Bob leave
        tokio::time::sleep(Duration::from_millis(200)).await;
        bob.leave().await;

        host_task.await.unwrap();
    }

    #[tokio::test]
    async fn room_not_exist() {
        let server = TestServer::new().await;

        // Join non-existent room
        let mut user = server.join_room(0, String::from("Foo")).await;

        let_assert!(UserEvent::JoinFailed { reason } = user.recv().await.unwrap());

        assert_eq!(reason, "Room does not exist");
    }

    #[tokio::test]
    async fn dupe_user() {
        // Start room
        let server = TestServer::new().await;
        let (_host, room_id) = server.create_room(vec![
            question! {
                "Fish?", time: 30 => [
                    true => "foo",
                    false => "bar",
                ]
            }
        ]).await;

        // Join duplicate user
        let _user = server.join_room(room_id, String::from("Foo")).await;
        let mut user = server.join_room(room_id, String::from("Foo")).await;

        let_assert!(UserEvent::JoinFailed { reason } = user.recv().await.unwrap());

        assert_eq!(reason, "Duplicate user");
    }

    /// Convert a `Serialize`able into a JSON message.
    fn serial(s: &impl Serialize) -> Message {
        let json_string = serde_json::to_string(s).unwrap();
        Message::text(json_string)
    }
}