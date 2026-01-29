//! Terminal User Interface using ratatui

mod app;
mod event;
mod theme;
mod ui;

pub use app::{App, View};
pub use event::Event;

use crate::crypto;
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
    // Determine identity file path
    let identity_path = vault.root.join(".skelenote").join("identity.enc");

    // Setup terminal
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    // Create app based on identity file existence
    let mut app = if crypto::identity_exists(&identity_path) {
        // Identity exists - need password to unlock
        App::new_unlock(vault, identity_path)
    } else {
        // First run - need to create identity
        App::new_setup(vault, identity_path)
    };

    // Only do initial refresh if already authenticated
    if !matches!(app.view, View::Setup | View::Unlock) {
        app.refresh().await?;
    }

    // Main loop
    loop {
        terminal.draw(|f| ui::draw(f, &app))?;

        if let Some(event) = event::poll()? {
            match event {
                Event::Quit => break,
                Event::Key(key_event) => app.handle_key(key_event).await?,
                Event::Mouse(mouse) => app.handle_mouse(mouse).await?,
                Event::Tick => {}
            }
        }

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
