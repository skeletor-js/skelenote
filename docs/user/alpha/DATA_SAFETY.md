# Data Safety & Recovery

Your data is safe during alpha. This guide explains how Skelenote protects your data and how to back it up.

---

## Your Data Will Persist

**Alpha updates will NOT delete your data.**

Skelenote uses [Loro CRDT](https://loro.dev/) for data storage, which maintains backwards compatibility. When you update to a new version:

- Your existing objects remain intact
- Your Skeleton Key continues to work
- Sync connections resume automatically

We test every release against existing vaults before publishing.

---

## Where Your Data Lives

### Data File Locations

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/com.skelenote.app/data/` |
| Windows | `%APPDATA%\com.skelenote.app\data\` |
| Linux | `~/.local/share/com.skelenote.app/data/` |

**Key files**:

- `store.loro` - Your entire vault (encrypted CRDT document)
- `skeleton_key.enc` - Your encrypted master key

### Skeleton Key Storage

Your Skeleton Key is stored in your operating system's secure keychain:

- **macOS**: Keychain Access
- **Windows**: Credential Manager
- **Linux**: Secret Service (GNOME Keyring, KWallet)

---

## How to Back Up Your Vault

### Quick Backup (Copy the Data Folder)

The simplest backup is copying your entire data folder:

**macOS**:

```bash
cp -r ~/Library/Application\ Support/com.skelenote.app/data/ ~/Desktop/skelenote-backup-$(date +%Y%m%d)
```

**Windows** (PowerShell):

```powershell
Copy-Item -Recurse "$env:APPDATA\com.skelenote.app\data" "$env:USERPROFILE\Desktop\skelenote-backup-$(Get-Date -Format yyyyMMdd)"
```

**Linux**:

```bash
cp -r ~/.local/share/com.skelenote.app/data/ ~/skelenote-backup-$(date +%Y%m%d)
```

### Export to Markdown

For a human-readable backup:

1. Go to **Settings > Data > Export All**
2. Save the ZIP file somewhere safe
3. The ZIP contains organized Markdown files with YAML frontmatter

This backup is NOT encrypted - store it securely.

### Cloud Storage Recommendations

You can sync your data folder to cloud storage for automatic backups:

| Service | Notes |
|---------|-------|
| iCloud Drive | Works well on macOS, automatic |
| Dropbox | Cross-platform, versioning |
| Google Drive | Cross-platform |
| Syncthing | Self-hosted, no cloud |

**Important**: The `store.loro` file is already encrypted. Cloud storage adds convenience, not security.

---

## How to Restore from Backup

### From Data Folder Backup

1. Close Skelenote completely
2. Navigate to your data folder (see locations above)
3. Replace `store.loro` with your backup copy
4. Restart Skelenote

Your Skeleton Key is stored separately in the system keychain, so it will still work.

### From Markdown Export

Use the import wizard to restore from Markdown exports:

1. Open Settings → Data → Import
2. Select **Markdown Files**
3. Choose your exported `.md` files
4. Review and import

See [Export & Import Guide](../guides/export-import.md) for details.

---

## Emergency Recovery

### "I updated and something broke"

1. **Don't panic** - your data file is likely fine
2. Check [Known Issues](./KNOWN_ISSUES.md) for the new version
3. Try restarting the app
4. If the app won't launch, your data is still safe in the data folder
5. Report the issue on [Linear](https://linear.app/skeletorjs/team/skelenote) or [Discord](https://discord.gg/4apsgSRB7D)

### "I think I lost data"

Before panicking:

1. **Check Inbox** - new items go there first
2. **Check Archive** - items may be archived, not deleted
3. **Search** - use Cmd/Ctrl+K to search all objects

If data is truly missing:

1. Check if you have a backup
2. If using sync, check other devices - data may still be there
3. Report the issue immediately with details about what's missing

### "My Skeleton Key isn't working"

1. Verify you're entering the correct 24 words
2. Check for typos - words must match exactly (lowercase)
3. Ensure no extra spaces between words
4. If you have the app working on another device, your key is correct

**If you've lost your Skeleton Key entirely**, data is unrecoverable. This is by design for security.

---

## Best Practices

### Regular Backups

- **Weekly**: Copy your data folder to an external drive or cloud storage
- **Before updates**: Back up before installing new versions (extra cautious)
- **After major work**: Back up after creating lots of important content

### Multiple Devices

Using Skelenote on multiple devices via sync is itself a form of backup. If one device fails, others have copies of your data.

### Test Your Backups

Periodically verify your backups work:

1. Copy `store.loro` to a temporary location
2. Install Skelenote on a fresh system (or VM)
3. Place the backup file in the data folder
4. Verify you can unlock and see your data

---

## What We're Improving

Planned features for better data safety:

- [ ] In-app backup/restore UI
- [ ] Automatic local backups with rotation
- [ ] Backup integrity verification
- [ ] Full Markdown import
- [ ] Version history / time travel UI

---

## Questions?

- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Discord](https://discord.gg/4apsgSRB7D)
- [Report an Issue](https://linear.app/skeletorjs/team/skelenote)
