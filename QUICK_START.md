# ⚡ Quick Start Guide - Koperasi Desa

Panduan cepat untuk menjalankan aplikasi dalam 10 menit.

## 🚀 Prerequisites
- Node.js 18+
- Akun Cloudflare (gratis)

## 📋 Langkah Cepat

### 1. Clone & Install
```bash
git clone https://github.com/bagusjimi/koperasi.git
cd koperasi
npm run install:all
```

### 2. Setup Cloudflare
```bash
npm install -g wrangler
wrangler login
```

### 3. Setup Database
```bash
cd database
wrangler d1 create koperasi-db
# Copy database_id ke wrangler.toml
wrangler d1 migrations apply koperasi-db
wrangler d1 execute koperasi-db --file=./seeds/initial-data.sql
```

### 4. Deploy Backend
```bash
cd ../backend
# Edit wrangler.toml: ganti database_id dan JWT_SECRET
wrangler deploy
# Catat URL backend
```

### 5. Deploy Frontend
```bash
cd ../frontend
# Buat .env.local dengan NEXT_PUBLIC_API_URL=<backend-url>
npm run build
npx @cloudflare/next-on-pages
wrangler pages deploy out --project-name koperasi
```

### 6. Login
- Buka URL Pages yang diberikan
- Login: `admin` / `admin123`

## ✅ Done!
Aplikasi sudah berjalan di Cloudflare dengan biaya GRATIS! 🎉

Untuk panduan lengkap, lihat [INSTALLATION.md](./INSTALLATION.md)
