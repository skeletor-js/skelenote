//! Terminal User Interface using ratatui

mod app;
mod event;
mod ui;

pub use app::App;
pub use event::Event;

use crate::Vault;
use anyhow::Result;
use crossterm::{
    event::{DisableMouseCapture, EnableMouseCapture},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io;

/// Run the TUI application
pub async fn run(vault: Vault) -> Result<()> {
    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app
    let mut app = App::new(vault);

    // Initial data load
    app.refresh().await?;

    // Main loop
    loop {
        terminal.draw(|f| ui::draw(f, &app))?;

        if let Some(event) = event::poll()? {
            match event {
                Event::Quit => break,
                Event::Key(key) => app.handle_key(key).await?,
                Event::Tick => {}
            }
        }

        // Check for pending editor action
        if app.has_pending_editor() {
            if let Some(path) = app.take_pending_editor() {
                // Suspend TUI
                disable_raw_mode()?;
                execute!(
                    terminal.backend_mut(),
                    LeaveAlternateScreen,
                    DisableMouseCapture
                )?;
                terminal.show_cursor()?;

                // Launch editor
                let editor = std::env::var("EDITOR").unwrap_or_else(|_| "vim".to_string());
                let status = std::process::Command::new(&editor).arg(&path).status();

                // Resume TUI
                enable_raw_mode()?;
                execute!(
                    terminal.backend_mut(),
                    EnterAlternateScreen,
                    EnableMouseCapture
                )?;
                terminal.hide_cursor()?;
                terminal.clear()?;

                // Update status
                match status {
                    Ok(s) if s.success() => {
                        app.status = format!("Edited: {}", path.display());
                        // Refresh to pick up changes
                        app.refresh().await?;
                    }
                    Ok(s) => {
                        app.status = format!("Editor exited with: {}", s);
                    }
                    Err(e) => {
                        app.status = format!("Failed to launch {}: {}", editor, e);
                    }
                }
            }
        }

        // Check for quit
        if app.should_quit {
            break;
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
