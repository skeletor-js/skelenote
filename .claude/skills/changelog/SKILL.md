---
name: changelog
description: Generate changelog from commits since last release
---

# Changelog Skill

Generates a formatted changelog from commits since the last version tag.

## Steps

1. Get the last version tag:
```bash
git describe --tags --abbrev=0
```

2. Get all commits since that tag:
```bash
git log <last-tag>..HEAD --oneline
```

3. Parse commits by type (feat, fix, refactor, etc.)

4. Generate formatted changelog.

## Output Format

```markdown
## [X.X.X] - YYYY-MM-DD

### ✨ Features
- feat: description (#PR)

### 🐛 Bug Fixes  
- fix: description (#PR)

### ♻️ Refactoring
- refactor: description

### 📚 Documentation
- docs: description

### 🔧 Maintenance
- chore: description
```

## Example Output

```markdown
## [0.1.0-alpha.2] - 2024-01-15

### ✨ Features
- feat: add task priority filtering
- feat: implement weekly recurrence for tasks
- feat: add Time Machine view for historical notes

### 🐛 Bug Fixes
- fix: dark mode calendar readability issue
- fix: daily note template not applying correctly

### ♻️ Refactoring
- refactor: simplify sync state machine

### 📚 Documentation
- docs: update getting started guide
- docs: add CI/CD documentation

### 🔧 Maintenance
- chore: update dependencies
- chore: configure ESLint rules
```

## Commit Type Mapping

| Prefix | Category | Emoji |
|--------|----------|-------|
| feat | Features | ✨ |
| fix | Bug Fixes | 🐛 |
| refactor | Refactoring | ♻️ |
| docs | Documentation | 📚 |
| chore | Maintenance | 🔧 |
| test | Testing | 🧪 |
| style | Styling | 💄 |
| perf | Performance | ⚡ |

## Usage Patterns

### Before Release
```
/changelog
# Review the output
# Copy to release notes
/release minor
```

### Append to CHANGELOG.md
If maintaining a CHANGELOG.md file, prepend the generated content.

## Notes

- Groups commits by type for easy scanning
- Excludes merge commits and version bumps
- Can be edited before publishing release
- Consider adding PR links if available
- Breaking changes should be highlighted at the top

## Breaking Changes

If a commit message contains `BREAKING CHANGE:` in the body, highlight it:

```markdown
### ⚠️ Breaking Changes
- feat!: change API for task recurrence
  - Migration: Update any code using `recurrence.pattern` to `recurrence.frequency`
```
