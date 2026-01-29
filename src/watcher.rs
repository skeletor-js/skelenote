//! File system watcher for live vault updates

use anyhow::{anyhow, Result};
use notify_debouncer_full::{new_debouncer, Debouncer, FileIdMap};
use std::path::{Path, PathBuf};
use std::sync::mpsc;
use std::time::Duration;
use tokio::sync::mpsc::Sender;

use serde::Serialize;

/// Filtered file system events relevant to the vault
#[derive(Debug, Clone, Serialize)]
pub enum VaultEvent {
    Create(PathBuf),
    Modify(PathBuf),
    Remove(PathBuf),
    Rename(PathBuf, PathBuf), // from, to
}

/// Helper to check if file is relevant (markdown)
fn is_relevant(path: &Path) -> bool {
    path.extension().map_or(false, |ext| ext == "md") && !path.iter().any(|c| c == ".skelenote")
}

/// Opaque handle to keep watcher alive
pub struct WatcherHandle {
    _debouncer: Debouncer<notify_debouncer_full::notify::RecommendedWatcher, FileIdMap>,
}

/// Start a recursive file watcher
pub fn start_watcher(path: &Path, tx: Sender<VaultEvent>) -> Result<WatcherHandle> {
    let (sync_tx, sync_rx) = mpsc::channel();

    let mut debouncer = new_debouncer(Duration::from_millis(500), None, sync_tx)?;

    debouncer.watch(
        path,
        notify_debouncer_full::notify::RecursiveMode::Recursive,
    )?;

    // Spawn a thread to bridge sync channel to async channel
    std::thread::spawn(move || {
        while let Ok(res) = sync_rx.recv() {
            match res {
                Ok(events) => {
                    for event in events {
                        let relevant_paths: Vec<&PathBuf> = event
                            .event
                            .paths
                            .iter()
                            .filter(|p| is_relevant(p))
                            .collect();

                        if relevant_paths.is_empty() {
                            continue;
                        }

                        use notify_debouncer_full::notify::EventKind;
                        match event.event.kind {
                            EventKind::Create(_) => {
                                for p in relevant_paths {
                                    let _ = tx.blocking_send(VaultEvent::Create(p.clone()));
                                }
                            }
                            EventKind::Modify(_) => {
                                for p in relevant_paths {
                                    let _ = tx.blocking_send(VaultEvent::Modify(p.clone()));
                                }
                            }
                            EventKind::Remove(_) => {
                                for p in relevant_paths {
                                    let _ = tx.blocking_send(VaultEvent::Remove(p.clone()));
                                }
                            }
                            EventKind::Access(_) => {} // Ignore
                            EventKind::Other => {}
                            EventKind::Any => {}
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Watch error: {:?}", e);
                }
            }
        }
    });

    Ok(WatcherHandle {
        _debouncer: debouncer,
    })
}
