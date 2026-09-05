# Quire 0.3.0 — A local writing room for macOS and Windows

Quire is a free, open-source, local-first workspace for writing and compiling LaTeX. Your projects, PDFs, and builds stay on your computer—there is no account, cloud workspace, remote compiler, analytics, or paid tier.

## What’s new in 0.3.0

- **Windows is here** — Quire now has a standard 64-bit Windows installer alongside Apple Silicon and Intel Mac builds.
- **Local compiler guidance on Windows** — Quire detects whether `latexmk` is available. If it is missing, it keeps the editor ready to use and points you to MiKTeX or TeX Live for local PDF compilation.
- **One download page for every platform** — The website now directs users to the Releases page, where they can choose the installer for their computer.
- **Same local-first promise** — Projects remain normal folders of files on your computer, and compilation stays local.

## Download

- **Apple Silicon** (M1, M2, M3, M4, and newer): `Quire-0.3.0-arm64.dmg`
- **Intel Mac**: `Quire-0.3.0-x64.dmg`
- **Windows 10 / 11 (64-bit)**: `Quire-0.3.0-x64.exe`

## Install Quire on macOS

1. Open the downloaded DMG.
2. Drag **Quire.app** into the **Applications** folder.
3. Open Quire from Applications.

### Install Quire on Windows

1. Download `Quire-0.3.0-x64.exe`.
2. Open the installer and follow its steps.
3. Launch Quire from the Start menu or desktop shortcut.
4. To compile PDFs, install [MiKTeX](https://miktex.org/download) or TeX Live if it is not already installed.

### First-launch notes

Quire is an independent, free, open-source preview and is not yet code-signed.

- **macOS:** macOS may block the first launch because it cannot yet verify the developer. Open Quire once, then choose **System Settings → Privacy & Security → Open Anyway**. Confirm the next prompt. You only need to do this once.
- **Windows:** Microsoft Defender SmartScreen may say that the app is not commonly recognized. Download only from this GitHub Release, then choose **More info → Run anyway** if you are comfortable continuing.

## Privacy and support

Quire works locally on your computer. Quire Draft is off until you configure your own provider API key and deliberately send it selected text or a writing brief. Read the privacy policy at https://quire-app.vercel.app/privacy.

Support: alibourak.work@gmail.com

## Source code

https://github.com/aliiexe/Quire
