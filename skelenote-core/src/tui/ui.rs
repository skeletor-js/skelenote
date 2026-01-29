//! UI rendering using ratatui

use super::app::{App, Focus, InputMode, View};
use ratatui::{
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, Paragraph, Wrap},
    Frame,
};

/// Draw the entire UI
pub fn draw(f: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1), // Tabs
            Constraint::Min(0),    // Main content
            Constraint::Length(1), // Status bar
        ])
        .split(f.area());

    draw_tabs(f, app, chunks[0]);
    draw_main(f, app, chunks[1]);
    draw_status(f, app, chunks[2]);
}

fn draw_tabs(f: &mut Frame, app: &App, area: Rect) {
    let tabs = vec![
        ("1", "Notes", View::Notes),
        ("2", "Inbox", View::Inbox),
        ("3", "Tasks", View::Tasks),
        ("4", "Daily", View::Daily),
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
            spans.push(Span::raw(" │ "));
        }
        spans.push(Span::styled(format!("[{}]{}", key, label), style));
    }

    if app.view == View::Search {
        spans.push(Span::raw(" │ "));
        spans.push(Span::styled(
            "[/]Search",
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ));
    }

    let para = Paragraph::new(Line::from(spans));
    f.render_widget(para, area);
}

fn draw_main(f: &mut Frame, app: &App, area: Rect) {
    if app.current_note.is_some() {
        let chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints([Constraint::Percentage(30), Constraint::Percentage(70)])
            .split(area);

        draw_list(f, app, chunks[0]);
        draw_content(f, app, chunks[1]);
    } else {
        draw_list(f, app, area);
    }
}

fn draw_list(f: &mut Frame, app: &App, area: Rect) {
    match app.view {
        View::Notes | View::Inbox | View::Daily | View::Search => draw_notes_list(f, app, area),
        View::Tasks => draw_tasks_list(f, app, area),
    }
}

fn draw_notes_list(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .notes
        .iter()
        .enumerate()
        .map(|(i, note)| {
            let is_selected = i == app.selected;
            let is_viewing = app
                .current_note
                .as_ref()
                .map_or(false, |n| n.path == note.path);

            let style = if is_viewing {
                Style::default()
                    .fg(Color::Cyan)
                    .add_modifier(Modifier::BOLD)
            } else if is_selected && app.focus == Focus::List {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else if is_selected {
                Style::default().fg(Color::Yellow)
            } else {
                Style::default()
            };

            let prefix = if is_viewing {
                "▶ "
            } else if is_selected {
                "› "
            } else {
                "  "
            };
            let content = format!("{}{}", prefix, note.title());
            ListItem::new(content).style(style)
        })
        .collect();

    let title = match app.view {
        View::Notes => " Notes ",
        View::Inbox => " Inbox ",
        View::Daily => " Daily ",
        View::Search => " Search ",
        _ => "",
    };

    let border_style = if app.focus == Focus::List && app.current_note.is_some() {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default()
    };

    let list = List::new(items).block(
        Block::default()
            .title(title)
            .borders(Borders::ALL)
            .border_style(border_style),
    );
    f.render_widget(list, area);
}

fn draw_tasks_list(f: &mut Frame, app: &App, area: Rect) {
    let items: Vec<ListItem> = app
        .tasks
        .iter()
        .enumerate()
        .map(|(i, task)| {
            let is_selected = i == app.selected;

            let style = if is_selected && app.focus == Focus::List {
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD)
            } else if task.done {
                Style::default().fg(Color::DarkGray)
            } else {
                Style::default()
            };

            let prefix = if is_selected { "› " } else { "  " };
            let checkbox = if task.done {
                "[x]"
            } else if task.in_progress {
                "[/]"
            } else {
                "[ ]"
            };
            let content = format!("{}{} {}", prefix, checkbox, task.text);
            ListItem::new(content).style(style)
        })
        .collect();

    let border_style = if app.focus == Focus::List {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default()
    };

    let list = List::new(items).block(
        Block::default()
            .title(" Tasks ")
            .borders(Borders::ALL)
            .border_style(border_style),
    );
    f.render_widget(list, area);
}

fn draw_content(f: &mut Frame, app: &App, area: Rect) {
    if let Some(note) = &app.current_note {
        let border_style = if app.focus == Focus::Content {
            Style::default().fg(Color::Yellow)
        } else {
            Style::default()
        };

        let is_editing = app.input_mode == InputMode::NoteEditing;
        let content_str = if is_editing {
            &app.editor_buffer
        } else {
            &note.content
        };

        let lines: Vec<Line> = content_str
            .lines()
            .enumerate()
            .skip(app.content_scroll)
            .map(|(line_num, line)| {
                let is_cursor_line = is_editing && line_num == app.editor_cursor.0;

                // Basic syntax highlighting
                let base_style = if line.starts_with('#') {
                    Style::default()
                        .fg(Color::Cyan)
                        .add_modifier(Modifier::BOLD)
                } else if line.starts_with("- [ ]") || line.starts_with("- [x]") {
                    Style::default().fg(Color::Green)
                } else if line.starts_with("- ") || line.starts_with("* ") {
                    Style::default().fg(Color::White)
                } else if line.contains("[[") && line.contains("]]") {
                    Style::default().fg(Color::Blue)
                } else {
                    Style::default()
                };

                if is_cursor_line && is_editing {
                    // Show cursor position
                    let col = app.editor_cursor.1.min(line.len());
                    let before = &line[..col];
                    let cursor_char = line.chars().nth(col).unwrap_or(' ');
                    let after = if col < line.len() {
                        &line[col + 1..]
                    } else {
                        ""
                    };

                    Line::from(vec![
                        Span::styled(before, base_style),
                        Span::styled(
                            cursor_char.to_string(),
                            Style::default().bg(Color::White).fg(Color::Black),
                        ),
                        Span::styled(after, base_style),
                    ])
                } else {
                    Line::styled(line, base_style)
                }
            })
            .collect();

        let title_marker = if is_editing {
            if app.unsaved_changes {
                " ● EDITING "
            } else {
                " EDITING "
            }
        } else {
            ""
        };
        let title = format!(" {}{}", note.title(), title_marker);

        let para = Paragraph::new(lines)
            .block(
                Block::default()
                    .title(title)
                    .borders(Borders::ALL)
                    .border_style(border_style),
            )
            .wrap(Wrap { trim: false });

        f.render_widget(para, area);
    }
}

fn draw_status(f: &mut Frame, app: &App, area: Rect) {
    let text = match app.input_mode {
        InputMode::Normal => app.status.clone(),
        InputMode::Editing => format!("{}{}_", app.status, app.input),
        InputMode::NoteEditing => app.status.clone(),
        InputMode::MetadataEditing => format!("{}{}_", app.status, app.metadata_buffer),
    };

    let style = match app.input_mode {
        InputMode::Normal => Style::default().fg(Color::DarkGray),
        InputMode::Editing => Style::default().fg(Color::Yellow),
        InputMode::NoteEditing => Style::default().fg(Color::Green),
        InputMode::MetadataEditing => Style::default().fg(Color::Magenta),
    };

    let para = Paragraph::new(text).style(style);
    f.render_widget(para, area);
}
