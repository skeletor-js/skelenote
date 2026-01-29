//! Note representation and parsing

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// A note with parsed frontmatter and content
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Note {
    /// File path relative to vault root
    pub path: PathBuf,

    /// Parsed frontmatter
    pub frontmatter: Frontmatter,

    /// Raw markdown content (after frontmatter)
    pub content: String,

    /// File modification time
    pub modified: DateTime<Utc>,
}

/// YAML frontmatter structure
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Frontmatter {
    /// Note ID (auto-generated if missing)
    #[serde(default)]
    pub id: Option<String>,

    /// Note title
    pub title: Option<String>,

    /// Tags
    #[serde(default)]
    pub tags: Vec<String>,

    /// Created timestamp
    pub created: Option<DateTime<Utc>>,

    /// Updated timestamp
    pub updated: Option<DateTime<Utc>>,

    /// Any additional properties (extensible)
    #[serde(flatten)]
    pub extra: std::collections::HashMap<String, serde_yaml::Value>,
}

impl Note {
    /// Parse a note from file content
    pub fn parse(path: &Path, content: &str, modified: DateTime<Utc>) -> anyhow::Result<Self> {
        let (frontmatter, body) = parse_frontmatter(content)?;

        Ok(Self {
            path: path.to_path_buf(),
            frontmatter,
            content: body.to_string(),
            modified,
        })
    }

    /// Read a note from disk
    pub fn read(vault_root: &Path, path: &Path) -> anyhow::Result<Self> {
        let full_path = vault_root.join(path);
        let content = std::fs::read_to_string(&full_path)?;
        let metadata = std::fs::metadata(&full_path)?;
        let modified = metadata.modified()?.into();

        Self::parse(path, &content, modified)
    }

    /// Write the note back to disk
    pub fn write(&self, vault_root: &Path) -> anyhow::Result<()> {
        let full_path = vault_root.join(&self.path);

        // Ensure parent directory exists
        if let Some(parent) = full_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let content = self.to_markdown();
        std::fs::write(full_path, content)?;
        Ok(())
    }

    /// Convert back to markdown with frontmatter
    pub fn to_markdown(&self) -> String {
        let yaml = serde_yaml::to_string(&self.frontmatter).unwrap_or_default();
        format!("---\n{}---\n\n{}", yaml, self.content)
    }

    /// Get the title, falling back to filename
    pub fn title(&self) -> String {
        self.frontmatter
            .title
            .clone()
            .or_else(|| {
                self.path
                    .file_stem()
                    .map(|s| s.to_string_lossy().to_string())
            })
            .unwrap_or_else(|| "Untitled".to_string())
    }

    /// Extract all wikilinks from content
    pub fn wikilinks(&self) -> Vec<String> {
        extract_wikilinks(&self.content)
    }
}

/// Parse YAML frontmatter from markdown
pub fn parse_frontmatter(content: &str) -> anyhow::Result<(Frontmatter, &str)> {
    let content = content.trim_start();

    if !content.starts_with("---") {
        return Ok((Frontmatter::default(), content));
    }

    // Find closing ---
    let after_opening = &content[3..];
    let Some(end_idx) = after_opening.find("\n---") else {
        return Ok((Frontmatter::default(), content));
    };

    let yaml_content = &after_opening[..end_idx];
    let body_start = 3 + end_idx + 4; // Opening --- + content + \n---
    let body = content.get(body_start..).unwrap_or("").trim_start();

    let frontmatter: Frontmatter = serde_yaml::from_str(yaml_content).unwrap_or_default();

    Ok((frontmatter, body))
}

/// Extract [[wikilinks]] from markdown content
fn extract_wikilinks(content: &str) -> Vec<String> {
    let mut links = Vec::new();
    let mut remaining = content;

    while let Some(start) = remaining.find("[[") {
        remaining = &remaining[start + 2..];
        if let Some(end) = remaining.find("]]") {
            let link_content = &remaining[..end];
            // Handle [[link|alias]] format - take part before |
            let link = link_content.split('|').next().unwrap_or(link_content);
            if !link.is_empty() {
                links.push(link.to_string());
            }
            remaining = &remaining[end + 2..];
        } else {
            break;
        }
    }

    links
}

/// Search result
#[derive(Debug, Clone)]
pub struct SearchResult {
    pub path: PathBuf,
    pub title: String,
    pub snippet: Option<String>,
    pub score: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_frontmatter() {
        let content = r#"---
title: Test Note
tags: [rust, notes]
---

# Hello World

Some content here."#;

        let (fm, body) = parse_frontmatter(content).unwrap();
        assert_eq!(fm.title, Some("Test Note".to_string()));
        assert_eq!(fm.tags, vec!["rust", "notes"]);
        assert!(body.starts_with("# Hello World"));
    }

    #[test]
    fn test_extract_wikilinks() {
        let content = "See [[projects/skelenote]] and [[daily/2026-01-28|today]]";
        let links = extract_wikilinks(content);
        assert_eq!(links, vec!["projects/skelenote", "daily/2026-01-28"]);
    }

    #[test]
    fn test_simplified_frontmatter() {
        let content = r#"---
id: abc-123
title: Test Note
tags: [rust, notes]
created: 2026-01-28T12:00:00Z
updated: 2026-01-28T13:00:00Z
custom_field: value
---

Content here."#;

        let (fm, _body) = parse_frontmatter(content).unwrap();
        assert_eq!(fm.id, Some("abc-123".to_string()));
        assert_eq!(fm.title, Some("Test Note".to_string()));
        assert_eq!(fm.tags, vec!["rust", "notes"]);
        assert!(fm.created.is_some());
        assert!(fm.updated.is_some());
        // Custom field should be in extra
        assert!(fm.extra.contains_key("custom_field"));
    }

    #[test]
    fn test_auto_generate_id() {
        let content = r#"---
title: No ID Note
---

Content."#;

        let (fm, _) = parse_frontmatter(content).unwrap();
        // ID should be None from parsing (generation happens at vault creation/reindex)
        assert!(fm.id.is_none());
    }
}
