# Skelenote: a local-first note app with a working time machine

Skelenote is a desktop note app that keeps your notes as files on your machine, never sends them to a server you do not control, and lets you scrub any note back through its entire edit history like video. I built it solo over about six weeks in December 2025 and January 2026, shelved it for a few months, and I am open-sourcing it now under Apache-2.0 because it is good and finished enough to be useful to other people: [github.com/skeletor-js/skelenote](https://github.com/skeletor-js/skelenote).

It is Tauri 2, React 18, and TypeScript, roughly 153k lines with 3,556 passing tests. The interesting parts are not the UI. They are the CRDT design that makes version history nearly free, semantic search that runs entirely on your device, and end-to-end encrypted sync through a relay you can host yourself. I want to walk through those three, including the places where the design is honestly not finished.

## The Time Machine, and why history is cheap

Every editing session in Skelenote runs against a single persistent [Loro](https://loro.dev) CRDT document. Loro is a conflict-free replicated data type library, which means it stores your data as a log of operations rather than as a final snapshot. Each object (a note, a task, whatever) lives in a map keyed by ID, and the text body of each note is a separate `LoroText` container addressed as `content:<objectId>`. When you type, you are not overwriting a string. You are appending operations to a log, and Loro records a timestamp on every change because I turn on `setRecordTimestamp(true)` the moment a document is created or loaded.

The payoff is that the full history is already sitting in the document. I do not store snapshots, keep an undo stack, or diff saved files. To build the version timeline I call `doc.getAllChanges()`, walk every change from every peer, and turn each one into a change point that carries its timestamp and a Loro *frontier*, which is just the operation ID marking "the document state up to and including this change." Scrubbing to a past version is `doc.forkAt(frontier)`, which hands back an independent copy of the document as it existed at that moment. Forking is cheap because Loro replays the op log up to the frontier rather than reconstructing anything from disk.

That same primitive gives you per-note history for free. To answer "show me only the changes that touched this one note," I fork the document at two adjacent frontiers, extract the objects from each fork, and diff them. If the note's serialized data or its content text differs between the two states, that change point affected the note. I cache the diff results keyed by the frontier pair so the timeline does not recompute on every render. Restoring is a CRDT merge, not a destructive overwrite: I fork at the old frontier, export a snapshot, and import it back into the live document, so the act of restoring is itself just more history.

None of this required a bespoke version-control system. It fell out of choosing an op-based CRDT and then never throwing the ops away.

## Semantic search that never leaves the machine

Skelenote has semantic search, meaning you can find notes by meaning rather than exact keywords, and it does this without a single network call to an embedding API. The embedding model is `all-MiniLM-L6-v2` running through [@xenova/transformers](https://github.com/xenova/transformers.js), which is Transformers.js compiling the model to run in the app's own runtime. The model is about 23MB, produces 384-dimensional vectors, and is downloaded once and cached (I set `env.allowLocalModels = false` and `env.useBrowserCache = true`, so it lives in the app's cache after first load).

Indexing chunks each note, embeds the chunks, and stores the vectors locally alongside a content hash so re-indexing only touches notes that actually changed. Query time is a cosine similarity pass over the local vector index. There is no server, no API key, and no telemetry on the content of your notes. On a laptop this is fast enough that I never built a cloud fallback, which is the point.

## End-to-end encrypted sync, and its honest limits

Sync is optional and off by default. When you turn it on, devices talk to each other through a relay server, and the relay never sees plaintext. The crypto layer is what I call the Skeleton Key: a 24-word BIP39 mnemonic that you generate once and carry to each device (there is a QR path for that). From the mnemonic the app derives an encryption key and a deterministic user ID, so every device holding the same key lands in the same sync room without any account, email, or password. All the actual cryptography (`XChaCha20-Poly1305`) happens in the Rust backend; the TypeScript side only ships bytes across the wire. The relay is a small self-hostable service with a Dockerfile and compose file in the repo, so if you do not trust mine, you can run your own, and it would not matter cryptographically if you did not.

Here is the part I want to be straight about. Skelenote is built on a CRDT, so in principle it could sync fine-grained operations and merge concurrent edits to the same note character by character. It does not. The wire format is a whole-document snapshot: on every change I call `exportAll()`, which serializes each Loro document in `snapshot` mode, and that snapshot is what gets encrypted and sent. Worse, note content is written with whole-text replacement. When content changes, `setContent` deletes the entire existing `LoroText` and inserts the new string rather than applying a granular delta. The CRDT still merges without conflicts, and offline edits on different notes reconcile cleanly, but if two devices edit the *same* note at the same time, the merge is coarse: you get one device's version of that note's body, not a smart character-level blend. For a single-user, few-devices workflow this is fine in practice. It is not the fine-grained collaborative editing the underlying data model is capable of, and closing that gap means moving from snapshot sync to op-based deltas and from whole-text replacement to real text diffing.

## What works, and what is rough

What works: the editor, notes and tasks and links between them, the full time machine with per-note history and restore, on-device semantic search, Notion import (it walks the Notion API, converts blocks and database properties, and infers types), and encrypted multi-device sync for the common case. The 3,556 tests are real tests of this behavior, not mock theater.

What is rough, concretely:

- The main JavaScript bundle is about 4.6MB. I never split it. First load carries more than it should.
- Sync is snapshot-only on the wire, and note content syncs as whole-text replacement, so concurrent same-note edits merge coarsely (see above).
- The mobile targets build. Tauri generates Android and Apple projects and they compile, but I never shipped either to a store, so treat them as unproven.
- It is a solo six-week build. There are corners I know about and corners I do not.

If any of this is interesting, clone it and run it from source. It is Tauri, so you need Rust and Node; the README has the setup. Open an issue if something breaks, and if the snapshot-to-delta sync work sounds like your idea of fun, that is the most valuable thing anyone could pick up.
