# Skeleton Key Documentation

User guides and UX improvements for vault sharing via Skeleton Key.

---

## Current Capability

The Skeleton Key (24-word mnemonic) already enables vault sharing:
- Same Skeleton Key on multiple devices = same vault
- All data syncs via CRDT
- Zero-knowledge encryption preserved

---

## When to Use Skeleton Key Sharing

### Good Scenarios

- Sharing a family knowledge base with partner
- Giving a trusted assistant access to work notes
- Setting up a shared workspace with co-founder

### Not Recommended For

- Casual sharing (use Export instead)
- Temporary access (no revocation without changing key)
- People you don't fully trust

---

## Documentation Updates

### User Guide: "Sharing Your Vault with Family"

- Explain that sharing key = sharing EVERYTHING
- Emphasize full trust requirement
- Provide secure sharing methods:
  - In-person exchange
  - Encrypted messaging (Signal, iMessage)
- Point to alternatives (Export to PDF/HTML/Markdown)

### In-App Messaging

- Warning when revealing Skeleton Key
- Clear labeling on device pairing flow
- Alternatives prominently displayed

---

## UX Improvements

### Skeleton Key Section (Settings > Account)

```
┌─────────────────────────────────────────────────────────────┐
│  Skeleton Key                                               │
│                                                             │
│  Your 24-word recovery phrase. Treat this like a master     │
│  password - anyone with access can decrypt your entire      │
│  vault.                                                     │
│                                                             │
│                                        [Reveal Key]         │
└─────────────────────────────────────────────────────────────┘
```

### When Revealed

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ FULL ACCESS WARNING                                     │
│                                                             │
│  Anyone with this key can access ALL your documents         │
│  across all devices. Only share with people you trust       │
│  completely.                                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  1. word    2. word    3. word    4. word    5. word       │
│  6. word    7. word    8. word    9. word   10. word       │
│  ...                                                        │
└─────────────────────────────────────────────────────────────┘

[Copy to Clipboard]  [Hide Key]

Instead of sharing your Skeleton Key, consider:
• Export specific documents (Settings > Data > Export)
```

---

## Deliverables

### Documentation

- [ ] User guide: Sharing Your Vault
- [ ] User guide: Exporting Your Data
- [ ] User guide: Importing from Other Apps

### In-App Changes

- [ ] Update Skeleton Key reveal warning
- [ ] Add export suggestion when key is revealed
- [ ] Review device pairing copy

---

## Files to Modify

| File | Changes |
|------|---------|
| `docs/user/guides/sharing-vault.md` | New user guide |
| `docs/user/guides/exporting-data.md` | New user guide |
| `docs/user/guides/importing-data.md` | New user guide |
| `src/components/settings/panels/AccountSettings.tsx` | Update Skeleton Key section |

---

## Effort Summary

| Component | Effort |
|-----------|--------|
| User documentation (3 guides) | 1-2 days |
| In-app messaging updates | 0.5 day |
| UX review and polish | 0.5 day |
| **Total** | **2-3 days** |
