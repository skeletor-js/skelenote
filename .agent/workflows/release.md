---
description: Bump version, tag, and trigger release workflow
---

# Release Skill

Creates a new release by bumping versions, creating a tag, and triggering CI.

## Information Needed

1. **Version bump type**: patch, minor, or major
   - patch: 0.1.0 → 0.1.1 (bug fixes)
   - minor: 0.1.0 → 0.2.0 (new features)
   - major: 0.1.0 → 1.0.0 (breaking changes)

## Steps

1. Get current version from package.json:
```bash
grep '"version"' package.json
```

2. Calculate new version based on bump type.

3. Update version in both files:
   - `package.json`
   - `src-tauri/tauri.conf.json`

4. Commit the version bump:
```bash
git add package.json src-tauri/tauri.conf.json
git commit -m "chore: bump version to X.X.X"
```

5. Create git tag:
```bash
git tag vX.X.X
```

6. Push with tags:
```bash
git push origin main --tags
```

7. Report the release URL where GitHub Actions will create the draft.

## What Happens Automatically

Once the tag is pushed, `.github/workflows/release.yml` will:
1. Build for all platforms (macOS ARM/Intel, Windows, Linux)
2. Create a draft release on GitHub
3. Attach all binaries to the release

## Example Output

```
Current version: 0.1.0-alpha.1
Bump type: patch
New version: 0.1.0-alpha.2

✓ Updated package.json
✓ Updated src-tauri/tauri.conf.json
✓ Committed: chore: bump version to 0.1.0-alpha.2
✓ Tagged: v0.1.0-alpha.2
✓ Pushed to main with tags

GitHub Actions is now building the release.
Draft will appear at: https://github.com/skeletor-js/skelenote/releases

Next steps:
1. Wait for builds to complete (~15-20 min)
2. Edit the draft release notes
3. Publish when ready
```

## Version File Locations

### package.json
```json
{
  "name": "skelenote",
  "version": "0.1.0-alpha.1",
  ...
}
```

### src-tauri/tauri.conf.json
```json
{
  "version": "0.1.0-alpha.1",
  ...
}
```

## Pre-release Versions

For alpha/beta releases, include the suffix:
- `0.1.0-alpha.1` → `0.1.0-alpha.2`
- `0.1.0-beta.3` → `0.1.0-beta.4`

When ready for stable:
- `0.1.0-beta.5` → `0.1.0`

## Prerequisites

- Must be on main branch
- Working directory must be clean (no uncommitted changes)
- CI tests should be passing

## Notes

- Always run `/check` before releasing
- Review changelog before publishing draft
- Binaries are unsigned in alpha (expect security warnings)
- Release notes can be edited on GitHub before publishing
