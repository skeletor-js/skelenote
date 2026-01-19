# Security FAQ

Quick answers to common security questions. For technical details, see [Security & Privacy](./security-privacy.md).

---

## Encryption & Privacy

### Can you read my notes?

**No.** Technically impossible without your Skeleton Key.

Your data is encrypted on your device before it ever leaves. We never have access to your encryption keys. Even if someone compromised our servers, they'd only get encrypted blobs that are useless without your key.

### How is this different from Notion's "encryption at rest"?

| | Skelenote | Notion |
|---|---|---|
| Who holds the keys? | You | Notion |
| Can the company read your data? | No | Yes |
| Government subpoena access? | Encrypted blobs only | Full content |
| Employee access? | Impossible | Possible |

Notion encrypts data on their servers with keys they control. Skelenote encrypts on YOUR device with keys only you have.

### What encryption does Skelenote use?

- **XChaCha20-Poly1305** - Modern authenticated encryption (same family as used by Cloudflare, WireGuard)
- **BIP39** - Industry-standard mnemonic generation (same as Bitcoin/Ethereum wallets)
- **HKDF-SHA256** - Key derivation for generating multiple keys from your master key

These are battle-tested cryptographic primitives, not custom implementations.

### What about metadata?

**What we CAN'T see** (encrypted):

- Note content and titles
- Task names and descriptions
- Tags, projects, areas
- Relationships between objects
- Anything you type

**What Courier sees** (if you use it):

- Encrypted blob sizes
- Timestamps of sync operations
- User ID (cryptographic hash, not your identity)
- Device IDs

**What Hearth exposes**:

- Your device is on the local network (via mDNS)
- Nothing else - direct encrypted connection

---

## Key Management

### What if I lose my Skeleton Key?

**Your data is unrecoverable.** This is intentional.

Any recovery mechanism would be a backdoor. If we could recover your data, so could an attacker, a court order, or a rogue employee. True zero-knowledge means no recovery.

**Prevention**: Write down your 24 words when you first set up Skelenote. Store them somewhere safe (not digitally).

### Can I change my Skeleton Key?

Not currently. This is a planned feature for a future release. Changing keys requires re-encrypting all data, which needs careful implementation.

### What if someone sees my 24 words?

They can decrypt your entire vault. Treat your Skeleton Key like a password to your bank account:

- Never share it
- Never photograph it
- Never store it in a notes app or password manager that syncs to the cloud
- Write it on paper and store physically

---

## Attacks & Threats

### What happens if you get hacked?

Attackers would get encrypted blobs. Without your Skeleton Key, the data is cryptographic noise - literally indistinguishable from random bytes.

We don't store your keys. We can't be compelled to hand over what we don't have.

### What if someone steals my laptop while Skelenote is open?

They have access until you close the app or lock your computer. Skelenote doesn't currently have an auto-lock timeout (planned feature).

**Mitigations**:

- Lock your computer when away (Cmd+Ctrl+Q on macOS)
- Enable FileVault/BitLocker for full-disk encryption
- Use a strong system password

### What about keyloggers or malware?

If your device is compromised, all bets are off. A keylogger could capture your Skeleton Key as you type it. Skelenote protects data in transit and at rest, not against a compromised endpoint.

**Mitigations**:

- Keep your OS updated
- Don't install untrusted software
- Use antivirus/anti-malware tools

### Has Skelenote been audited?

**Not yet** - we're in alpha.

Our cryptographic primitives (XChaCha20, BIP39, HKDF) are industry-standard and extensively audited. Our implementation uses well-maintained libraries, not custom crypto.

A full security audit is planned post-beta. We'll publish the results.

---

## Verification

### How do I verify your claims?

**Inspect network traffic**:

```bash
# macOS/Linux - watch what Skelenote sends
sudo tcpdump -i any -A host your-relay-server.com
```

You'll see encrypted blobs, not plaintext.

**Review the code**:

- Encryption: `src-tauri/src/crypto/`
- Sync protocol: `src/lib/sync/`
- Key management: `src-tauri/src/crypto/keys.rs`

**Verify local storage**:

```bash
# Your data file (it's encrypted)
xxd ~/Library/Application\ Support/com.skelenote.app/data/store.loro | head
```

You'll see binary data, not readable text.

---

## Legal & Policy

### What's your warrant canary policy?

We will publish a transparency report if/when we receive legal requests for user data. Since we can't decrypt user data, any such request would only yield encrypted blobs and metadata.

### Do you comply with GDPR?

Yes. Key points:

- Your data stays on your devices (local-first)
- Courier stores only encrypted blobs
- You can delete everything by deleting your local files
- We don't track or profile users

### What happens to my data if Skelenote shuts down?

Nothing. Your data lives on your device in standard files. You can:

- Continue using the app (it works offline forever)
- Export to Markdown
- Access the raw Loro CRDT files

No server dependency for core functionality.

---

## Still Have Questions?

- [Security & Privacy](./security-privacy.md) - Technical deep dive
- [Discord](https://discord.gg/4apsgSRB7D) - Ask the community
- For security vulnerabilities, see [SECURITY.md](../../../SECURITY.md)
