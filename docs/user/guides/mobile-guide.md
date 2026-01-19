# Mobile Guide

Take your Digital Study with you. Skelenote on mobile keeps your notes, tasks, and ideas in sync across all your devices.

---

## Getting the App

### iOS (iPhone & iPad)

Skelenote for iOS is currently in **alpha testing** via Apple TestFlight.

1. [Install TestFlight](https://apps.apple.com/app/testflight/id899247664) from the App Store if you don't have it
2. Open the TestFlight invitation link (available to alpha testers)
3. Tap **Accept** to join the beta
4. Install Skelenote from within TestFlight

**Note:** Alpha builds may have bugs and features may change. Your data is still encrypted and safe.

### Android

Skelenote for Android is available in two ways:

**APK Download (Alpha)**

1. Download the `.apk` file from the [releases page](https://github.com/skeletor-js/skelenote/releases)
2. On your Android device, go to **Settings > Security**
3. Enable **Install from unknown sources** (or allow it for your browser)
4. Open the downloaded APK and tap **Install**

**Google Play Store**
Coming soon. The Play Store version will be available when Skelenote exits alpha.

---

## Setting Up Your Mobile Device

### First Launch

When you open Skelenote for the first time, you'll see a welcome screen asking you to set up your vault.

**If you already use Skelenote on another device:**
Choose **I have a Skeleton Key** and enter your existing 24-word phrase. This connects your mobile device to your existing vault.

**If this is your first time:**
Choose **Create New Skeleton Key**. Write down the 24 words shown on screen and store them somewhere safe. This phrase is the only way to recover your data if you lose your device.

### Entering Your Skeleton Key

When entering your 24-word Skeleton Key:

1. You can type words one at a time or paste the entire phrase
2. Words auto-complete as you type
3. The app validates each word against the standard word list
4. Once all 24 words are entered correctly, tap **Unlock**

**Tip:** If you stored your Skeleton Key in a password manager, you can copy and paste the entire phrase at once.

---

## Pairing with Desktop (QR Code)

The fastest way to connect your mobile device to a desktop is via QR code. This securely transfers pairing information without exposing your Skeleton Key.

### On Your Desktop

1. Open **Settings > Sync > Hearth**
2. Make sure Hearth is enabled
3. Click **Show Pairing Code**
4. A QR code appears on screen

### On Your Mobile Device

1. Open **Settings** (tap the Browse tab, then Settings)
2. Go to **Sync > Hearth**
3. Tap **Scan QR Code**
4. Point your camera at the QR code on your desktop screen
5. When the code is recognized, tap **Pair**

### What Happens After Pairing

Once paired:

- Both devices appear in each other's **Paired Devices** list
- When on the same network, they sync automatically
- A green dot indicates an active connection
- Changes you make on one device appear on the other within seconds

### Troubleshooting Connection Issues

**Devices not discovering each other?**

- Make sure both devices are on the **same WiFi network**
- Check that Hearth is **enabled** on both devices
- Try toggling Hearth off and on again
- Make sure your router allows local network discovery (some guest networks block this)

**QR code not scanning?**

- Ensure good lighting on the QR code
- Hold your phone steady about 6-8 inches from the screen
- Make sure the entire QR code is visible in the camera frame
- Try increasing screen brightness on your desktop

**Paired but not syncing?**

- Verify both devices show a green connection dot
- Check that you're using the **same Skeleton Key** on both devices
- Try the **Reconnect** button in the device list

---

## Mobile Features

### Biometric Unlock

Protect your notes with Face ID, Touch ID, or fingerprint authentication.

**To enable:**

1. Go to **Settings > Security**
2. Toggle **Biometric Unlock** on
3. Authenticate to confirm

When enabled, Skelenote requires biometric authentication each time you open the app. If biometric fails, you can use your device passcode as a fallback.

### Haptic Feedback

Skelenote uses subtle vibrations to confirm your actions:

- **Light tap** when switching tabs or selecting items
- **Medium tap** when completing a task
- **Success vibration** when saving or syncing successfully
- **Warning vibration** for destructive actions like delete

Haptics follow your device's system settings. To disable them, turn off haptic feedback in your device's accessibility settings.

### Push Notifications

Get reminders for your tasks directly on your phone.

**Setting up reminders:**

1. Open a task
2. Tap the **Reminder** field
3. Choose when you want to be notified

**Enabling notifications:**

1. Skelenote will ask for permission when you set your first reminder
2. Tap **Allow** in the system prompt
3. You can manage notification settings in **Settings > Notifications**

Reminders work even when Skelenote is closed. Your notification content is generated locally and never sent to any server.

### Quick Capture from Share Sheet

Capture content from any app into Skelenote using your phone's share feature.

**On iOS:**

1. In Safari, Notes, or any app, tap the **Share** button
2. Scroll through the share options and tap **Skelenote**
3. Add an optional note, then tap **Post**
4. The content appears in your Inbox next time you open Skelenote

**On Android:**

1. In Chrome, or any app, tap the **Share** button
2. Select **Skelenote** from the share menu
3. Skelenote opens and creates a new item with the shared content

**What you can capture:**

- Web page URLs (creates a Link object)
- Selected text (creates a Note in your Inbox)
- Images (coming soon)

---

## Mobile UI Differences

The mobile version of Skelenote is optimized for touch, with some layout changes from desktop.

### Bottom Navigation

Instead of the sidebar on desktop, mobile uses a **bottom tab bar**:

| Tab | What it shows |
|-----|---------------|
| **Inbox** | Items waiting to be processed |
| **Daily** | Today's daily note |
| **Tasks** | Your task lists and filters |
| **Browse** | Projects, Areas, Tags, Archive, Settings |

**Tip:** Tap the tab you're already on to scroll back to the top.

### Floating Action Button

The orange **+** button in the bottom-right corner opens **Quick Capture**. This is the fastest way to create new items:

1. Tap the **+** button
2. Choose what to create (Task, Note, or use a template)
3. Enter your content
4. Tap **Save**

The new item goes to your Inbox by default.

### Swipe Gestures

Navigate faster with swipe gestures:

- **Swipe left** on a list item to reveal quick actions (complete, archive, delete)
- **Swipe right** on a list item to mark as pinned
- **Pull down** on any list to refresh and sync

### Pull to Refresh

Pull down on any list view to:

- Check for updates from connected devices
- Refresh your data from local storage
- See the latest sync status

---

## Syncing Between Devices

### How Sync Works on Mobile

Skelenote uses the same sync technology on mobile as desktop:

1. **Hearth** - When your phone and other devices are on the same WiFi network, they sync directly. No internet needed.

2. **Courier** - If configured, your devices can sync through an encrypted relay server when not on the same network.

Both methods use end-to-end encryption. Your data is encrypted before it leaves your device.

### What Syncs Automatically

Everything syncs:

- All your objects (notes, tasks, projects, areas, tags)
- Object content and properties
- Your templates
- Archive history

**Settings that don't sync** (they're device-specific):

- Biometric unlock preference
- Notification settings
- Theme (light/dark)
- Device name

### Handling Conflicts

Skelenote uses CRDT technology that automatically merges changes without conflicts. If you edit the same note on two devices simultaneously:

- Both edits are preserved
- Text edits merge character-by-character
- Property changes use "last write wins" (most recent change applies)
- No data is ever lost

You don't need to do anything special. Changes merge automatically when devices connect.

---

## Tips for Mobile Use

### Quick Capture Workflows

**Capture thoughts during the day:**

1. Use the **+** button or Share Sheet throughout your day
2. Everything lands in your Inbox
3. Process your Inbox during a dedicated review time

**Meeting notes:**

1. Open today's Daily Note
2. Start typing as the meeting progresses
3. Use @mentions to link to relevant projects or people
4. Notes sync to desktop automatically

**Task on the go:**

1. Tap **+** > **Task**
2. Enter the task title
3. Optionally set a due date and priority
4. The task appears in your tasks view immediately

### Offline Usage

Skelenote works fully offline. No internet connection is required to:

- Create, edit, and delete objects
- Search your vault
- Use templates
- View your entire history

**When you come back online:**

- Hearth resumes automatically when you join a network with other devices
- Courier reconnects if configured
- Any offline changes merge seamlessly

**Tip:** Check the sync indicator (green/orange/red dot) to see your connection status.

### Battery Considerations

Skelenote is designed to be battery-friendly:

- **Hearth** uses minimal power (mDNS discovery is lightweight)
- **Biometric unlock** uses the system's optimized APIs
- **No background sync** unless you have Courier enabled
- **No location tracking** or sensors running in the background

To maximize battery life:

- Use Hearth only when needed (disable when traveling alone)
- Keep Courier off unless you need cross-network sync
- Notifications use minimal battery since they're scheduled locally

---

## Further Reading

- [Getting Started Guide](../getting-started.md) - Full introduction to Skelenote
- [Hearth Guide](hearth-guide.md) - Deep dive into local network sync
- [Courier Guide](courier-guide.md) - Configure Courier for remote sync
- [Settings Reference](settings-reference.md) - All settings explained
