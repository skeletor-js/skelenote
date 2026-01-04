# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in Skelenote, please report it privately:

1. **Email**: security@skelenote.com (or create a private security advisory on GitHub)
2. **GitHub Security Advisory**: [Report a vulnerability](https://github.com/skeletor-js/skelenote/security/advisories/new)

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

We'll keep you informed throughout the process and credit you in the fix (unless you prefer anonymity).

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x (alpha) | Yes |

During alpha, all versions receive security updates. Once we reach stable releases, we'll define a formal support policy.

---

## Security Model

Skelenote is designed with a zero-knowledge security model:

### What We Protect

- **Data at rest**: XChaCha20-Poly1305 encryption on your device
- **Data in transit**: TLS + additional application-layer encryption
- **Key management**: BIP39 mnemonic, HKDF key derivation, OS keychain storage

### What We Cannot Protect

- Compromised endpoints (malware, keyloggers on your device)
- Physical access to an unlocked device
- Lost or stolen Skeleton Keys
- Social engineering attacks

### Cryptographic Primitives

| Purpose | Algorithm |
|---------|-----------|
| Symmetric encryption | XChaCha20-Poly1305 |
| Key derivation | HKDF-SHA256 |
| Mnemonic generation | BIP39 |
| Digital signatures | Ed25519 |

We use established libraries, not custom implementations:
- Rust: `chacha20poly1305`, `hkdf`, `bip39`, `ed25519-dalek`

---

## Security-Sensitive Areas

When contributing, these areas require extra review:

| Path | Contains |
|------|----------|
| `src-tauri/src/crypto/` | Encryption, key management |
| `src/lib/crypto/` | Frontend crypto wrapper |
| `src/lib/sync/` | Sync protocol, message handling |
| `src-tauri/src/network/` | P2P networking |

Changes to these areas should:
- Not introduce new dependencies without review
- Include test coverage for security-critical paths
- Be reviewed by a maintainer familiar with the security model

---

## Audit Status

**Current Status**: Not independently audited (alpha)

**Planned**:
- Pre-beta: Internal security review
- Post-beta: Third-party security audit
- Audit results will be published publicly

---

## Bug Bounty

We don't currently have a formal bug bounty program. However, we deeply appreciate security research and will:

- Credit researchers in release notes (with permission)
- Provide swag/recognition for significant findings
- Consider financial rewards for critical vulnerabilities

---

## Security Resources

- [Security FAQ](docs/user/about/security-faq.md) - Common security questions
- [Security & Privacy](docs/user/about/security-privacy.md) - Technical security details
- [Architecture](docs/developer/architecture.md) - System design overview

---

## Transparency

We commit to:

- Disclosing security incidents that affect users
- Publishing security advisories for patched vulnerabilities
- Maintaining a public record of security-related changes
- Being honest about what we can and cannot protect

---

Thank you for helping keep Skelenote secure.
