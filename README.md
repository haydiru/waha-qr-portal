# WAHA Sentinel Gateway 🛡️

> **Dedicated Session Scanner & Status Portal for WAHA (WhatsApp HTTP API)**  
> Built for secure enterprise pairing without exposing administrative dashboards, API keys, or chat histories.

[![Node.js](https://img.shields.io/badge/Node.js-20_LTS-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Alpine-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Coolify](https://img.shields.io/badge/Deploy-Coolify-6B21A8?logo=coolify&logoColor=white)](https://coolify.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![GSAP](https://img.shields.io/badge/Motion-GSAP_3.12-88CE02?logo=greensock&logoColor=white)](https://gsap.com/)

---

## 1. Overview & Problem Solved

Saat menggunakan **WAHA (WhatsApp HTTP API)** dalam ekosistem otomatisasi (misalnya n8n, CRM, atau bot operasional), menghubungkan nomor WhatsApp sering kali membutuhkan akses langsung ke Swagger UI atau dashboard admin WAHA. Hal ini berisiko fatal:
- ❌ **Kebocoran Kredensial:** Operator lapangan dapat melihat token API master WAHA.
- ❌ **Resiko Privasi & Destruktif:** Operator dapat membaca riwayat obrolan pelanggan, menghapus sesi, atau menghentikan container.
- ❌ **Salah Akun / Session Overwrite:** Operator secara tidak sengaja dapat memasangkan akun WhatsApp pribadi ke sesi bisnis perusahaan.

**WAHA Sentinel Gateway** memecahkan masalah ini dengan menyediakan portal web satu halaman yang sangat aman, ringan (*<35MB RAM*), dan berorientasi operasional. Portal ini hanya menampilkan proses pairing QR code dan status koneksi langsung dari nomor yang diotorisasi, dengan memblokir total semua aksi administratif dan memverifikasi nomor telepon.

---

## 2. Fitur Utama & Keamanan (Zero-Leakage Security)

- **Zero Client-Side Token Exposure:** Token API WAHA tidak pernah dikirim ke browser client. Semua komunikasi dijembatani oleh server proxy Node.js internal.
- **Dual-Layer Perimeter Access Control:**
  1. *Cryptographic URL Token:* Akses URL hanya diizinkan dengan token parameter rahasia (`?auth=SEC_...`).
  2. *6-Digit Master PIN Lock:* Input segmented PIN dengan proteksi *brute-force rate limiter* (kunci 60 detik jika salah 5 kali).
- **Anti-Tamper & Permanent Binding:**
  - Saat sesi berstatus `WORKING`, tombol logout/disconnect sengaja ditiadakan di sisi client untuk mencegah putusnya alur otomatisasi n8n/bot.
- **Phone Number Whitelist Guard:**
  - Fitur opsional `ALLOWED_PHONE_NUMBER`. Jika nomor yang di-scan tidak ada dalam daftar whitelist, gateway secara otomatis memicu pemutusan sesi (*instant auto-logout*) pada WAHA detik itu juga.
- **Daylight Forensic Design System:**
  - Mengusung estetika ala Linear & Raycast (*Daylight Alabaster* `#FAF9F5`, border presisi 1px zinc, tipografi JetBrains Mono).
  - Animasi transisi mekanis halus berbasis **GSAP 3.12+** (*Radar sweep*, *SVG countdown ring 20s*, *tactile error shake*, dan *morphing shield*).

---

## 3. Environment Variables

| Variable | Default | Deskripsi |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port listening HTTP server |
| `NODE_ENV` | `production` | Lingkungan aplikasi (`production` / `development`) |
| `WAHA_BASE_URL` | `http://waha:3000` | Alamat internal WAHA di jaringan Docker Coolify |
| `WAHA_API_KEY` | *(kosong)* | API Key WAHA (jika diaktifkan pada WAHA) |
| `WAHA_SESSION` | `default` | Nama target sesi WAHA yang dikunci pada gateway ini |
| `MASTER_PIN` | `123456` | 6-digit Master PIN untuk membuka terminal scan |
| `SECRET_AUTH_TOKEN` | `SEC_9f4b29a17c...` | Token acak untuk proteksi URL (`?auth=...`) |
| `ALLOWED_PHONE_NUMBER` | *(kosong)* | Whitelist nomor telepon (format angka, pisahkan dengan koma, contoh: `628118899201`) |
| `SESSION_SECRET` | *(random 32 hex)* | Kunci rahasia untuk tanda tangan cookie session |

---

## 4. Cara Deploy di Coolify (Step-by-Step)

Aplikasi ini telah dioptimalkan secara native untuk containerization di **Coolify**:

### Langkah 1: Hubungkan Repositori GitHub
1. Buka dashboard Coolify Anda.
2. Masuk ke Project / Environment yang sesuai.
3. Klik **+ Add Resource** &rarr; **Public Repository** (atau **Private Repository** jika repo privat).
4. Masukkan URL repositori GitHub:
   ```
   https://github.com/haydiru/waha-qr-portal
   ```
5. Pilih branch `main`.

### Langkah 2: Konfigurasi Build Pack
- Coolify akan mendeteksi `Dockerfile` secara otomatis (**Build Pack: Dockerfile**).
- Port yang diexpose: `3000`.

### Langkah 3: Konfigurasi Environment Variables di Coolify
Pada tab **Environment Variables** di Coolify, masukkan nilai konfigurasi berikut:

```env
NODE_ENV=production
PORT=3000
WAHA_BASE_URL=http://waha:3000
WAHA_API_KEY=your_actual_waha_api_key
WAHA_SESSION=default
MASTER_PIN=123456
SECRET_AUTH_TOKEN=SEC_9f4b29a17c0e8281d4e38c92a11b058a
ALLOWED_PHONE_NUMBER=628118899201
SESSION_SECRET=c28f09d8e7b1a23c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c
```

> 💡 **Penting mengenai Jaringan Coolify:**  
> Pastikan container `waha-sentinel` dan container `waha` berada di dalam jaringan Docker yang sama (biasanya default `coolify`). Dengan demikian, `WAHA_BASE_URL=http://waha:3000` dapat diakses langsung melalui DNS internal Docker tanpa membuka port WAHA ke internet publik.

### Langkah 4: Tentukan Domain & SSL
- Di Coolify, tambahkan domain / subdomain tujuan (misalnya `https://waha-scan.domainanda.com`).
- Coolify (Traefik) akan menerbitkan sertifikat Let's Encrypt SSL secara otomatis.

### Langkah 5: Deploy
- Klik **Deploy**.
- Dalam ~30 detik, portal sudah aktif dan siap digunakan!
- Bagikan link ber-token ke operator:
  ```
  https://waha-scan.domainanda.com/?auth=SEC_9f4b29a17c0e8281d4e38c92a11b058a
  ```

---

## 5. Menjalankan Secara Lokal (Development)

```bash
# 1. Clone repositori
git clone https://github.com/haydiru/waha-qr-portal.git
cd waha-qr-portal

# 2. Salin template env
cp .env.example .env

# 3. Install dependensi
npm install

# 4. Jalankan server lokal
npm start
# atau dengan auto-reload:
npm run dev
```

Akses portal di:
`http://localhost:3000/?auth=SEC_9f4b29a17c0e8281d4e38c92a11b058a`

---

## 6. Arsitektur REST API Proxy

- `GET /api/health` — Telemetri kesehatan container untuk healthcheck Coolify.
- `POST /api/auth/verify` — Memverifikasi PIN & URL token, menerbitkan HttpOnly session cookie.
- `GET /api/session/status` — Polling status WAHA, menyajikan QR code Base64, dan memvalidasi whitelist nomor.
- `POST /api/session/start` — Memicu inisialisasi sesi WAHA yang sedang berstatus `STOPPED`.
- `POST /api/session/refresh-qr` — Memaksa refresh QR matrix dari WAHA.

---

## License
MIT © [haydiru](https://github.com/haydiru)
