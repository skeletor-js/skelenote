# Sharing Your Vault

There are several ways to share your Skelenote data with others or access it across devices. This guide explains when to use each method.

---

## Sharing Methods Compared

| Method | Use Case | What's Shared | Security |
|--------|----------|---------------|----------|
| **Skeleton Key** | Multi-device sync | Full vault, real-time | Same identity, encrypted |
| **Export** | Backup, migration | Static snapshot | Unencrypted Markdown |
| **Hearth** | Real-time collab | Full vault, live sync | Same network only |

---

## Skeleton Key Sharing

Share your 24-word Skeleton Key to access your vault on another device.

### When to Use

- Setting up Skelenote on a new device
- Accessing your vault from multiple computers
- Restoring after device loss

### How to Share Safely

Your Skeleton Key is the master key to all your encrypted data. Share it carefully:

**Recommended methods:**

1. **In person** - Read words aloud or show screen briefly
2. **Encrypted messaging** - Signal, iMessage, or other E2E encrypted apps
3. **QR code scan** - Show QR during setup for quick entry

**Avoid:**

- Email (often unencrypted)
- SMS text messages
- Writing on paper left unsecured
- Sharing via cloud documents

### What Happens

When you enter the same Skeleton Key on another device:

1. Both devices share the same User ID
2. All data syncs automatically via Courier or Hearth
3. Changes on either device appear on both

> **Important:** Anyone with your Skeleton Key has full access to your vault. Only share with people you trust completely.

---

## Export Sharing

Export creates a static snapshot of your data as Markdown files.

### When to Use

- Creating offline backups
- Migrating to another tool (Obsidian, etc.)
- Sharing specific objects without sync access
- Archiving data long-term

### How to Export

1. Open Settings (`Cmd+,`)
2. Go to **Data** section
3. Click **Export All**
4. Choose save location
5. Share the resulting ZIP file

### What's Included

- All objects as `.md` files
- YAML frontmatter with properties
- Wiki-links for relationships
- Organized by type (optional)

### What's NOT Included

- Encryption (files are plain text)
- Real-time updates
- Your Skeleton Key

See the [Export & Import Guide](export-import.md) for detailed export options.

---

## Hearth Sharing

Hearth enables real-time sync between devices on the same local network.

### When to Use

- Collaborating with others in the same room
- Syncing between your devices at home
- Working without internet connection

### How It Works

1. All devices must be on the same Wi-Fi network
2. Each device runs Skelenote with the same Skeleton Key
3. mDNS discovery finds other devices automatically
4. Changes sync instantly over local connection

### Security

- Data is encrypted in transit (same as relay sync)
- Only devices with matching Skeleton Key can sync
- Works entirely on local network - no internet needed

See the [Local Sync Guide](local-sync-guide.md) for setup instructions.

---

## Choosing the Right Method

### "I want to use Skelenote on my laptop and desktop"

→ **Skeleton Key sharing** - Enter your 24 words on the second device. Both will sync automatically.

### "I want to give someone a copy of my notes"

→ **Export** - Create a ZIP backup and send them the files. They can import into any Markdown tool.

### "I want to collaborate in real-time with a teammate"

→ **Local sync** - Both people need the same Skeleton Key and same Wi-Fi network. Changes appear instantly.

### "I want to back up my data"

→ **Export** - Create regular backups to cloud storage (iCloud, Dropbox, etc.) for disaster recovery.

---

## Security Considerations

### Skeleton Key Risks

- Anyone with your key can read ALL your data
- Keys cannot be revoked (you'd need to start a new vault)
- Lost keys mean permanent data loss

### Export Risks

- Exported files are unencrypted plain text
- Sensitive data visible to anyone with the files
- No access control or permissions

### Local Sync Risks

- Other devices on your network could attempt discovery
- Only share Skeleton Key with trusted parties
- Works only on local network (not over internet)

---

## Further Reading

- [Export & Import Guide](export-import.md) - Detailed export/import instructions
- [Local Sync Guide](local-sync-guide.md) - Local sync setup
- [Security & Privacy](../about/security-privacy.md) - Encryption and threat model
