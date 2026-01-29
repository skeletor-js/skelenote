//! UI rendering using ratatui

use super::app::{App, Focus, InputMode, Popup, SetupPhase, View};
use super::theme::ThemeVariant;
use crate::crypto;
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Clear, List, ListItem, Paragraph, Wrap},
    Frame,
};

/// Draw the entire UI
pub fn draw(f: &mut Frame, app: &App) {
    // Apply root theme to the whole area (background)
    let whole_block = Block::default().style(app.theme.root);
    f.render_widget(whole_block, f.area());

    // Handle setup and unlock views specially (full-screen)
    match app.view {
        View::Setup => {
            draw_setup(f, app);
            return;
        }
        View::Unlock => {
            draw_unlock(f, app);
            return;
        }
        _ => {}
    }

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

    // Draw popup overlay last (on top of everything)
    match app.popup {
        Popup::ThemeSelect => draw_theme_popup(f, app),
        Popup::None => {}
    }
}

fn draw_tabs(f: &mut Frame, app: &App, area: Rect) {
    // Update UI layout for mouse hit-testing
    {
        let mut layout = app.ui_layout.borrow_mut();
        layout.tab_area = Some(area);
        layout.tab_bounds.clear();
    }

    let tabs = vec![
        ("1", "Notes", View::Notes),
        ("2", "Inbox", View::Inbox),
        ("3", "Tasks", View::Tasks),
        ("4", "Daily", View::Daily),
    ];

    let mut col_offset: u16 = 0;
    let mut spans: Vec<Span> = Vec::new();

    for (key, label, view) in tabs {
        let text = format!("[{}]{}", key, label);
        let text_len = text.len() as u16;

        if !spans.is_empty() {
            spans.push(Span::styled(" │ ", app.theme.tab_divider));
            col_offset += 3; // " │ " is 3 chars
        }

        // Track this tab's boundaries for mouse click detection
        {
            let mut layout = app.ui_layout.borrow_mut();
            layout.tab_bounds.push((col_offset, col_offset + text_len, view));
        }
        col_offset += text_len;

        let style = if app.view == view {
            app.theme.tab_active
        } else {
            app.theme.tab_inactive
        };
        spans.push(Span::styled(text, style));
    }

    if app.view == View::Search {
        spans.push(Span::styled(" │ ", app.theme.tab_divider));
        col_offset += 3;
        let search_text = "[/]Search";
        {
            let mut layout = app.ui_layout.borrow_mut();
            layout
                .tab_bounds
                .push((col_offset, col_offset + search_text.len() as u16, View::Search));
        }
        spans.push(Span::styled(search_text, app.theme.tab_active));
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

        // Update UI layout for mouse hit-testing
        {
            let mut layout = app.ui_layout.borrow_mut();
            layout.list_area = Some(chunks[0]);
            layout.content_area = Some(chunks[1]);
        }

        draw_list(f, app, chunks[0]);
        draw_content(f, app, chunks[1]);
    } else {
        // Update UI layout - list takes full area, no content pane
        {
            let mut layout = app.ui_layout.borrow_mut();
            layout.list_area = Some(area);
            layout.content_area = None;
        }

        draw_list(f, app, area);
    }
}

fn draw_list(f: &mut Frame, app: &App, area: Rect) {
    match app.view {
        View::Notes | View::Inbox | View::Daily | View::Search => draw_notes_list(f, app, area),
        View::Tasks => draw_tasks_list(f, app, area),
        View::Setup | View::Unlock => {} // Handled separately
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
                // Determine style for viewing
                // For now reuse list_selected_focus but maybe distinct style later?
                // Actually the original logic used Cyan + Bold
                app.theme.list_selected_focus
            } else if is_selected && app.focus == Focus::List {
                app.theme.list_selected_focus
            } else if is_selected {
                app.theme.list_selected
            } else {
                app.theme.list_default
            };

            let prefix = if is_viewing {
                &app.theme.list_prefix_viewing
            } else if is_selected {
                &app.theme.list_prefix_selected
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
        app.theme.border_focus // Actually logic was if focused and note open -> yellow (focus)
    } else if app.focus == Focus::List {
        app.theme.border_focus
    } else {
        app.theme.border_default
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
                app.theme.list_selected_focus
            } else if task.done {
                app.theme.list_default.add_modifier(Modifier::DIM)
            } else {
                app.theme.list_default
            };

            let prefix = if is_selected {
                &app.theme.list_prefix_selected
            } else {
                "  "
            };
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
        app.theme.border_focus
    } else {
        app.theme.border_default
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
            app.theme.border_focus
        } else {
            app.theme.border_default
        };

        let is_editing = app.input_mode == InputMode::NoteEditing;
        let content_str = if is_editing {
            &app.editor_buffer
        } else {
            &note.content
        };

        // Get selection bounds if any
        let selection_bounds = app
            .editor_selection
            .as_ref()
            .filter(|s| !s.is_empty())
            .map(|s| s.normalized());

        let lines: Vec<Line> = content_str
            .lines()
            .enumerate()
            .skip(app.content_scroll)
            .map(|(line_num, line)| {
                let is_cursor_line = is_editing && line_num == app.editor_cursor.0;

                // Basic syntax highlighting
                let base_style = if line.starts_with('#') {
                    app.theme.syntax_header
                } else if line.starts_with("- [ ]") || line.starts_with("- [x]") {
                    app.theme.syntax_todo
                } else if line.starts_with("- ") || line.starts_with("* ") {
                    app.theme.syntax_list
                } else if line.contains("[[") && line.contains("]]") {
                    app.theme.syntax_link
                } else {
                    app.theme.content_default
                };

                // Check if this line has selection
                let line_selection = selection_bounds.and_then(|((start_line, start_col), (end_line, end_col))| {
                    if line_num >= start_line && line_num <= end_line {
                        let sel_start = if line_num == start_line { start_col } else { 0 };
                        let sel_end = if line_num == end_line { end_col.min(line.len()) } else { line.len() };
                        if sel_start < sel_end || (sel_start == sel_end && line_num > start_line && line_num < end_line) {
                            Some((sel_start, sel_end))
                        } else if sel_start == sel_end && line_num == start_line && line_num == end_line {
                            None // Empty selection on same line
                        } else {
                            Some((sel_start, line.len())) // Full line selected
                        }
                    } else {
                        None
                    }
                });

                if is_editing && (is_cursor_line || line_selection.is_some()) {
                    // Complex rendering: cursor and/or selection
                    render_line_with_cursor_and_selection(
                        line,
                        is_cursor_line,
                        app.editor_cursor.1,
                        line_selection,
                        base_style,
                        app.theme.content_cursor,
                        app.theme.content_selection,
                    )
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

/// Render a line with cursor and/or selection highlighting
fn render_line_with_cursor_and_selection<'a>(
    line: &str,
    is_cursor_line: bool,
    cursor_col: usize,
    selection: Option<(usize, usize)>,
    base_style: Style,
    cursor_style: Style,
    selection_style: Style,
) -> Line<'a> {
    let line_len = line.len();
    let mut spans: Vec<Span<'a>> = Vec::new();

    // If no selection, just render cursor
    if selection.is_none() {
        if is_cursor_line {
            let col = cursor_col.min(line_len);
            let before = &line[..col];
            let cursor_char = line.chars().nth(col).unwrap_or(' ');
            let after = if col < line_len { &line[col + 1..] } else { "" };

            spans.push(Span::styled(before.to_string(), base_style));
            spans.push(Span::styled(cursor_char.to_string(), cursor_style));
            spans.push(Span::styled(after.to_string(), base_style));
        } else {
            spans.push(Span::styled(line.to_string(), base_style));
        }
        return Line::from(spans);
    }

    let (sel_start, sel_end) = selection.unwrap();
    let sel_start = sel_start.min(line_len);
    let sel_end = sel_end.min(line_len);

    // Build spans with selection and cursor
    if is_cursor_line {
        let col = cursor_col.min(line_len);

        // We need to handle overlapping cursor and selection
        // Order segments: before selection, selection (with cursor inside if needed), after selection

        if col < sel_start {
            // Cursor before selection
            // [before_cursor] [cursor] [cursor_to_sel_start] [selection] [after_selection]
            if col > 0 {
                spans.push(Span::styled(line[..col].to_string(), base_style));
            }
            let cursor_char = line.chars().nth(col).unwrap_or(' ');
            spans.push(Span::styled(cursor_char.to_string(), cursor_style));
            if col + 1 < sel_start {
                spans.push(Span::styled(line[col + 1..sel_start].to_string(), base_style));
            }
            if sel_start < sel_end {
                spans.push(Span::styled(line[sel_start..sel_end].to_string(), selection_style));
            }
            if sel_end < line_len {
                spans.push(Span::styled(line[sel_end..].to_string(), base_style));
            }
        } else if col >= sel_end {
            // Cursor after selection
            // [before_selection] [selection] [sel_end_to_cursor] [cursor] [after_cursor]
            if sel_start > 0 {
                spans.push(Span::styled(line[..sel_start].to_string(), base_style));
            }
            if sel_start < sel_end {
                spans.push(Span::styled(line[sel_start..sel_end].to_string(), selection_style));
            }
            if sel_end < col {
                spans.push(Span::styled(line[sel_end..col].to_string(), base_style));
            }
            let cursor_char = line.chars().nth(col).unwrap_or(' ');
            spans.push(Span::styled(cursor_char.to_string(), cursor_style));
            if col + 1 < line_len {
                spans.push(Span::styled(line[col + 1..].to_string(), base_style));
            }
        } else {
            // Cursor inside selection
            // [before_selection] [selection_before_cursor] [cursor] [selection_after_cursor] [after_selection]
            if sel_start > 0 {
                spans.push(Span::styled(line[..sel_start].to_string(), base_style));
            }
            if sel_start < col {
                spans.push(Span::styled(line[sel_start..col].to_string(), selection_style));
            }
            let cursor_char = line.chars().nth(col).unwrap_or(' ');
            spans.push(Span::styled(cursor_char.to_string(), cursor_style));
            if col + 1 < sel_end {
                spans.push(Span::styled(line[col + 1..sel_end].to_string(), selection_style));
            }
            if sel_end < line_len {
                spans.push(Span::styled(line[sel_end..].to_string(), base_style));
            }
        }
    } else {
        // No cursor on this line, just selection
        if sel_start > 0 {
            spans.push(Span::styled(line[..sel_start].to_string(), base_style));
        }
        if sel_start < sel_end {
            spans.push(Span::styled(line[sel_start..sel_end].to_string(), selection_style));
        }
        if sel_end < line_len {
            spans.push(Span::styled(line[sel_end..].to_string(), base_style));
        }
    }

    Line::from(spans)
}

fn draw_status(f: &mut Frame, app: &App, area: Rect) {
    let text = match app.input_mode {
        InputMode::Normal => app.status.clone(),
        InputMode::Editing => format!("{}{}_", app.status, app.input),
        InputMode::NoteEditing => app.status.clone(),
        InputMode::PropertyEditing => format!("{}{}_", app.status, app.property_buffer),
    };

    let style = match app.input_mode {
        InputMode::Normal => app.theme.status_bar,
        InputMode::Editing => app.theme.status_bar_input,
        InputMode::NoteEditing => app.theme.status_bar_mode_note,
        InputMode::PropertyEditing => app.theme.status_bar_mode_meta,
    };

    let para = Paragraph::new(text).style(style);
    f.render_widget(para, area);
}

// =============================================================================
// Setup & Unlock Screens
// =============================================================================

fn centered_rect(width: u16, height: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length((r.height.saturating_sub(height)) / 2),
            Constraint::Length(height),
            Constraint::Min(0),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length((r.width.saturating_sub(width)) / 2),
            Constraint::Length(width),
            Constraint::Min(0),
        ])
        .split(popup_layout[1])[1]
}

fn draw_theme_popup(f: &mut Frame, app: &App) {
    let variants = ThemeVariant::all();
    let popup_height = (variants.len() + 4) as u16; // +4 for borders, title, padding
    let popup_width = 28;

    let area = centered_rect(popup_width, popup_height, f.area());

    // Clear area behind popup
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" Select Theme ")
        .borders(Borders::ALL)
        .border_style(app.theme.border_focus);

    let inner = block.inner(area);
    f.render_widget(block, area);

    let items: Vec<ListItem> = variants
        .iter()
        .enumerate()
        .map(|(i, variant)| {
            let is_selected = i == app.popup_selected;
            let is_current = *variant == app.theme.variant;

            let prefix = if is_current { "● " } else { "  " };
            let style = if is_selected {
                app.theme.list_selected_focus
            } else if is_current {
                app.theme.list_selected
            } else {
                app.theme.list_default
            };

            ListItem::new(format!("{}{}", prefix, variant.name())).style(style)
        })
        .collect();

    let list = List::new(items);
    f.render_widget(list, inner);
}

fn draw_setup(f: &mut Frame, app: &App) {
    match app.setup_state.phase {
        SetupPhase::Welcome => draw_setup_welcome(f, app),
        SetupPhase::ShowMnemonic => draw_setup_mnemonic(f, app),
        SetupPhase::VerifyMnemonic => draw_setup_verify(f, app),
        SetupPhase::EnterMnemonic => draw_setup_enter_mnemonic(f, app),
        SetupPhase::SetPassword => draw_setup_password(f, app, false),
        SetupPhase::ConfirmPassword => draw_setup_password(f, app, true),
        SetupPhase::Complete => draw_setup_complete(f, app),
    }
}

fn draw_setup_welcome(f: &mut Frame, app: &App) {
    let area = centered_rect(60, 14, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" SKELENOTE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(app.theme.tab_active.fg.unwrap_or(Color::White)));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let text = vec![
        Line::from(""),
        Line::from(Span::styled(
            "Welcome to Skelenote",
            Style::default().add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("Your notes will be protected with end-to-end"),
        Line::from("encryption using a recovery phrase."),
        Line::from(""),
        Line::from(vec![
            Span::styled("  [N]  ", Style::default().fg(Color::Cyan)),
            Span::raw("New Vault - Generate recovery phrase"),
        ]),
        Line::from(""),
        Line::from(vec![
            Span::styled("  [R]  ", Style::default().fg(Color::Cyan)),
            Span::raw("Restore - Enter existing recovery phrase"),
        ]),
        Line::from(""),
        Line::from(Span::styled(
            "  [Q]  Exit",
            Style::default().fg(Color::DarkGray),
        )),
    ];

    let para = Paragraph::new(text).alignment(Alignment::Center);
    f.render_widget(para, inner);
}

fn draw_setup_mnemonic(f: &mut Frame, app: &App) {
    let area = centered_rect(70, 20, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" WRITE DOWN YOUR RECOVERY PHRASE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Yellow));

    let inner = block.inner(area);
    f.render_widget(block, area);

    // Split mnemonic into words
    let words: Vec<&str> = app.setup_state.mnemonic.split_whitespace().collect();

    let mut lines = vec![
        Line::from(""),
        Line::from(Span::styled(
            "This is your recovery phrase. Write it on paper!",
            Style::default().fg(Color::Yellow),
        )),
        Line::from(""),
    ];

    // Display words in 4 columns, 6 rows
    for row in 0..6 {
        let mut spans = vec![Span::raw("  ")];
        for col in 0..4 {
            let idx = col * 6 + row;
            if idx < words.len() {
                spans.push(Span::styled(
                    format!("{:2}. {:12}", idx + 1, words[idx]),
                    Style::default().fg(Color::White),
                ));
            }
        }
        lines.push(Line::from(spans));
    }

    lines.push(Line::from(""));

    // Show copy status or copy hint
    if app.setup_state.copied_to_clipboard {
        lines.push(Line::from(Span::styled(
            "Copied to clipboard!",
            Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        )));
    } else {
        lines.push(Line::from(Span::styled(
            "[Y] Copy to clipboard",
            Style::default().fg(Color::DarkGray),
        )));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "Press [C] when you have saved it",
        Style::default().fg(Color::Cyan),
    )));

    if let Some(ref error) = app.setup_state.error {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            error.clone(),
            Style::default().fg(Color::Red),
        )));
    }

    let para = Paragraph::new(lines).alignment(Alignment::Center);
    f.render_widget(para, inner);
}

fn draw_setup_verify(f: &mut Frame, app: &App) {
    let area = centered_rect(50, 16, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" VERIFY YOUR RECOVERY PHRASE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let mut lines = vec![
        Line::from(""),
        Line::from("Enter the following words to confirm:"),
        Line::from(""),
    ];

    for (i, &idx) in app.setup_state.verify_indices.iter().enumerate() {
        let is_active = i == app.setup_state.verify_field;
        let answer = &app.setup_state.verify_answers[i];

        let prompt = format!("  Word #{}: ", idx);
        let input_style = if is_active {
            Style::default().fg(Color::Cyan).add_modifier(Modifier::UNDERLINED)
        } else {
            Style::default().fg(Color::White)
        };

        let display = if is_active {
            format!("{}_", answer)
        } else if answer.is_empty() {
            "________".to_string()
        } else {
            answer.clone()
        };

        lines.push(Line::from(vec![
            Span::raw(prompt),
            Span::styled(display, input_style),
        ]));
    }

    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "Tab: next field   Enter: submit",
        Style::default().fg(Color::DarkGray),
    )));

    if let Some(ref error) = app.setup_state.error {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            error.clone(),
            Style::default().fg(Color::Red),
        )));
    }

    let para = Paragraph::new(lines).alignment(Alignment::Left);
    f.render_widget(para, inner);
}

fn draw_setup_enter_mnemonic(f: &mut Frame, app: &App) {
    let area = centered_rect(70, 12, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" ENTER RECOVERY PHRASE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let word_count = app.setup_state.mnemonic_input.split_whitespace().count();

    let lines = vec![
        Line::from(""),
        Line::from("Enter your 24-word recovery phrase:"),
        Line::from(""),
        Line::from(Span::styled(
            format!("{}_", app.setup_state.mnemonic_input),
            Style::default().fg(Color::White),
        )),
        Line::from(""),
        Line::from(Span::styled(
            format!("Words: {}/24", word_count),
            if word_count == 24 {
                Style::default().fg(Color::Green)
            } else {
                Style::default().fg(Color::DarkGray)
            },
        )),
        Line::from(""),
        Line::from(Span::styled(
            "Enter: submit   Esc: back",
            Style::default().fg(Color::DarkGray),
        )),
    ];

    if let Some(ref error) = app.setup_state.error {
        let mut lines = lines;
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            error.clone(),
            Style::default().fg(Color::Red),
        )));
        let para = Paragraph::new(lines).alignment(Alignment::Center);
        f.render_widget(para, inner);
    } else {
        let para = Paragraph::new(lines).alignment(Alignment::Center);
        f.render_widget(para, inner);
    }
}

fn draw_setup_password(f: &mut Frame, app: &App, is_confirm: bool) {
    let area = centered_rect(50, 14, f.area());
    f.render_widget(Clear, area);

    let title = if is_confirm {
        " CONFIRM PASSWORD "
    } else {
        " CREATE MASTER PASSWORD "
    };

    let block = Block::default()
        .title(title)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let password = if is_confirm {
        &app.setup_state.password_confirm
    } else {
        &app.setup_state.password
    };

    let masked: String = "*".repeat(password.len());
    let strength = crypto::password_strength(if is_confirm {
        &app.setup_state.password
    } else {
        password
    });

    let strength_bar: String = "█".repeat(strength as usize * 2)
        + &"░".repeat(8 - strength as usize * 2);
    let strength_color = match strength {
        0 => Color::Red,
        1 => Color::Red,
        2 => Color::Yellow,
        3 => Color::Green,
        4 => Color::Cyan,
        _ => Color::White,
    };
    let strength_text = match strength {
        0 => "Very Weak",
        1 => "Weak",
        2 => "Fair",
        3 => "Good",
        4 => "Strong",
        _ => "",
    };

    let mut lines = vec![
        Line::from(""),
        Line::from(if is_confirm {
            "Re-enter your password:"
        } else {
            "This password unlocks your vault on each launch."
        }),
        Line::from(""),
        Line::from(vec![
            Span::raw("  Password: "),
            Span::styled(
                format!("{}|", masked),
                Style::default().fg(Color::White).add_modifier(Modifier::UNDERLINED),
            ),
        ]),
        Line::from(""),
    ];

    if !is_confirm {
        lines.push(Line::from(vec![
            Span::raw("  Strength: "),
            Span::styled(strength_bar, Style::default().fg(strength_color)),
            Span::raw(" "),
            Span::styled(strength_text, Style::default().fg(strength_color)),
        ]));
        lines.push(Line::from(""));
    }

    lines.push(Line::from(Span::styled(
        "Enter: continue   Esc: back",
        Style::default().fg(Color::DarkGray),
    )));

    if let Some(ref error) = app.setup_state.error {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            error.clone(),
            Style::default().fg(Color::Red),
        )));
    }

    let para = Paragraph::new(lines).alignment(Alignment::Center);
    f.render_widget(para, inner);
}

fn draw_setup_complete(f: &mut Frame, app: &App) {
    let area = centered_rect(50, 12, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" SETUP COMPLETE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Green));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let lines = vec![
        Line::from(""),
        Line::from(Span::styled(
            "Your vault is now encrypted!",
            Style::default().fg(Color::Green).add_modifier(Modifier::BOLD),
        )),
        Line::from(""),
        Line::from("Keep your recovery phrase safe."),
        Line::from("You'll need it if you forget your password."),
        Line::from(""),
        Line::from(Span::styled(
            "Press Enter to continue",
            Style::default().fg(Color::Cyan),
        )),
    ];

    let para = Paragraph::new(lines).alignment(Alignment::Center);
    f.render_widget(para, inner);
}

fn draw_unlock(f: &mut Frame, app: &App) {
    let area = centered_rect(50, 14, f.area());
    f.render_widget(Clear, area);

    let block = Block::default()
        .title(" SKELENOTE ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(app.theme.tab_active.fg.unwrap_or(Color::White)));

    let inner = block.inner(area);
    f.render_widget(block, area);

    let masked: String = "*".repeat(app.unlock_state.password.len());

    let mut lines = vec![
        Line::from(""),
        Line::from("Enter master password:"),
        Line::from(""),
        Line::from(Span::styled(
            format!("  {}|", masked),
            Style::default().fg(Color::White).add_modifier(Modifier::UNDERLINED),
        )),
        Line::from(""),
    ];

    // Show fingerprint if we can compute it (we can't until unlocked, so skip)
    lines.push(Line::from(Span::styled(
        "Enter: unlock   Esc: quit",
        Style::default().fg(Color::DarkGray),
    )));
    lines.push(Line::from(""));
    lines.push(Line::from(Span::styled(
        "[F] Forgot password (restore from recovery phrase)",
        Style::default().fg(Color::DarkGray),
    )));

    if let Some(ref error) = app.unlock_state.error {
        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            error.clone(),
            Style::default().fg(Color::Red),
        )));
    }

    let para = Paragraph::new(lines).alignment(Alignment::Center);
    f.render_widget(para, inner);
}
