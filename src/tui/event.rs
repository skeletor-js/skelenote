//! Event handling for TUI

use crossterm::event::{self, Event as CrosstermEvent, KeyCode};
use std::time::Duration;

/// Application events
pub enum Event {
    /// Key press
    Key(KeyCode),
    /// Tick for updates
    Tick,
    /// Quit signal
    Quit,
}

/// Poll for events with timeout
pub fn poll() -> anyhow::Result<Option<Event>> {
    if event::poll(Duration::from_millis(100))? {
        if let CrosstermEvent::Key(key) = event::read()? {
            // Handle Ctrl+C as quit
            if key.code == KeyCode::Char('c')
                && key
                    .modifiers
                    .contains(crossterm::event::KeyModifiers::CONTROL)
            {
                return Ok(Some(Event::Quit));
            }
            return Ok(Some(Event::Key(key.code)));
        }
    }
    Ok(Some(Event::Tick))
}
