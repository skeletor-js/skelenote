# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Skelenote, please report it privately:

1. **Email**: <security@skelenote.com>
2. **GitHub Security Advisory**: [Report a vulnerability](https://github.com/skeletor-js/skelenote/security/advisories/new)

---

## Security Model

Skelenote is designed with a zero-knowledge security model:

### What We Protect

- **Data at rest**: XChaCha20-Poly1305 encryption on your device.
- **Key management**: Keys derived via HKDF and stored in OS keychain or encrypted file.

### Cryptographic Primitives

We use established Rust libraries:

- `chacha20poly1305`
- `hkdf`
- `bip39`
- `ed25519-dalek`

---

## Security-Sensitive Areas

When contributing, these areas require extra review:

| Path | Contains |
|------|----------|
| `skelenote-core/src/crypto/` | Encryption, key management |
| `skelenote-core/src/mcp/` | AI Interface exposure |

---

## Audit Status

**Current Status**: Not independently audited (alpha).
