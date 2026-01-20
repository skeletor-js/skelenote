# Linux Distribution Strategy

**Date:** January 18, 2026
**Status:** DRAFT
**Owner:** Product Engineering

## Executive Summary

To reduce installation friction for the text-heavy Skelenote user base and signal product maturity, we will expand beyond raw binary downloads to targeted App Store distribution. We recommend prioritizing **Flathub (Flatpak)** and **Snap Store (Snap)** as primary channels, while optimizing **.deb** and **.rpm** generation for power users.

---

## 1. The "Big Two" App Stores

Getting into these stores turns the installation process from a CLI chore into a familiar "App Store" experience.

### A. Flathub (Flatpak) - *Primary Recommendation*

Flathub is the gold standard for cross-distribution compatibility. It ensures verifying the application works identically on Fedora, Debian, Arch, and importantly, the **Steam Deck**.

* **Reach:** Fedora Silverblue, Steam Deck, Endless OS, Linux Mint.
* **Technical Implementation:**
    1. Create a `com.skeletorjs.skelenote.yml` manifest file.
    2. Define permissions (network access for Cloud/P2P, file system access for local vaults).
    3. Fork the `flathub/flathub` repository on GitHub.
    4. Submit a Pull Request with the manifest.
* **User Experience:**

    ```bash
    flatpak install flathub com.skeletorjs.skelenote
    ```

### B. Snap Store (Ubuntu/Canonical)

Snap is essential for visibility in the default Ubuntu Software Center, which serves the largest slice of the desktop Linux market.

* **Reach:** Ubuntu, Manjaro, Zorin OS.
* **Technical Implementation:**
    1. Create a developer account at [snapcraft.io](https://snapcraft.io).
    2. Define `snapcraft.yaml` in the repository root.
    3. Configure `confinement: strict` (preferred) or `classic` (if broad file system access is needed beyond standard portals).
    4. CI/CD Integration:

        ```bash
        snapcraft login
        snapcraft install
        snapcraft upload --release=stable skelenote_0.1.0_amd64.snap
        ```

---

## 2. Native Package Managers

Power users and sysadmins often prefer native package management for system integration and "pure" dependency handling.

### A. Debian/Ubuntu (`.deb`)

* **Status:** Already supported by Tauri build pipeline.
* **Action:** Ensure `tarui.conf.json` explicitly targets `deb` in `bundle > targets`.
* **Distribution:** Upload as an asset to GitHub Releases. Users install via `dpkg -i` or `apt install ./file.deb`.

### B. Fedora/RHEL (`.rpm`)

* **Status:** Supported by Tauri.
* **Action:** Ensure `rpm` is in `bundle > targets`.
* **Distribution:** Upload to GitHub Releases. Users install via `dnf install ./file.rpm`.

### C. Arch Linux (AUR)

Arch users expect an AUR package. This does not store the binary but a recipe to fetch it.

1. **Recipe:** Create a `PKGBUILD` that pulls the `.deb` or `.AppImage` from GitHub Releases.
2. **Publish:** Push to `aur.archlinux.org/skelenote-bin.git`.
3. **Result:** `yay -S skelenote-bin`.

---

## 3. Implementation Plan

1. **Action:** configure `tauri.conf.json` to output `deb`, `rpm`, and `appimage` for every release tag.
2. **Action:** Create `snapcraft.yaml` and test local snap build.
3. **Action:** Create Flatpak manifest and test in a clean container.
4. **Docs:** Update `docs/user/getting-started.md` to list App Store links first, reducing the prominence of the CLI-based AppImage implementation.
