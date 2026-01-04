# Developer Quick Start

Ship your first PR in 30 minutes.

---

## 1. Environment Setup (5 min)

### Prerequisites

**All platforms**:
- [Node.js 18+](https://nodejs.org/)
- [Rust (stable)](https://rustup.rs/)
- [pnpm](https://pnpm.io/installation)

**macOS**:
```bash
xcode-select --install
```

**Windows**:
- [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

**Linux (Ubuntu/Debian)**:
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### Clone & Install

```bash
git clone https://github.com/jordanstella/skelenote.git
cd skelenote
pnpm install
```

---

## 2. Run the App (5 min)

```bash
pnpm tauri dev
```

This starts Vite + Tauri with hot reload. The app window should open in ~30 seconds.

**Expected output**:
```
  VITE v5.x.x  ready in xxx ms
  ➜  Local:   http://localhost:1420/

  Running Tauri dev server...
```

**Common issues**:
- `error: linker 'cc' not found` → Install build tools (see above)
- `Error: Unable to find WebView2` (Windows) → Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- Rust compilation slow → First build takes 2-5 min, subsequent builds are fast

---

## 3. Make a Change (10 min)

### Find Something to Work On

- [Good first issues](https://github.com/jordanstella/skelenote/labels/good%20first%20issue)
- [Help wanted](https://github.com/jordanstella/skelenote/labels/help%20wanted)

### Example: Add a Keyboard Shortcut

Let's add `Cmd+Shift+D` to toggle debug mode (just an example).

**Edit** `src/contexts/KeyboardShortcutsContext.tsx`:

```typescript
// Find the shortcuts array and add:
{
  key: 'd',
  modifiers: ['meta', 'shift'],
  action: () => {
    console.log('Debug mode toggled!');
    // Add your logic here
  },
  description: 'Toggle debug mode',
}
```

**Test it**: Press `Cmd+Shift+D` in the running app. Check the console (Cmd+Option+I).

### Example: Fix a UI Element

**Edit** a component in `src/components/`. Changes hot reload instantly.

### Example: Add a Tauri Command

**Rust side** (`src-tauri/src/lib.rs`):
```rust
#[tauri::command]
fn my_command(input: String) -> String {
    format!("You said: {}", input)
}

// Add to invoke_handler:
.invoke_handler(tauri::generate_handler![
    // ... existing commands
    my_command,
])
```

**Frontend side**:
```typescript
import { invoke } from '@tauri-apps/api/core';

const result = await invoke<string>('my_command', { input: 'hello' });
```

**Note**: Rust changes require restarting `pnpm tauri dev`.

---

## 4. Test & Submit (10 min)

### Run Checks

```bash
# All of these must pass
pnpm lint                    # ESLint
pnpm exec tsc --noEmit       # TypeScript
pnpm test:run                # Vitest
```

### Create Your PR

```bash
# Create a branch
git checkout -b fix/your-change-description

# Stage and commit
git add .
git commit -m "fix: description of your change"

# Push
git push -u origin fix/your-change-description
```

Then open a PR on GitHub. The PR template will guide you.

---

## Key Conventions

### Code Style

| Rule | Example |
|------|---------|
| Path aliases | `import { useObjects } from '@/contexts'` not `../../../contexts` |
| Mantine for UI | Use Mantine components, not raw HTML |
| Lucide for icons | `import { Plus } from 'lucide-react'` |
| No emojis in UI | Clean, minimal aesthetic |

### File Structure

```
src/
├── components/     # React components (organized by feature)
├── contexts/       # React Context providers
├── hooks/          # Custom React hooks
├── lib/            # Core business logic
│   ├── loro/       # CRDT store
│   ├── sync/       # P2P sync
│   └── crypto/     # Encryption wrapper
└── styles/         # Global CSS
```

### Gotchas

- **Hot reload**: React changes reload instantly; Rust changes need restart
- **Path aliases**: Always use `@/` not relative paths
- **Types**: Run `tsc --noEmit` before committing
- **Loro data**: Stored at `~/Library/Application Support/com.skelenote.app/data/`

---

## Getting Help

- [Discord](https://discord.gg/4apsgSRB7D) - Quick questions
- [GitHub Issues](https://github.com/jordanstella/skelenote/issues) - Bug reports
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - Full guide
- [Architecture](./architecture.md) - How it all fits together

---

## Next Steps

Once you're comfortable:

1. Read [Architecture](./architecture.md) to understand the system
2. Review [CLAUDE.md](../../CLAUDE.md) for patterns and gotchas
3. Check [style-guide.md](../design/style-guide.md) for UI conventions
4. Explore the codebase and find something interesting!

---

Welcome to Skelenote development!
