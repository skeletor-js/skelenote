# Philosophy & Manifesto

The internet is a noisy open-plan office. Your work shouldn't be.

> **See also:** [The Origin Story](origin.md) — How Skelenote came to be.

---

## The Core Narrative

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

## The Three Laws

Skelenote is designed around three non-negotiable laws that dictate every pixel and line of code.

### Law 1: Structure is Freedom (Native PARA)

Most local-first apps hand you a blank text file and wish you luck. This isn't freedom; it's a burden. It forces you to become a systems architect when you just want to get work done.

Skelenote comes furnished, but you will be able to rearrange the furniture.

* **The Skeleton:** The app launches with the **PARA Method** (Projects, Areas, Resources, Archives) as a sensible default. You step into a working system on day one.
* **Your House, Your Rules:** The framework is a foundation, not a cage. You can rearrange, rename, or restructure as your needs evolve.
* **The Object Graph:** We dissolved the barrier between "Tasks" and "Notes." In Skelenote, everything is an **Object**. A Todo list item has the same power as a 5,000-word thesis.

### Law 2: Privacy is Power (Local Intelligence)

We believe Artificial Intelligence is the future, but we refuse to pay for it with your privacy.

* **Bring Your Own Device (BYOD):** Skelenote is an empty vessel for intelligence. You download the models (Whisper, Llama, etc.) to your local machine.
* **The Air-Gapped Genius:** You can transcribe a confidential meeting, semantic-search your private journals, and summarize sensitive documents without a single byte of data leaving your hardware.

### Law 3: Time is Malleable (Loro CRDTs)

Fear is the enemy of creativity. The fear of deleting the wrong paragraph or breaking a document stops us from refining our work.

* **The Infinite Undo:** By building on **Loro CRDTs**, Skelenote records the history of your vault.
* **The Time Machine:** You can revert a single object—or your entire life's work—to the exact state it was in at any point in the past.

---

## Core Principles

* **Local. Encrypted. Yours.** — Your vault lives on your device, encrypted with XChaCha20-Poly1305 before anything leaves your machine. The key? A 24-word "Skeleton Key" that only you control.

* **Sync Your Way** — Choose how your devices connect. Hearth syncs locally on your network. Courier syncs anywhere via encrypted relay. Both use the same end-to-end encryption—your data is private either way.

* **Offline-First, Always** — Full functionality without internet. No spinners waiting for the cloud. Changes sync when you reconnect.

* **No Lock-in** — Your objects live in files on your computer. Export to Markdown anytime. Walk away whenever you want.
