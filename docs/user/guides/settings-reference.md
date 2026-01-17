# Settings Reference

Access settings via `Cmd+,` (macOS) or `Ctrl+,` (Windows/Linux), or through the command palette (`Cmd+K` then type "settings").

---

## Account

Manage your Skeleton Key and identity.

### View Skeleton Key

Shows your 24-word Skeleton Key mnemonic. This is your master encryption key.

**Warning:** Anyone with your Skeleton Key has full access to your data. Store it securely.

### QR Code *(Coming in v0.3)*

Generate a QR code for secure device pairing without exposing your Skeleton Key.

### Clear Skeleton Key

Removes your Skeleton Key from this device. You'll need to re-enter it to access your data.

---

## Sync

Configure how your data syncs between devices.

### Campfire (Local P2P)

Sync with devices on your local network without any server.

**Settings:**

- **Enable Campfire** - Turn local sync on/off
- **Device Name** - How this device appears to others
- **Auto-connect** - Automatically connect to discovered devices

See [Campfire Guide](campfire-guide.md) for detailed setup.

### Cloud Relay

Sync through an optional relay server for remote devices.

**Settings:**

- **Enable Cloud Sync** - Connect to relay server
- **Server URL** - Relay server address (default or self-hosted)
- **Connection Status** - Shows connected/disconnected state

See [Cloud Sync Guide](cloud-sync-guide.md) for server setup.

### Device Management

View and manage devices connected to your vault.

- **This Device** - Your current device info
- **Connected Devices** - List of synced devices
- **Revoke Device** - Remove a device's access (requires confirmation)

---

## Appearance

Customize the visual interface.

### Theme

Toggle between Light and Dark mode. Both themes use the warm color palette optimized for focus.

### Density

Adjust spacing between elements:

- **Comfortable** - More whitespace
- **Compact** - Higher density, more content visible

---

## Search

Configure semantic (AI-powered) search.

### Enable Semantic Search

Find conceptually similar content, not just keyword matches.

**Requirements:**

- One-time 23MB model download
- ~500MB RAM when active
- Works offline after setup

### Similarity Threshold

How closely related results must be:

| Setting | Threshold | Use Case |
|---------|-----------|----------|
| Broad | 15% | Cast a wide net, find loosely related content |
| Balanced | 20% | Default, good mix of relevance and coverage |
| Strict | 35% | Only highly relevant results |
| Very Strict | 50% | Only near-exact matches |

### Rebuild Index

Refreshes the search index. Use if:

- Search quality degrades
- After importing many objects
- After bulk edits

---

## Templates

Manage reusable object templates.

### Template List

View all templates you've created.

### Create Template

Make any object into a reusable template:

1. Open the object
2. Use `Cmd+Shift+T` or the object menu
3. Name your template

### Apply Template

When creating a new object:

1. Press `Cmd+N`
2. Select object type
3. Choose "From template"
4. Pick your template

---

## Data

Export, import, and backup options.

### Import

Bring data from other tools into Skelenote.

**Supported Sources:**

| Source | Description |
|--------|-------------|
| **Notion** | Connect via API, import databases with type mapping |
| **Obsidian** | Import vault folder with wiki-links and hashtags |
| **Markdown** | Import individual .md files with frontmatter |

Click **Import** to launch the import wizard, which guides you through source selection, configuration, and preview.

See [Export & Import Guide](export-import.md) for detailed instructions.

### Export All

Create a ZIP archive of all your objects as Markdown files.

**Options:**

- **Organize by type** - Creates folders for each object type
- **Include archived** - Includes archived objects in export

**Format:**

- Each object becomes a `.md` file
- Properties stored as YAML frontmatter
- Mentions converted to `[[wiki-links]]`
- Compatible with Obsidian and other tools

See [Export & Import Guide](export-import.md) for details.

---

## About

App information and links.

- **Version** - Current app version
- **Check for Updates** - See if updates are available
- **Documentation** - Links to guides
- **Report Issue** - Link to issue tracker

---

## Danger Zone

Destructive actions that cannot be undone.

### Remove Semantic Search

Deletes the search model and index:

- Frees ~500MB disk space
- Removes all indexed vectors
- Can be re-enabled later (requires re-download)

### Clear All Data

**Warning:** This permanently deletes everything:

- All objects (notes, tasks, projects, etc.)
- All content
- All sync history
- Your Skeleton Key remains intact

### Factory Reset

Complete reset to fresh install state:

- Clears all data
- Removes Skeleton Key
- Clears all settings
- You'll see the onboarding flow again

---

## Tips

### Quick Access

- `Cmd+,` opens settings instantly
- Settings are also in the command palette (`Cmd+K`)

### Sync Status

Watch the sync indicator in the sidebar:

- Green dot = connected
- Orange dot = syncing
- Red dot = error
- Gray = offline

### Backup Strategy

We recommend:

1. Export weekly via Data settings
2. Store exports in cloud storage (iCloud, Dropbox, etc.)
3. Keep your Skeleton Key in a password manager
