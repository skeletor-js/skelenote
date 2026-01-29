use crate::relay::protocol::Message;
use axum::{
    extract::{
        ws::{Message as WsMessage, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::sink::SinkExt;
use futures::stream::StreamExt;
use std::{collections::HashMap, sync::Arc};
use tokio::sync::{broadcast, RwLock};

/// Relay server state
struct RelayState {
    /// Room channels (Room ID -> Broadcast Sender)
    rooms: RwLock<HashMap<String, broadcast::Sender<Message>>>,
}

/// Serve the relay server
pub async fn serve(port: u16) -> anyhow::Result<()> {
    let state = Arc::new(RelayState {
        rooms: RwLock::new(HashMap::new()),
    });

    let app = Router::new()
        .route("/sync", get(ws_handler))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("Relay server listening on http://0.0.0.0:{}", port);
    axum::serve(listener, app).await?;
    Ok(())
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<RelayState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<RelayState>) {
    let (mut sender, mut receiver) = socket.split();
    
    // Channel to bridge broadcast -> websocket
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Message>(100);
    
    // Spawn writer task
    let mut write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let json: String = serde_json::to_string(&msg).unwrap_or_default();
            // Axum 0.8 Message::Text takes Utf8Bytes, which implements From<String>
            if sender.send(WsMessage::Text(json.into())).await.is_err() {
                break;
            }
        }
    });

    // Reader loop
    let mut broadcast_task: Option<tokio::task::JoinHandle<()>> = None;
    let mut current_room_id: Option<String> = None;

    while let Some(Ok(msg)) = receiver.next().await {
        if let WsMessage::Text(text) = msg {
            // text is Utf8Bytes in Axum 0.8, which implements Deref<Target=str>
            // or AsRef<str>.
            if let Ok(cmd) = serde_json::from_str::<Message>(&text) {
                match cmd {
                    Message::Join { room } => {
                        // Unsubscribe from old
                        if let Some(task) = broadcast_task.take() {
                            task.abort();
                        }

                        // Get or create room
                        let tx_room = {
                            let mut rooms = state.rooms.write().await;
                            rooms
                                .entry(room.clone())
                                .or_insert_with(|| {
                                    let (tx, _rx) = broadcast::channel(100);
                                    tx
                                })
                                .clone()
                        };

                        let mut rx_room = tx_room.subscribe();
                        let tx_client = tx.clone();
                        let room_id = room.clone();
                        current_room_id = Some(room.clone());

                        // Spawn forwarder
                        broadcast_task = Some(tokio::spawn(async move {
                            while let Ok(msg) = rx_room.recv().await {
                                if tx_client.send(msg).await.is_err() {
                                    break;
                                }
                            }
                        }));
                        
                        tracing::info!("Client joined room: {}", room_id);
                    }
                    Message::Leave => {
                        if let Some(task) = broadcast_task.take() {
                            task.abort();
                        }
                        current_room_id = None;
                    }
                    Message::Sync { .. } | Message::Ack { .. } => {
                        // Broadcast to current room
                        if let Some(room_id) = &current_room_id {
                            let sender = {
                                let rooms = state.rooms.read().await;
                                rooms.get(room_id).cloned()
                            };
                            if let Some(tx) = sender {
                                // Ignore send errors (no listeners is fine)
                                let _ = tx.send(cmd);
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(task) = broadcast_task {
        task.abort();
    }
    write_task.abort();
}
