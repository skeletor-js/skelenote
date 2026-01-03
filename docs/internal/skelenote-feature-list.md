# Skelenote: Feature Specifications

## Part I: Current Features
*Available in the current Desktop Release.*

### 01. The Engine & Security
* **Architecture:** Native desktop app built with **Tauri** and **Rust** (No Electron bloat).
* **Local-First:** Data lives locally by default; no internet required.
* **Encryption:** Fully local and encrypted with **XChaCha20-Poly1305** using a 24-word skeleton key.
* **Time Machine:** Powered by **Loro CRDTs**, allowing users to reset individual notes or the entire vault to any previous state.
* **Sync:**
    * **True P2P:** Encrypted peer-to-peer sync via mDNS/Bluetooth/LAN (offline capable).
    * **Cloud Relay:** Optional support for self-hosted or user-provided cloud relay servers.

### 02. Native Structure (PARA + Objects)
* **Projects & Areas:** Built-in **Object Types** with preferential UI treatment.
* **Resources:** Built-in **Tag** system for organizing reference material.
* **Archive:** Built-in **Property** and dedicated view (archives items without deleting).
* **Daily Notes:** Automatic logging and date-based linking.
* **Unified Inbox:** Dedicated view for processing inputs.
* **Relations:** Native bidirectional backlinks and object relationships.

### 03. Workflow Tools
* **Integrated Tasks:** First-class task management deeply integrated into all object types.
* **Zen Mode:** Distraction-free writing environment.
* **Command Palette:** Global keyboard control for quick actions and navigation.
* **Quick Capture:** Instantly create objects from anywhere in the app.
* **Customization:**
    * **Templates:** Support for object creation templates.
    * **Saved Views:** Custom filtered views based on properties/tags.
    * **Theming:** Native Light and Dark modes.

### 04. Sovereign Intelligence (Current)
* **Local Semantic Search:** Opt-in local vector embedding model. Enables search with customizable similarity thresholds without sending data to the cloud.

### 05. Data Portability
* **Export:** Single-click export of the entire vault into an organized ZIP folder (sorted by folder/object type) or individual Markdown export.

---

## Part II: Next Release
*Confirmed features for the upcoming version.*

* **Native Mobile App:** Full-featured Tauri-based iOS and Android app.
* **Local Whisper:** Built-in, unlimited offline voice transcription (user downloads local model).
* **Local AI Copilot:** On-device LLM integration for auto-tagging, summarization, and content generation (user downloads local model).
* **The Exodus Wizards:** Import tools for:
    * **Notion:** Databases → Object Types.
    * **Obsidian:** Frontmatter → Properties.
    * **Roam:** Outlines → Block Structures.
* **Graph View:** Visual node-link diagram of vault connections.

---

## Part III: In Development / Future
*Features currently in the lab.*

* **Sovereign Publish:** Render objects/projects as public web pages via shareable links (Self-hosted or Cloud Relay).
* **Campfire Collaboration:** Real-time, multi-user collaboration via P2P (LAN) or Cloud Relay.
* **Canvas View:** Spatial thinking board powered by React Flow.
* **Auto-Lock:** Inactivity tracking with password or biometric unlock.