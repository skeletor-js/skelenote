//! Task detection and management
//!
//! Scans markdown files for inline tasks:
//! - [ ] uncompleted
//! - [x] completed
//! - [/] in-progress
//!
//! Optional metadata:
//! @due(YYYY-MM-DD) @priority(high) @project(name) @recurrence(daily)

use chrono::NaiveDate;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::LazyLock;

/// A task extracted from a markdown file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    /// Source file path
    pub source: PathBuf,

    /// Line number in source file (1-indexed)
    pub line: usize,

    /// Task text (without checkbox)
    pub text: String,

    /// Is the task completed?
    pub done: bool,

    /// Is the task in-progress?
    pub in_progress: bool,

    /// Due date if present
    pub due: Option<NaiveDate>,

    /// Priority if present
    pub priority: Option<Priority>,

    /// Project if present
    pub project: Option<String>,

    /// Area if present
    pub area: Option<String>,

    /// Recurrence pattern if present
    pub recurrence: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Urgent,
    High,
    Medium,
    Low,
}

impl Priority {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "urgent" => Some(Self::Urgent),
            "high" => Some(Self::High),
            "medium" | "med" => Some(Self::Medium),
            "low" => Some(Self::Low),
            _ => None,
        }
    }

    pub fn sort_order(&self) -> u8 {
        match self {
            Priority::Urgent => 4,
            Priority::High => 3,
            Priority::Medium => 2,
            Priority::Low => 1,
        }
    }
}

// Regex patterns
static TASK_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"^(\s*)-\s*\[([ xX/])\]\s*(.+)$").unwrap()
});

static DUE_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@due\((\d{4}-\d{2}-\d{2})\)").unwrap()
});

static PRIORITY_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@priority\((\w+)\)").unwrap()
});

static PROJECT_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@project\(([^)]+)\)").unwrap()
});

static AREA_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@area\(([^)]+)\)").unwrap()
});

static RECURRENCE_PATTERN: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"@recurrence\(([^)]+)\)").unwrap()
});

impl Task {
    /// Extract all tasks from markdown content
    pub fn extract_from_content(source: &PathBuf, content: &str) -> Vec<Self> {
        content
            .lines()
            .enumerate()
            .filter_map(|(idx, line)| Self::parse_line(source.clone(), idx + 1, line))
            .collect()
    }

    /// Parse a single line as a task
    fn parse_line(source: PathBuf, line: usize, text: &str) -> Option<Self> {
        let caps = TASK_PATTERN.captures(text)?;

        let checkbox = caps.get(2)?.as_str();
        let done = checkbox == "x" || checkbox == "X";
        let in_progress = checkbox == "/";

        let content = caps.get(3)?.as_str();

        // Extract metadata
        let due = DUE_PATTERN.captures(content).and_then(|c| {
            c.get(1)
                .and_then(|m| NaiveDate::parse_from_str(m.as_str(), "%Y-%m-%d").ok())
        });

        let priority = PRIORITY_PATTERN
            .captures(content)
            .and_then(|c| c.get(1).and_then(|m| Priority::from_str(m.as_str())));

        let project = PROJECT_PATTERN
            .captures(content)
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

        let area = AREA_PATTERN
            .captures(content)
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

        let recurrence = RECURRENCE_PATTERN
            .captures(content)
            .and_then(|c| c.get(1).map(|m| m.as_str().to_string()));

        // Clean text by removing metadata tags
        let clean_text = content
            .split_whitespace()
            .filter(|word| {
                !word.starts_with("@due(")
                    && !word.starts_with("@priority(")
                    && !word.starts_with("@project(")
                    && !word.starts_with("@area(")
                    && !word.starts_with("@recurrence(")
            })
            .collect::<Vec<_>>()
            .join(" ");

        Some(Self {
            source,
            line,
            text: clean_text,
            done,
            in_progress,
            due,
            priority,
            project,
            area,
            recurrence,
        })
    }

    /// Toggle task completion in file content
    pub fn toggle_in_content(content: &str, line: usize) -> String {
        content
            .lines()
            .enumerate()
            .map(|(idx, l)| {
                if idx + 1 == line {
                    if l.contains("- [ ]") {
                        l.replace("- [ ]", "- [x]")
                    } else if l.contains("- [x]") || l.contains("- [X]") {
                        l.replacen("- [x]", "- [ ]", 1).replacen("- [X]", "- [ ]", 1)
                    } else if l.contains("- [/]") {
                        l.replace("- [/]", "- [x]")
                    } else {
                        l.to_string()
                    }
                } else {
                    l.to_string()
                }
            })
            .collect::<Vec<_>>()
            .join("\n")
    }
}

/// Task filter for querying
#[derive(Debug, Clone, Default)]
pub struct TaskFilter {
    pub status: Option<TaskStatus>,
    pub due_filter: Option<DueFilter>,
    pub priority: Option<Priority>,
    pub project: Option<String>,
    pub area: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub enum TaskStatus {
    Todo,
    Done,
    InProgress,
    All,
}

#[derive(Debug, Clone, Copy)]
pub enum DueFilter {
    Today,
    ThisWeek,
    Overdue,
    Upcoming,
}

impl TaskFilter {
    pub fn from_string(filter: &str) -> Self {
        match filter.to_lowercase().as_str() {
            "today" => Self {
                status: Some(TaskStatus::Todo),
                due_filter: Some(DueFilter::Today),
                ..Default::default()
            },
            "week" => Self {
                status: Some(TaskStatus::Todo),
                due_filter: Some(DueFilter::ThisWeek),
                ..Default::default()
            },
            "overdue" => Self {
                status: Some(TaskStatus::Todo),
                due_filter: Some(DueFilter::Overdue),
                ..Default::default()
            },
            "done" => Self {
                status: Some(TaskStatus::Done),
                ..Default::default()
            },
            "all" => Self::default(),
            _ => Self::default(),
        }
    }

    pub fn matches(&self, task: &Task, today: NaiveDate) -> bool {
        // Status filter
        if let Some(status) = &self.status {
            let matches = match status {
                TaskStatus::Todo => !task.done && !task.in_progress,
                TaskStatus::Done => task.done,
                TaskStatus::InProgress => task.in_progress,
                TaskStatus::All => true,
            };
            if !matches {
                return false;
            }
        }

        // Due filter
        if let Some(due_filter) = &self.due_filter {
            let due_matches = match (due_filter, task.due) {
                (DueFilter::Today, Some(due)) => due == today,
                (DueFilter::Today, None) => false,
                (DueFilter::ThisWeek, Some(due)) => {
                    let week_end = today + chrono::Duration::days(7);
                    due >= today && due <= week_end
                }
                (DueFilter::ThisWeek, None) => false,
                (DueFilter::Overdue, Some(due)) => due < today,
                (DueFilter::Overdue, None) => false,
                (DueFilter::Upcoming, Some(due)) => due > today,
                (DueFilter::Upcoming, None) => true, // No due = eventually
            };
            if !due_matches {
                return false;
            }
        }

        // Priority filter
        if let Some(priority) = &self.priority {
            if task.priority.as_ref() != Some(priority) {
                return false;
            }
        }

        // Project filter
        if let Some(project) = &self.project {
            if task.project.as_ref() != Some(project) {
                return false;
            }
        }

        // Area filter
        if let Some(area) = &self.area {
            if task.area.as_ref() != Some(area) {
                return false;
            }
        }

        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_tasks() {
        let content = r#"
# My Note

- [ ] Buy groceries @due(2026-01-30) @priority(high)
- [x] Completed task
- [/] In progress task
- [ ] Simple task
        "#;

        let tasks = Task::extract_from_content(&PathBuf::from("test.md"), content);
        assert_eq!(tasks.len(), 4);

        assert_eq!(tasks[0].text, "Buy groceries");
        assert!(!tasks[0].done);
        assert_eq!(tasks[0].priority, Some(Priority::High));

        assert!(tasks[1].done);
        assert!(tasks[2].in_progress);
    }

    #[test]
    fn test_toggle_task() {
        let content = "- [ ] Task 1\n- [x] Task 2\n- [/] Task 3";
        let toggled = Task::toggle_in_content(content, 1);
        assert!(toggled.starts_with("- [x] Task 1"));
    }
}
