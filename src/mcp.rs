//! MCP Server - Primary interface for AI agents and frontends
//!
//! Implements a simplified MCP-like protocol over HTTP/JSON.
//! Full MCP SSE transport can be added later.

use crate::Vault;
use axum::response::sse::{Event, Sse};
use axum::{
    extract::State,
    http::StatusCode,
    response::Json,
    routing::{get, post},
    Router,
};
use futures::stream::Stream;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

/// MCP Server state
pub struct McpState {
    pub vault: Arc<RwLock<Vault>>,
}

/// Serve the MCP server on the given port
pub async fn serve(vault: Vault, port: u16) -> anyhow::Result<()> {
    let state = Arc::new(McpState {
        vault: Arc::new(RwLock::new(vault)),
    });

    let app = Router::new()
        // Health check
        .route("/health", get(health))
        // MCP-like endpoints
        .route("/mcp/info", get(mcp_info))
        .route("/mcp/tools", get(mcp_tools))
        .route("/mcp/call", post(mcp_call))
        .route("/mcp/events", get(mcp_events))
        // REST API (simpler alternative)
        .route("/api/search", post(api_search))
        .route("/api/semantic/:query", get(api_semantic))
        .route("/api/tasks", get(api_tasks))
        .route("/api/daily", get(api_daily))
        .route("/api/capture", post(api_capture))
        .route("/api/note", post(api_create_note))
        .layer(CorsLayer::permissive())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("MCP server listening on http://0.0.0.0:{}", port);

    axum::serve(listener, app).await?;
    Ok(())
}

// =============================================================================
// Health Check
// =============================================================================

async fn health() -> &'static str {
    "ok"
}

// =============================================================================
// MCP Protocol Endpoints (simplified JSON-RPC style)
// =============================================================================

#[derive(Serialize)]
struct McpInfo {
    name: String,
    version: String,
    description: String,
}

async fn mcp_info() -> Json<McpInfo> {
    Json(McpInfo {
        name: "skelenote".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "Headless productivity backend. Use tools to search, create, and manage notes."
                .to_string(),
    })
}

#[derive(Serialize)]
struct ToolDef {
    name: String,
    description: String,
    parameters: Value,
}

async fn mcp_tools() -> Json<Vec<ToolDef>> {
    Json(vec![
        ToolDef {
            name: "search_notes".to_string(),
            description: "Search notes by keyword or semantic similarity".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query"},
                    "semantic": {"type": "boolean", "default": false},
                    "limit": {"type": "integer", "default": 10}
                },
                "required": ["query"]
            }),
        },
        ToolDef {
            name: "read_note".to_string(),
            description: "Read a note by path".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Note path relative to vault root"}
                },
                "required": ["path"]
            }),
        },
        ToolDef {
            name: "create_note".to_string(),
            description: "Create a new note".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "content": {"type": "string"},
                    "folder": {"type": "string", "default": "inbox"},
                    "tags": {"type": "array", "items": {"type": "string"}}
                },
                "required": ["title", "content"]
            }),
        },
        ToolDef {
            name: "list_tasks".to_string(),
            description: "List tasks across all notes".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "filter": {
                        "type": "string",
                        "enum": ["today", "week", "overdue", "done", "all"],
                        "default": "today"
                    }
                }
            }),
        },
        // ... existing tools ...
        ToolDef {
            name: "append_content".to_string(),
            description: "Append content to a note".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {
                    "path": {"type": "string"},
                    "content": {"type": "string"}
                },
                "required": ["path", "content"]
            }),
        },
        ToolDef {
            name: "list_projects".to_string(),
            description: "List all projects".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {},
            }),
        },
        ToolDef {
            name: "list_areas".to_string(),
            description: "List all areas".to_string(),
            parameters: json!({
                "type": "object",
                "properties": {},
            }),
        },
    ])
}

#[derive(Deserialize)]
struct McpCallRequest {
    name: String,
    arguments: Value,
}

#[derive(Serialize)]
struct McpCallResult {
    content: String,
    is_error: bool,
}

async fn mcp_call(
    State(state): State<Arc<McpState>>,
    Json(req): Json<McpCallRequest>,
) -> Result<Json<McpCallResult>, StatusCode> {
    let result = match req.name.as_str() {
        "search_notes" => {
            let vault = state.vault.read().await;
            let query = req.arguments["query"].as_str().unwrap_or("");
            let semantic = req.arguments["semantic"].as_bool().unwrap_or(false);
            let limit = req.arguments["limit"].as_u64().unwrap_or(10) as usize;

            let results = if semantic {
                vault.semantic_search(query, limit).await
            } else {
                vault.search(query, limit).await
            };

            match results {
                Ok(hits) => {
                    let text = hits
                        .iter()
                        .map(|h| format!("- {} ({})", h.title, h.path.display()))
                        .collect::<Vec<_>>()
                        .join("\n");
                    ok_result(&text)
                }
                Err(e) => err_result(&e.to_string()),
            }
        }
        "read_note" => {
            let vault = state.vault.read().await;
            let path = req.arguments["path"].as_str().unwrap_or("");
            match vault.get_note(std::path::Path::new(path)).await {
                Ok(Some(note)) => ok_result(&note.to_markdown()),
                Ok(None) => err_result("Note not found"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "create_note" => {
            let title = req.arguments["title"].as_str().unwrap_or("Untitled");
            let content = req.arguments["content"].as_str().unwrap_or("");
            let folder = req.arguments["folder"].as_str();
            let tags: Vec<String> = req.arguments["tags"]
                .as_array()
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();

            let vault = state.vault.write().await;
            match vault.create_note(title, content, folder, &tags).await {
                Ok(note) => ok_result(&format!("Created: {}", note.path.display())),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "append_content" => {
            let path = req.arguments["path"].as_str().unwrap_or("");
            let content = req.arguments["content"].as_str().unwrap_or("");

            let vault = state.vault.read().await;
            let full_path = vault.root.join(path);

            // Basic append without reading full note if possible,
            // but we might need to be careful about newlines.
            // Using standard fs append.
            use std::io::Write;
            let mut file = match std::fs::OpenOptions::new().append(true).open(&full_path) {
                Ok(f) => f,
                Err(e) => return Ok(Json(err_result(&e.to_string()))),
            };

            match writeln!(file, "\n{}", content) {
                Ok(_) => ok_result("Content appended"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "list_tasks" => {
            let vault = state.vault.read().await;
            let filter = req.arguments["filter"].as_str().unwrap_or("today");
            match vault.list_tasks(filter).await {
                Ok(tasks) => {
                    let text = tasks
                        .iter()
                        .map(|t| {
                            let status = if t.done { "x" } else { " " };
                            format!("[{}] {} ({})", status, t.text, t.source.display())
                        })
                        .collect::<Vec<_>>()
                        .join("\n");
                    ok_result(if text.is_empty() {
                        "No tasks found"
                    } else {
                        &text
                    })
                }
                Err(e) => err_result(&e.to_string()),
            }
        }
        "toggle_task" => {
            let vault = state.vault.read().await;
            let path = req.arguments["path"].as_str().unwrap_or("");
            let line = req.arguments["line"].as_u64().unwrap_or(0) as usize;

            let full_path = vault.root.join(path);
            if let Ok(content) = std::fs::read_to_string(&full_path) {
                let new_content = crate::tasks::Task::toggle_in_content(&content, line);
                match std::fs::write(&full_path, new_content) {
                    Ok(_) => ok_result("Task toggled"),
                    Err(e) => err_result(&e.to_string()),
                }
            } else {
                err_result("Note not found")
            }
        }
        "get_backlinks" => {
            let vault = state.vault.read().await;
            let path = req.arguments["path"].as_str().unwrap_or("");
            match vault.get_backlinks(std::path::Path::new(path)).await {
                Ok(links) => {
                    let text = if links.is_empty() {
                        "No backlinks".to_string()
                    } else {
                        links.join("\n")
                    };
                    ok_result(&text)
                }
                Err(e) => err_result(&e.to_string()),
            }
        }
        "get_daily_note" => {
            let date = req.arguments["date"].as_str();
            let vault = state.vault.write().await;
            match vault.get_or_create_daily(date).await {
                Ok(note) => ok_result(&note.to_markdown()),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "quick_capture" => {
            let content = req.arguments["content"].as_str().unwrap_or("");
            let vault = state.vault.write().await;
            match vault.quick_capture(content).await {
                Ok(_) => ok_result("Captured to inbox"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "update_note" => {
            let path = req.arguments["path"].as_str().unwrap_or("");
            let content = req.arguments["content"].as_str().unwrap_or("");
            let vault = state.vault.write().await;
            match vault.update_note(std::path::Path::new(path), content).await {
                Ok(_) => ok_result("Note updated"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "patch_metadata" => {
            let path = req.arguments["path"].as_str().unwrap_or("");
            let title = req.arguments["title"].as_str().map(String::from);
            let tags = req.arguments["tags"].as_array().map(|arr| {
                arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect::<Vec<_>>()
            });

            let vault = state.vault.write().await;
            match vault
                .patch_metadata(std::path::Path::new(path), |fm| {
                    if let Some(t) = title {
                        fm.title = Some(t);
                    }
                    if let Some(t) = tags {
                        fm.tags = t;
                    }
                })
                .await
            {
                Ok(_) => ok_result("Properties updated"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "move_note" => {
            let from = req.arguments["from"].as_str().unwrap_or("");
            let to = req.arguments["to"].as_str().unwrap_or("");
            let vault = state.vault.write().await;
            match vault.rename_note(std::path::Path::new(from), to).await {
                Ok(new_path) => ok_result(&format!("Moved to {}", new_path.display())),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "delete_note" => {
            let path = req.arguments["path"].as_str().unwrap_or("");
            let vault = state.vault.write().await;
            match vault.delete_note(std::path::Path::new(path)).await {
                Ok(_) => ok_result("Note deleted"),
                Err(e) => err_result(&e.to_string()),
            }
        }
        "list_directory" => {
            let path = req.arguments["path"]
                .as_str()
                .map(|s| if s.is_empty() { None } else { Some(s) })
                .unwrap_or(None);
            let vault = state.vault.read().await;
            match vault.list_files(path).await {
                Ok(files) => {
                    let text = if files.is_empty() {
                        "Empty directory".to_string()
                    } else {
                        files.join("\n")
                    };
                    ok_result(&text)
                }
                Err(e) => err_result(&e.to_string()),
            }
        }
        "list_projects" => {
            let vault = state.vault.read().await;
            match vault.list_files(Some("projects")).await {
                Ok(files) => {
                    let text = if files.is_empty() {
                        "No projects found".to_string()
                    } else {
                        files.join("\n")
                    };
                    ok_result(&text)
                }
                Err(_) => ok_result("No projects folder"), // Soft error
            }
        }
        "list_areas" => {
            let vault = state.vault.read().await;
            match vault.list_files(Some("areas")).await {
                Ok(files) => {
                    let text = if files.is_empty() {
                        "No areas found".to_string()
                    } else {
                        files.join("\n")
                    };
                    ok_result(&text)
                }
                Err(_) => ok_result("No areas folder"), // Soft error
            }
        }
        _ => err_result("Unknown tool"),
    };

    Ok(Json(result))
}

fn ok_result(text: &str) -> McpCallResult {
    McpCallResult {
        content: text.to_string(),
        is_error: false,
    }
}

fn err_result(text: &str) -> McpCallResult {
    McpCallResult {
        content: text.to_string(),
        is_error: true,
    }
}

async fn mcp_events(
    State(state): State<Arc<McpState>>,
) -> Sse<impl Stream<Item = Result<Event, std::convert::Infallible>>> {
    let rx = state.vault.read().await.subscribe();

    let stream = futures::stream::unfold(rx, |mut rx| async move {
        match rx.recv().await {
            Ok(event) => {
                // Wrap in JSON-RPC notification
                let params = json!({
                    "event": event
                });
                let notification = json!({
                    "jsonrpc": "2.0",
                    "method": "notifications/resources/updated",
                    "params": params
                });

                let json = serde_json::to_string(&notification).unwrap_or_default();
                Some((Ok(Event::default().event("message").data(json)), rx))
            }
            Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                // Skip lagged but maybe notify client?
                Some((
                    Ok(Event::default().event("warning").data("events_lagged")),
                    rx,
                ))
            }
            Err(tokio::sync::broadcast::error::RecvError::Closed) => None,
        }
    });

    Sse::new(stream).keep_alive(axum::response::sse::KeepAlive::default())
}

// =============================================================================
// REST API (simpler alternative to MCP)
// =============================================================================

#[derive(Deserialize)]
struct SearchRequest {
    query: String,
    semantic: Option<bool>,
    limit: Option<usize>,
}

async fn api_search(
    State(state): State<Arc<McpState>>,
    Json(req): Json<SearchRequest>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.read().await;
    let limit = req.limit.unwrap_or(10);

    let results = if req.semantic.unwrap_or(false) {
        vault.semantic_search(&req.query, limit).await
    } else {
        vault.search(&req.query, limit).await
    };

    match results {
        Ok(hits) => Ok(Json(json!({
            "results": hits.iter().map(|h| json!({
                "path": h.path,
                "title": h.title,
                "snippet": h.snippet,
                "score": h.score
            })).collect::<Vec<_>>()
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

async fn api_semantic(
    State(state): State<Arc<McpState>>,
    axum::extract::Path(query): axum::extract::Path<String>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.read().await;
    let limit = 10;

    match vault.semantic_search(&query, limit).await {
        Ok(hits) => Ok(Json(json!({
            "results": hits.iter().map(|h| json!({
                "path": h.path,
                "title": h.title,
                "snippet": h.snippet,
                "score": h.score
            })).collect::<Vec<_>>()
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct TasksQuery {
    filter: Option<String>,
}

async fn api_tasks(
    State(state): State<Arc<McpState>>,
    axum::extract::Query(query): axum::extract::Query<TasksQuery>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.read().await;
    let filter = query.filter.as_deref().unwrap_or("today");

    match vault.list_tasks(filter).await {
        Ok(tasks) => Ok(Json(json!({ "tasks": tasks }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct DailyQuery {
    date: Option<String>,
}

async fn api_daily(
    State(state): State<Arc<McpState>>,
    axum::extract::Query(query): axum::extract::Query<DailyQuery>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.write().await;

    match vault.get_or_create_daily(query.date.as_deref()).await {
        Ok(note) => Ok(Json(json!({
            "path": note.path,
            "title": note.title(),
            "content": note.content
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct CaptureRequest {
    content: String,
}

async fn api_capture(
    State(state): State<Arc<McpState>>,
    Json(req): Json<CaptureRequest>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.write().await;

    match vault.quick_capture(&req.content).await {
        Ok(_) => Ok(Json(json!({ "status": "ok" }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

#[derive(Deserialize)]
struct CreateNoteRequest {
    title: String,
    content: String,
    folder: Option<String>,
    tags: Option<Vec<String>>,
}

async fn api_create_note(
    State(state): State<Arc<McpState>>,
    Json(req): Json<CreateNoteRequest>,
) -> Result<Json<Value>, StatusCode> {
    let vault = state.vault.write().await;
    let tags = req.tags.unwrap_or_default();

    match vault
        .create_note(&req.title, &req.content, req.folder.as_deref(), &tags)
        .await
    {
        Ok(note) => Ok(Json(json!({
            "path": note.path,
            "title": note.title()
        }))),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}
