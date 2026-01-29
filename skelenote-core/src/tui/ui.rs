//! UI rendering using ratatui

use super::app::{App, InputMode, View};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame,
};

/// Draw the entire UI
pub fn draw(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Tabs
            Constraint::Min(0),    // Main content
            Constraint::Length(3), // Status bar
        ])
        .split(f.area());

    draw_tabs(f, app, chunks[0]);
    draw_main(f, app, chunks[1]);
    draw_status(f, app, chunks[2]);
}

fn draw_tabs(f: &mut Frame, app: &App, area: Rect) {
    let tabs = vec![
        ("1", "Notes", View::Notes),
        ("2", "Tasks", View::Tasks),
        ("3", "Daily", View::Daily),
    ];

    let mut spans: Vec<Span> = Vec::new();
    for (key, label, view) in tabs {
        let style = if app.view == view {
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD)
        } else {
            Style::default().fg(Color::DarkGray)
        };

        if !spans.is_empty() {
            spans.push(Span::raw("  │  "));
        }
        spans.push(Span::styled(format!("[{}] {}", key, label), style));
    }

    if app.view == View::Search {
        spans.push(Span::raw("  │  "));
        spans.push(Span::styled(
            "[/] Search Results",
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ));
    }

    let para = Paragraph::new(Line::from(spans)).block(Block::default().borders(Borders::BOTTOM));
    f.render_widget(para, area);
}

fn draw_main(f: &mut Frame, app: &App, area: Rect) {
    match app.view {
        View::Notes | View::Daily | View::Search => draw_notes_list(f, app, area),
        View::Tasks => draw_tasks_list(f, app, area),
    }
}

fn draw_notes_list(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .notes
        .iter()
        .enumerate()
        .map(|(i, note)| {
            let style = if i == app.selected {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };

            let prefix = if i == app.selected { "▶ " } else { "  " };
            let title = note.title();
            let date = note.modified.format("%Y-%m-%d %H:%M");

            let content = format!("{}{} ({})", prefix, title, date);
            ListItem::new(content).style(style)
        })
        .collect();

    let title = match app.view {
        View::Notes => " Notes ",
        View::Daily => " Daily Note ",
        View::Search => " Search Results ",
        _ => "",
    };

    let list = List::new(items).block(Block::default().title(title).borders(Borders::ALL));
    f.render_widget(list, area);
}

fn draw_tasks_list(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .tasks
        .iter()
        .enumerate()
        .map(|(i, task)| {
            let style = if i == app.selected {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else if task.done {
                Style::default().fg(Color::DarkGray)
            } else {
                Style::default()
            };

            let prefix = if i == app.selected { "▶ " } else { "  " };
            let checkbox = if task.done {
                "[x]"
            } else if task.in_progress {
                "[/]"
            } else {
                "[ ]"
            };

            let due = task.due.map(|d| format!(" @{}", d)).unwrap_or_default();
            let priority = task
                .priority
                .map(|p| format!(" !{:?}", p).to_lowercase())
                .unwrap_or_default();

            let content = format!("{}{} {}{}{}", prefix, checkbox, task.text, due, priority);
            ListItem::new(content).style(style)
        })
        .collect();

    let list = List::new(items).block(Block::default().title(" Tasks ").borders(Borders::ALL));
    f.render_widget(list, area);
}

fn draw_status(f: &mut Frame, app: &App, area: Rect) {
    let (style, text) = match app.input_mode {
        InputMode::Normal => (Style::default().fg(Color::DarkGray), app.status.clone()),
        InputMode::Editing => (
            Style::default().fg(Color::Yellow),
            format!("{}{}", app.status, app.input),
        ),
    };

    let help = " q:quit  j/k:nav  /:search  x:toggle  n:new  c:capture ";
    let help_span = Span::styled(help, Style::default().fg(Color::DarkGray));

    let status_line = if app.input_mode == InputMode::Editing {
        Line::from(vec![Span::styled(text, style)])
    } else {
        Line::from(vec![Span::styled(text, style), Span::raw(" │ "), help_span])
    };

    let para = Paragraph::new(status_line).block(Block::default().borders(Borders::TOP));
    f.render_widget(para, area);
}
