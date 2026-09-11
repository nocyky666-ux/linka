# LINKA v2 — Production Decentralized & Hybrid P2P Communication

<div align="center">

**Offline-First · Mesh Routing · Real REST API & SQLite · Zero-Telemetry**

[![CI](https://github.com/linka-app/linka/actions/workflows/ci.yml/badge.svg)](https://github.com/linka-app/linka/actions/workflows/ci.yml)
[![Build Android](https://github.com/linka-app/linka/actions/workflows/build-android.yml/badge.svg)](https://github.com/linka-app/linka/actions/workflows/build-android.yml)

</div>

---

## 🏗️ Arsitektur Sistem

LINKA dibangun dengan model **Hybrid Offline-First & Decentralized Mesh**:
1. **Frontend**: HTML5 + Vanilla JS + CSS3 Liquid Glassmorphism (Tanpa bundler / framework berat).
2. **Backend**: Node.js REST API Server terintegrasi (`server/index.js`), melayani Static PWA dan Endpoints.
3. **Database**: SQLite terintegrasi (`data/linka.db`) dengan schema persisten untuk user, pesan, kontak, dan postingan.
4. **Keamanan & Autentikasi**:
   - Password hashing PBKDF2 dengan SHA-512 + Salt.
   - JWT Session Tokens mandiri berbasis Node.js native crypto.
   - End-to-End Encryption payload X25519 / ChaCha20 / AES-GCM.
5. **Decentralized Mesh & P2P**:
   - Multi-Hop bridge packet routing (`A -> B -> C -> D`).
   - WSS MQTT Relay (`wss://broker.emqx.io:8084/mqtt`) + Local LAN/Tab `BroadcastChannel`.
   - WebRTC Audio & Video Calls nyata dengan `MediaRecorder` voice notes.
   - 7-Digit Sequential User ID (`0000001`, `0000002`, ...).

---

## 🚀 Setup & Menjalankan Lokal dari Nol

### 1. Prasyarat
- Node.js >= 18.0.0 (disarankan Node 20+)
- npm >= 9.0.0

### 2. Instalasi
```bash
git clone https://github.com/nocyky666-ux/linka.git
cd linka
npm install
```

### 3. Konfigurasi Environment
Salin template konfigurasi:
```bash
cp .env.example .env
```
Isi variabel di `.env`:
```env
PORT=3000
NODE_ENV=production
JWT_SECRET=linka_super_secret_jwt_key_mesh_production_2026_x992
DATABASE_PATH=./data/linka.db
CORS_ORIGIN=*
RATE_LIMIT_MAX=120
RATE_LIMIT_WINDOW_MS=60000
UPLOAD_DIR=./uploads
```

### 4. Menjalankan Server & App
```bash
npm start
# atau untuk development:
npm run dev
```
Buka browser di `http://localhost:3000`.

### 5. Menjalankan Pengujian Otomatis
```bash
npm test
```

---

## 📱 Build APK Android

```bash
# Persiapkan assets www dan sync Capacitor
mkdir -p www && cp -r index.html manifest.json sw.js assets branding.json www/
npx cap sync android

# Buka Android Studio atau build langsung
npx cap open android
```

---

## 🌐 Panduan Deployment Production

### Backend & Database (Node.js + SQLite / PostgreSQL)
1. **Railway / Render / Fly.io / VPS**:
   - Masukkan repo GitHub.
   - Start Command: `npm start`
   - Set persistent storage volume pada folder `/data` dan `/uploads`.
   - Tambahkan Environment Variables sesuai `.env.example`.

### Frontend PWA (Vercel / Netlify / Cloudflare Pages)
- Jika ingin men-deploy frontend terpisah secara static, arahkan static publish directory ke root `/` atau `www/`.

---

## 🔒 Fitur Keamanan

- Proteksi XSS melalui template escaping `escapeHtml()`.
- Validasi unik username dan ID sekuensial.
- Rate limiting 120 req/menit per IP untuk mencegah brute-force.
- File upload sanitization dengan batasan ukuran payload.

---

## 📄 Lisensi
MIT © LINKA Team 2026
