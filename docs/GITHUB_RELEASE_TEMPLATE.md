# Quire 0.2.4 — Startup reliability patch

Quire is a free, open-source, local-first workspace for writing and compiling LaTeX on your Mac. Your projects, PDFs, and builds stay on your computer—there is no account, cloud workspace, remote compiler, analytics, or paid tier.

## Fixed in 0.2.4

- **Reliable startup** — Fixed a regression in 0.2.3 that could show “The bundled Quire server did not start” immediately after opening the app.
- **One Quire, no stray Dock app** — The local workspace server now runs through Electron’s non-Dock helper executable, so Quire launches normally without a second `exec` app beside it.

## Download

- **Apple Silicon** (M1, M2, M3, M4, and newer): download `Quire-0.2.4-arm64.dmg`.
- **Intel Mac**: download `Quire-0.2.4-x64.dmg`.

## Install Quire

1. Open the downloaded DMG.
2. Drag **Quire.app** into the **Applications** folder.
3. Open Quire from Applications.

### First-launch note

Quire is an independent, free, open-source macOS preview and is not yet Apple-notarized. macOS may block the first launch because it cannot yet verify the developer.

If that happens, try opening Quire once, then open **System Settings → Privacy & Security** and choose **Open Anyway** for Quire. Confirm the next prompt. You only need to do this once.

## Privacy and support

Quire works locally on your Mac. Quire Draft is off until you configure your own provider API key and deliberately send it selected text or a writing brief. Read the privacy policy at https://quire-app.vercel.app/privacy.

Support: alibourak.work@gmail.com

## Source code

https://github.com/aliiexe/Quire
