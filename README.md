# LINKA v2 — Connected Without Limits

<div align="center">

**Offline · Private · Borderless**

[![CI](https://github.com/linka-app/linka/actions/workflows/ci.yml/badge.svg)](https://github.com/linka-app/linka/actions/workflows/ci.yml)
[![Build Android](https://github.com/linka-app/linka/actions/workflows/build-android.yml/badge.svg)](https://github.com/linka-app/linka/actions/workflows/build-android.yml)

</div>

---

## Tech Stack

| Layer    | Teknologi |
|----------|-----------|
| UI       | HTML5 + CSS3 + Vanilla JS (no framework) |
| Font Teks | `800.ttf` — default, bisa diganti user |
| Font Emoji | `iOS18_4.ttf` (Apple Color Emoji iOS 18.4) — **terkunci** |
| PWA      | Service Worker + Web App Manifest |
| Mobile   | Capacitor 5 (Android APK + iOS IPA) |
| Build CI | GitHub Actions |

---

## Fitur Utama

- **Glassmorphism + Fluid Background** — blob animated background, scan lines, noise overlay
- **Bottom Nav Liquid Glass** — indikator posisi JS-driven dengan animasi easing custom
- **5 Tema Background** — Blue/Purple, Cyber, Warm, Emerald, Rose (blob color berubah)
- **Font sistem dua lapis** — teks pakai `LINKA800`, emoji pakai `AppleEmoji iOS 18.4`
- **SVG inline** untuk semua ikon UI (bukan emoji, bukan icon font)
- **Emoji di chat** — hanya di sini pakai font `AppleEmoji` (tidak bisa diubah)
- **Splash screen** dengan ring animation + placeholder untuk animasi custom (Lottie/video)
- **Onboarding 4 step** dengan ilustrasi SVG animasi
- **5 Screen** — Obrolan, Kontak, Jaringan, Pengaturan, Profil
- **Mesh Canvas** — visualisasi node real-time dengan animasi particle

---

## Struktur Folder

```
linka-v2/
├── index.html                  ← App utama (PWA)
├── manifest.json               ← PWA manifest
├── sw.js                       ← Service Worker (offline)
├── capacitor.config.json       ← Config Capacitor (APK/iOS)
├── package.json
├── branding.json               ← Token brand & config
├── SPLASH_ANIMATION_GUIDE.md  ← Panduan animasi splash
│
├── assets/
│   ├── logo/
│   │   └── logo.png            ← Icon app (1024×1024)
│   ├── fonts/
│   │   ├── 800.ttf             ← Font teks default (bisa diganti)
│   │   └── iOS18_4.ttf         ← Font emoji iOS 18.4 (terkunci)
│
├── android/
│   ├── build.gradle            ← Project-level Gradle
│   ├── settings.gradle
│   ├── gradle.properties
│   └── app/
│       ├── build.gradle        ← App-level Gradle
│       ├── proguard-rules.pro
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/app/linka/connect/
│           │   └── MainActivity.java
│           └── res/
│               ├── values/     ← strings, colors, styles
│               ├── xml/        ← file_paths, backup_rules
│               ├── mipmap-*/   ← Semua ukuran icon launcher
│               └── drawable*/  ← Splash screens semua density
│
└── .github/workflows/
    ├── ci.yml                  ← Lint & validate
    └── build-android.yml       ← APK + AAB + PWA deploy
```

---

## Font System

```
┌─────────────────────────────────────────────┐
│  TEKS UMUM (heading, body, UI)              │
│  └── LINKA800 (800.ttf)  ← bisa diganti    │
│                                              │
│  EMOJI DI CHAT BUBBLES                       │
│  └── AppleEmoji (iOS18_4.ttf) ← TERKUNCI   │
│      Tidak bisa diubah oleh user            │
└─────────────────────────────────────────────┘
```

Untuk mengganti font teks, ubah `@font-face` di `index.html`:
```css
@font-face {
  font-family: 'LINKA800';
  src: url('assets/fonts/FONT_BARU.ttf') format('truetype');
}
```

---

## Quick Start

```bash
# Clone
git clone https://github.com/linka-app/linka.git
cd linka

# Install deps
npm install

# Dev server (browser)
npm run dev
# → http://localhost:3000

# Android APK
npm install -g @capacitor/cli
npx cap add android
npx cap sync android
npx cap open android
# Lalu: Build > Generate Signed APK
```

---

## GitHub Actions Setup

### Secrets yang dibutuhkan (untuk release build)

| Secret | Keterangan |
|--------|-----------|
| `KEYSTORE_BASE64` | Keystore Android (base64) |
| `KEYSTORE_STORE_PASSWORD` | Password keystore |
| `KEYSTORE_ALIAS` | Alias key |
| `KEYSTORE_KEY_PASSWORD` | Password key |

### Generate keystore:
```bash
keytool -genkey -v -keystore linka.keystore \
  -alias linka -keyalg RSA -keysize 2048 \
  -validity 10000

# Encode ke base64:
base64 -w 0 linka.keystore
```

### Trigger build:
| Event | Action |
|-------|--------|
| Push ke `main` | CI + PWA deploy ke GitHub Pages |
| Tag `v*.*.*` | Full build + GitHub Release |
| Manual dispatch | Build on demand |

---

---


## Security

- X25519 key exchange
- Ed25519 digital signatures  
- ChaCha20-Poly1305 encryption
- Forward secrecy
- Zero telemetry / no cloud server

---

## License

MIT © LINKA Team 2026
