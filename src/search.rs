//! Search filter parsing and types.

use chrono::NaiveDate;

/// Parsed search filters extracted from a query string.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct SearchFilters {
    /// Full-text search query (after removing filter prefixes)
    pub text_query: Option<String>,
    /// Tag filter: `tag:work` matches notes with #work tag
    pub tags: Vec<String>,
    /// Date range: `after:2025-01-01`
    pub after: Option<NaiveDate>,
    /// Date range: `before:2025-12-31`
    pub before: Option<NaiveDate>,
    /// Note ID filter: `id:550e8400` (partial match)
    pub id: Option<String>,
    /// Links TO filter: `links:note-id` finds notes that link to note-id
    pub links_to: Option<String>,
    /// Linked BY filter: `linkedby:note-id` finds notes linked from note-id
    pub linked_by: Option<String>,
    /// Fuzzy search mode: `~query`
    pub fuzzy: bool,
}

impl SearchFilters {
    /// Parse a query string into structured filters.
    ///
    /// Supported syntax:
    /// - `tag:foo` - filter by tag (case-insensitive)
    /// - `after:2025-01-01` - notes created/updated after date
    /// - `before:2025-12-31` - notes created/updated before date
    /// - `id:uuid` - filter by note ID (partial match)
    /// - `links:target` - notes that link TO target
    /// - `linkedby:source` - notes linked FROM source
    /// - `~query` or prefix with `~` - fuzzy search mode
    pub fn parse(query: &str) -> Self {
        let mut filters = SearchFilters::default();
        let mut text_parts = Vec::new();

        // Check for fuzzy prefix
        let query = if query.starts_with('~') {
            filters.fuzzy = true;
            query.trim_start_matches('~').trim()
        } else {
            query
        };

        for token in query.split_whitespace() {
            if let Some(tag) = token.strip_prefix("tag:") {
                if !tag.is_empty() {
                    filters.tags.push(tag.to_lowercase());
                }
            } else if let Some(date_str) = token.strip_prefix("after:") {
                if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                    filters.after = Some(date);
                }
            } else if let Some(date_str) = token.strip_prefix("before:") {
                if let Ok(date) = NaiveDate::parse_from_str(date_str, "%Y-%m-%d") {
                    filters.before = Some(date);
                }
            } else if let Some(id) = token.strip_prefix("id:") {
                if !id.is_empty() {
                    filters.id = Some(id.to_string());
                }
            } else if let Some(target) = token.strip_prefix("links:") {
                if !target.is_empty() {
                    filters.links_to = Some(target.to_string());
                }
            } else if let Some(source) = token.strip_prefix("linkedby:") {
                if !source.is_empty() {
                    filters.linked_by = Some(source.to_string());
                }
            } else if token.starts_with('~') {
                // Inline fuzzy toggle
                filters.fuzzy = true;
                let rest = token.trim_start_matches('~');
                if !rest.is_empty() {
                    text_parts.push(rest.to_string());
                }
            } else {
                text_parts.push(token.to_string());
            }
        }

        if !text_parts.is_empty() {
            filters.text_query = Some(text_parts.join(" "));
        }

        filters
    }

    /// Returns true if any filter is active (not just text search).
    pub fn has_filters(&self) -> bool {
        !self.tags.is_empty()
            || self.after.is_some()
            || self.before.is_some()
            || self.id.is_some()
            || self.links_to.is_some()
            || self.linked_by.is_some()
    }

    /// Returns true if this is a fuzzy search.
    pub fn is_fuzzy(&self) -> bool {
        self.fuzzy
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_query() {
        let filters = SearchFilters::parse("hello world");
        assert_eq!(filters.text_query, Some("hello world".to_string()));
        assert!(!filters.has_filters());
    }

    #[test]
    fn test_parse_tag_filter() {
        let filters = SearchFilters::parse("tag:work meeting notes");
        assert_eq!(filters.tags, vec!["work"]);
        assert_eq!(filters.text_query, Some("meeting notes".to_string()));
    }

    #[test]
    fn test_parse_multiple_tags() {
        let filters = SearchFilters::parse("tag:work tag:urgent");
        assert_eq!(filters.tags, vec!["work", "urgent"]);
        assert!(filters.text_query.is_none());
    }

    #[test]
    fn test_parse_date_range() {
        let filters = SearchFilters::parse("after:2025-01-01 before:2025-12-31 notes");
        assert_eq!(
            filters.after,
            Some(NaiveDate::from_ymd_opt(2025, 1, 1).unwrap())
        );
        assert_eq!(
            filters.before,
            Some(NaiveDate::from_ymd_opt(2025, 12, 31).unwrap())
        );
        assert_eq!(filters.text_query, Some("notes".to_string()));
    }

    #[test]
    fn test_parse_id_filter() {
        let filters = SearchFilters::parse("id:550e8400");
        assert_eq!(filters.id, Some("550e8400".to_string()));
    }

    #[test]
    fn test_parse_backlink_filters() {
        let filters = SearchFilters::parse("links:my-note");
        assert_eq!(filters.links_to, Some("my-note".to_string()));

        let filters = SearchFilters::parse("linkedby:source-note");
        assert_eq!(filters.linked_by, Some("source-note".to_string()));
    }

    #[test]
    fn test_parse_fuzzy_prefix() {
        let filters = SearchFilters::parse("~notes");
        assert!(filters.fuzzy);
        assert_eq!(filters.text_query, Some("notes".to_string()));
    }

    #[test]
    fn test_parse_fuzzy_with_filters() {
        let filters = SearchFilters::parse("~tag:work meeting");
        assert!(filters.fuzzy);
        assert_eq!(filters.tags, vec!["work"]);
        assert_eq!(filters.text_query, Some("meeting".to_string()));
    }

    #[test]
    fn test_parse_invalid_date_ignored() {
        let filters = SearchFilters::parse("after:not-a-date notes");
        assert!(filters.after.is_none());
        assert_eq!(filters.text_query, Some("notes".to_string()));
    }

    #[test]
    fn test_parse_empty_prefix_ignored() {
        let filters = SearchFilters::parse("tag: id: notes");
        assert!(filters.tags.is_empty());
        assert!(filters.id.is_none());
        assert_eq!(filters.text_query, Some("notes".to_string()));
    }
}
