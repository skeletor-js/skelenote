---
description: Run a quick security audit on recent changes or specific files
---

# Security Skill

Invokes the security-auditor agent for quick security checks on code.

## Information Needed

1. **Target** - What to audit:
   - Recent changes (default)
   - Specific file or directory
   - Specific module (crypto, network, auth)

## Steps

1. Determine audit scope:
   - If no target specified, audit recent git changes
   - If file/directory specified, focus on that
   - If module specified, audit that module

2. Launch security-auditor agent via Task tool:

```
Task({
  subagent_type: "security-auditor",
  prompt: "Perform a security audit on [target]. Focus on:
    - Input validation
    - Authentication/authorization
    - Cryptographic usage
    - IPC security (Tauri commands)
    - OWASP Top 10 vulnerabilities

    Provide findings with severity ratings and remediation guidance."
})
```

3. Review agent findings and present summary

## Focus Areas

| Area | What to Check |
| ---- | ------------- |
| **Input Validation** | User input sanitization, type checking |
| **Auth Flows** | Skeleton Key handling, session management |
| **Crypto** | XChaCha20-Poly1305 usage, key derivation |
| **IPC Security** | Tauri command permissions, invoke patterns |
| **P2P Sync** | mDNS discovery, TCP connections, encryption |

## Example: Audit Recent Changes

User: "Run a security check"

1. Get recent changes:
```bash
git diff HEAD~5 --name-only
```

2. Launch security-auditor agent with file list

3. Present findings summary

## Example: Audit Crypto Module

User: "Security audit the crypto module"

Launch agent:
```
Task({
  subagent_type: "security-auditor",
  prompt: "Perform a security audit on src-tauri/src/crypto/ focusing on:
    - BIP39 mnemonic handling
    - HKDF key derivation
    - XChaCha20-Poly1305 encryption
    - Key storage security
    - Potential side-channel vulnerabilities"
})
```

## Notes

- Always runs via the security-auditor agent (model: opus)
- Findings include severity ratings (Critical, High, Medium, Low)
- CWE classifications provided where applicable
- Remediation guidance included for each finding
