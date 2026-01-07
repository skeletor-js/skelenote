# Open Source Packages

We're extracting reusable components from Skelenote as standalone open-source packages.

---

## Planned Packages

### `skeleton-key` (Rust crate)

BIP39 mnemonic key management with HKDF derivation.

| Feature | Description |
|---------|-------------|
| Mnemonic generation | 24-word BIP39 phrases (256-bit entropy) |
| Key derivation | HKDF-SHA256 with domain separation |
| Encryption | XChaCha20-Poly1305 (24-byte nonce) |
| Secure storage | Optional OS keychain integration |

**License:** MIT OR Apache-2.0

---

### `crypt-sync` (Rust + npm)

Binary wire protocol for encrypted CRDT sync.

| Feature | Description |
|---------|-------------|
| Protocol messages | HELLO, UPDATE, SNAPSHOT, ACK, PING/PONG |
| Encryption | E2E encrypted payloads |
| CRDT support | Designed for Loro CRDT updates |
| Platform | Rust core with TypeScript bindings |

**License:** MIT OR Apache-2.0

---

### `blocknote-diff` (npm)

Block-level diffing for BlockNote documents.

| Feature | Description |
|---------|-------------|
| Content diff | Block-level add/remove/modify detection |
| Property diff | Track metadata changes |
| Content matching | Hash-based (ignores block ID changes) |
| React component | Optional `<DiffViewer />` |

**License:** MIT

---

## Planning Documents

| Document | Description |
|----------|-------------|
| [zero-knowledge-sync-package.md](zero-knowledge-sync-package.md) | Full spec for `skeleton-key` + `crypt-sync` |
| [blocknote-diff-package.md](blocknote-diff-package.md) | Full spec for `blocknote-diff` |

---

## Why Open Source?

These packages solve problems other developers face:

1. **skeleton-key** — Key management for any E2E encrypted app
2. **crypt-sync** — Wire protocol for encrypted CRDT sync
3. **blocknote-diff** — Currently no good block-level diff for BlockNote

By extracting and open-sourcing, we:
- Give back to the community
- Get more eyeballs on critical security code
- Enable others to build privacy-respecting apps

---

*See [ROADMAP.md](/ROADMAP.md) for package release timeline.*
