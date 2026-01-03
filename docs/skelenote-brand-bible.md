# Skelenote: The Permanent Operating System
**Brand Bible & Strategic Positioning (v3.0)**

---

## I. The Core Narrative

### The Great Regression
For the last decade, we have been living through a regression in personal computing disguised as progress. We were sold a lie: that to be productive, we had to be connected. That to be safe, we had to be monitored. That to be smart, we had to rent our intelligence.

We traded ownership for access. We stopped buying software and started paying landlords. The modern productivity landscape has become a busy, open-plan office: loud, rented, and hostile. It is a place where deep work goes to die.

### The Return to Quiet
**Skelenote is the rejection of the open-plan era.**

It is built on a simple, radical premise: **Software should be a quiet room you own, not a noisy service you visit.**

We are bringing back the "Golden Era" of software—when you bought a program, it lived on your hard drive, it worked offline, and it worked forever—and combining it with the bleeding-edge power of modern technology (Rust, CRDTs, Local LLMs).

We are not building another SaaS platform. We are building a **Digital Study**.

A place where the door locks, the fire is lit, and the noise of the internet is shut out. A sanctuary where the walls are thick, the tools are yours, and your thoughts remain private until you choose to share them.

---

## II. The Product Philosophy

Skelenote is designed around three non-negotiable laws that dictate every pixel and line of code.

### Law 1: Structure is Freedom (Native PARA)
Most local-first apps (like Obsidian) hand you a blank text file and wish you luck. This isn't freedom; it's a burden. It forces you to become a systems architect when you just want to get work done.

Skelenote comes furnished, but you will be able to rearrange the furniture.
* **The Skeleton:** The app launches with the **PARA Method** (Projects, Areas, Resources, Archives) as a sensible default. You step into a working system on day one.
* **Your House, Your Rules:** In a future update, Settings will include a toggle to unlock the built-in PARA types—allowing you to rename, restructure, or replace them entirely. The framework is a foundation, not a cage.
* **The Object Graph:** We dissolved the barrier between "Tasks" and "Notes." In Skelenote, everything is an **Object**. A Todo list item has the same power as a 5,000-word thesis. They share the same properties, tags, and linking capabilities.

### Law 2: Privacy is Power (Local Intelligence)
We believe Artificial Intelligence is the future, but we refuse to pay for it with your privacy.
* **Bring Your Own Device (BYOD):** Skelenote is an empty vessel for intelligence. You download the models (Whisper, Llama, etc.) to your local machine.
* **The Air-Gapped Genius:** You can transcribe a confidential meeting, semantic-search your private journals, and summarize sensitive documents without a single byte of data leaving your hardware.

### Law 3: Time is Malleable (Loro CRDTs)
Fear is the enemy of creativity. The fear of deleting the wrong paragraph or breaking a document stops us from refining our work.
* **The Infinite Undo:** By building on **Loro CRDTs** (Conflict-Free Replicated Data Types), Skelenote records the history of your vault.
* **The Time Machine:** You can revert a single object—or your entire life's work—to the exact state it was in last Tuesday at 2:00 PM.

---

## III. Visual Identity: "Cozy Rationalism"

Our design language is a direct response to the "Cold Blue" aesthetic of Silicon Valley SaaS. If Linear is an industrial warehouse, Skelenote is a study with a fireplace.

### The Aesthetic
We combine the high-density efficiency of a code editor with the warmth of a physical notebook.

* **The Palette:** We strip away the clinical blues and replace them with earth tones.
    * **Ember** (`#B85C50`): A warm terracotta used for primary actions and focus rings.
    * **Sage** (`#5E8C61`): A grounded green signaling success and completion.
    * **Canvas** (`#FAFAFA`): A soft off-white background that reduces eye strain, avoiding the harshness of pure white.
* **The Typography:** We use **Carbon** (`#18181B`) and **Graphite** (`#52525B`) text—never pure black—to soften the contrast and make long reading sessions comfortable.

### The Interface
* **High Density, Low Noise:** We respect screen real estate. Information is packed efficiently with tight gaps and minimal padding, but the interface recedes until needed.
* **Hover-Reveal:** Secondary actions only reveal themselves on hover to reduce visual noise.
* **Depth without Weight:** We avoid heavy drop shadows, using subtle 1px borders (`#E4E4E7`) to define hierarchy. It feels substantial, not floaty.

---

## IV. The Sovereign Business Model

Our pricing strategy is our biggest differentiator. It aligns our incentives with the user's well-being, not their addiction.

### 1. Buy the Tool ($19.99 Version License)
This is the "Sketch/Things Model"—buy once, own forever. For less than a month of most productivity subscriptions, the user gets:
* The full Desktop (Tauri/Rust) and Mobile apps.
* All local features (XChaCha20 Encryption, AI, Graph, PARA).
* **Campfire Mode:** Serverless P2P sync (LAN sync).
* Lifetime access to v1.x updates.
* *Philosophy:* You own version 1 forever. When version 2 arrives (typically every two years), you decide whether the new features are worth another purchase. No forced upgrades, no feature degradation, no subscription anxiety.

### 2. Rent the Infrastructure (Optional Subscription)
We only charge recurring fees for recurring costs.
* **Cloud Relay:** For users who want us to host the encrypted bridge for internet syncing.
* **Skelenote Publish:** For users who want us to host their public web pages.
* *The Kicker:* Technical users can self-host these services for free. We monetize convenience, not necessity.

---

## V. Strategic Positioning: The "Campfire"

Skelenote establishes a new rhythm for creative work: **Solitude by default, sharing by choice.**

While competitors force you into "Always-On Cloud Collaboration" (the digital equivalent of a noisy open-plan office), we introduce **"Campfire Mode."**

### The Concept: The Privacy Air-Gap
Deep work happens in the **Digital Study**—alone, focused, and private. But when the work is ready to be shared, you step out to the **Campfire**.

* **The Principle:** Physical proximity is the ultimate encryption. The only way to share data that nobody can intercept is to never send it over the internet at all.
* **The Mechanic:** Devices discover each other over your local network (mDNS/Bonjour). Data syncs directly between machines, encrypted end-to-end, without ever touching an external server. No cloud. No relay. No exposure.
* **The Feeling:** The intimacy and speed of connecting directly to the people next to you—like a LAN party, but with enterprise-grade security.

### The Differentiator
Most modern tools obsess over bridging oceans between remote workers. We are the only tool that recognizes **proximity is security**. When you are in the same room, same building, or same network—your data stays there. We do not build bridges across the internet; we build a fire for the people who are already together.

---

## VI. The Communication Voice

**We are the "Adult in the Room."**
We don't use breathless hype ("Revolutionary!" "Game Changing!"). We speak with the quiet confidence of a tool that works. We value silence over noise, and ownership over access.

* **Protective:** "The internet is a noisy open-plan office. Your work shouldn't be. Close the door."
* **Nostalgic but Modern:** "Remember when you owned your software? We brought that back."
* **Direct:** "Local. Encrypted. Yours."

**Lexicon:**

* **The Study:** The application environment. Avoid "Platform" or "OS." (Implies focus, quiet, and a furnished room).
* **Private Workspace:** The product category. Avoid "Productivity Tool" or "Note-taking App." (Implies a specific location for work).
* **Vault:** The database/file storage. Avoid "Account" or "Cloud." (Implies security and total ownership).
* **Object:** The fundamental unit of information. Avoid "Page," "Note," or "Task." (Implies structure and malleability).
* **Campfire:** The local sync mode. Avoid "Collaboration" or "Multiplayer." (Implies proximity and intimacy).
* **Air-Gap:** The security posture of Campfire mode. Avoid "Offline sync." (Implies the security guarantee of physical isolation).
* **Relay:** The optional internet sync. Avoid "Cloud Storage." (Implies transit, not residency).

---

## VII. The Roadmap

1.  **Phase I: The Foundation (Now)**
    * Tauri/Rust Desktop App.
    * Native PARA & Loro Encryption.
    * Campfire P2P Sync.

2.  **Phase II: The Exodus (Next)**
    * **The Importers:** One-click wizards to migrate from Notion (Databases -> Objects) and Obsidian (Frontmatter -> Properties).
    * **Native Mobile:** The full experience in your pocket.
    * **Local Whisper:** Integrated voice notes.

3.  **Phase III: The Network (Future)**
    * **Skelenote Publish:** One-click web publishing.
    * **Graph View:** Visualizing the neural network of the vault.